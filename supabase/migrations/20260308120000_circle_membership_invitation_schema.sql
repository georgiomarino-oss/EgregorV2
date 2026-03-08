create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'circle_membership_role'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.circle_membership_role as enum ('owner', 'steward', 'member');
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'circle_membership_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.circle_membership_status as enum ('pending', 'active', 'removed');
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'circle_invitation_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.circle_invitation_status as enum (
      'pending',
      'accepted',
      'declined',
      'revoked',
      'expired'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'circle_invitation_channel'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.circle_invitation_channel as enum ('in_app', 'link', 'email', 'sms');
  end if;
end
$$;

alter table public.circles
  add column if not exists slug text,
  add column if not exists visibility text not null default 'private',
  add column if not exists primary_timezone text,
  add column if not exists default_room_policy text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'circles_visibility_check'
      and conrelid = 'public.circles'::regclass
  ) then
    alter table public.circles
      add constraint circles_visibility_check
      check (visibility in ('private', 'discoverable', 'public'));
  end if;
end
$$;

create unique index if not exists circles_slug_unique_idx
on public.circles(lower(slug))
where slug is not null;

alter table public.circle_members
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists role public.circle_membership_role not null default 'member',
  add column if not exists status public.circle_membership_status not null default 'active',
  add column if not exists source_invitation_id uuid,
  add column if not exists left_at timestamptz,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.circle_members
set id = gen_random_uuid()
where id is null;

alter table public.circle_members
  alter column id set not null;

create unique index if not exists circle_members_id_unique_idx
on public.circle_members(id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'circle_members_left_at_required_when_removed'
      and conrelid = 'public.circle_members'::regclass
  ) then
    alter table public.circle_members
      add constraint circle_members_left_at_required_when_removed
      check (
        status <> 'removed'::public.circle_membership_status
        or left_at is not null
      );
  end if;
end
$$;

update public.circle_members
set role = 'owner'::public.circle_membership_role
from public.circles c
where c.id = circle_members.circle_id
  and c.created_by = circle_members.user_id;

insert into public.circle_members (
  circle_id,
  user_id,
  joined_at,
  role,
  status,
  left_at
)
select
  c.id,
  c.created_by,
  c.created_at,
  'owner'::public.circle_membership_role,
  'active'::public.circle_membership_status,
  null
from public.circles c
where not exists (
  select 1
  from public.circle_members cm
  where cm.circle_id = c.id
    and cm.user_id = c.created_by
)
on conflict (circle_id, user_id) do update
set role = 'owner'::public.circle_membership_role,
    status = 'active'::public.circle_membership_status,
    left_at = null,
    updated_at = timezone('utc', now());

create index if not exists circle_members_circle_status_idx
on public.circle_members(circle_id, status, joined_at desc);

create index if not exists circle_members_user_status_idx
on public.circle_members(user_id, status, joined_at desc);

drop trigger if exists circle_members_set_updated_at on public.circle_members;
create trigger circle_members_set_updated_at
before update on public.circle_members
for each row
execute function public.handle_updated_at();

create table if not exists public.circle_invitations (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  target_contact_hash text,
  target_contact_label text,
  invite_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  channel public.circle_invitation_channel not null default 'in_app',
  status public.circle_invitation_status not null default 'pending',
  role_to_grant public.circle_membership_role not null default 'member',
  status_reason text,
  expires_at timestamptz not null default timezone('utc', now()) + interval '7 days',
  responded_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  revoked_at timestamptz,
  expired_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint circle_invitations_target_required check (
    target_user_id is not null
    or target_contact_hash is not null
  )
);

create index if not exists circle_invitations_target_user_pending_idx
on public.circle_invitations(target_user_id, status, expires_at desc, created_at desc)
where target_user_id is not null;

create index if not exists circle_invitations_circle_status_idx
on public.circle_invitations(circle_id, status, created_at desc);

create index if not exists circle_invitations_inviter_status_idx
on public.circle_invitations(inviter_user_id, status, created_at desc);

create unique index if not exists circle_invitations_one_pending_user_idx
on public.circle_invitations(circle_id, target_user_id)
where status = 'pending'::public.circle_invitation_status
  and target_user_id is not null;

create unique index if not exists circle_invitations_one_pending_contact_idx
on public.circle_invitations(circle_id, target_contact_hash)
where status = 'pending'::public.circle_invitation_status
  and target_user_id is null
  and target_contact_hash is not null;

create table if not exists public.circle_invitation_events (
  id bigint generated by default as identity primary key,
  invitation_id uuid not null references public.circle_invitations(id) on delete cascade,
  from_status public.circle_invitation_status,
  to_status public.circle_invitation_status not null,
  changed_by_user_id uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists circle_invitation_events_invitation_created_idx
on public.circle_invitation_events(invitation_id, created_at desc);

create index if not exists circle_invitation_events_actor_idx
on public.circle_invitation_events(changed_by_user_id, created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'circle_members_source_invitation_id_fkey'
      and conrelid = 'public.circle_members'::regclass
  ) then
    alter table public.circle_members
      add constraint circle_members_source_invitation_id_fkey
      foreign key (source_invitation_id)
      references public.circle_invitations(id)
      on delete set null;
  end if;
end
$$;

create or replace function public.normalize_external_contact(p_contact text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(lower(coalesce(p_contact, '')), '\s+', '', 'g'), '');
$$;

create or replace function public.hash_external_contact(p_contact text)
returns text
language sql
immutable
as $$
  select case
    when public.normalize_external_contact(p_contact) is null then null
    else encode(extensions.digest(public.normalize_external_contact(p_contact), 'sha256'), 'hex')
  end;
$$;

create or replace function public.mask_external_contact(p_contact text)
returns text
language plpgsql
immutable
as $$
declare
  v_contact text := coalesce(btrim(p_contact), '');
  v_local text;
  v_domain text;
begin
  if v_contact = '' then
    return null;
  end if;

  if position('@' in v_contact) > 1 then
    v_local := split_part(v_contact, '@', 1);
    v_domain := split_part(v_contact, '@', 2);
    if v_domain = '' then
      return left(v_contact, 2) || '***';
    end if;
    return left(v_local, 1) || '***@' || v_domain;
  end if;

  if length(v_contact) <= 4 then
    return left(v_contact, 1) || '***';
  end if;

  return left(v_contact, 2) || repeat('*', greatest(length(v_contact) - 4, 2)) || right(v_contact, 2);
end;
$$;

create or replace function public.circle_invitation_apply_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.invite_token is null or btrim(new.invite_token) = '' then
    new.invite_token := replace(gen_random_uuid()::text, '-', '');
  end if;

  if new.expires_at is null then
    new.expires_at := timezone('utc', now()) + interval '7 days';
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if old.status <> 'pending'::public.circle_invitation_status then
      raise exception 'Cannot transition invitation from % to %', old.status, new.status;
    end if;

    if new.status = 'accepted'::public.circle_invitation_status and new.accepted_at is null then
      new.accepted_at := timezone('utc', now());
    end if;

    if new.status = 'declined'::public.circle_invitation_status and new.declined_at is null then
      new.declined_at := timezone('utc', now());
    end if;

    if new.status = 'revoked'::public.circle_invitation_status and new.revoked_at is null then
      new.revoked_at := timezone('utc', now());
    end if;

    if new.status = 'expired'::public.circle_invitation_status and new.expired_at is null then
      new.expired_at := timezone('utc', now());
    end if;

    if new.status in (
      'accepted'::public.circle_invitation_status,
      'declined'::public.circle_invitation_status
    ) and new.responded_at is null then
      new.responded_at := timezone('utc', now());
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.circle_invitation_audit_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.circle_invitation_events (
      invitation_id,
      from_status,
      to_status,
      changed_by_user_id,
      reason
    )
    values (
      new.id,
      null,
      new.status,
      auth.uid(),
      new.status_reason
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.circle_invitation_events (
      invitation_id,
      from_status,
      to_status,
      changed_by_user_id,
      reason
    )
    values (
      new.id,
      old.status,
      new.status,
      auth.uid(),
      new.status_reason
    );
  end if;

  return new;
end;
$$;

drop trigger if exists circle_invitations_apply_status_transition on public.circle_invitations;
create trigger circle_invitations_apply_status_transition
before insert or update on public.circle_invitations
for each row
execute function public.circle_invitation_apply_status_transition();

drop trigger if exists circle_invitations_set_updated_at on public.circle_invitations;
create trigger circle_invitations_set_updated_at
before update on public.circle_invitations
for each row
execute function public.handle_updated_at();

drop trigger if exists circle_invitations_audit_transition on public.circle_invitations;
create trigger circle_invitations_audit_transition
after insert or update of status on public.circle_invitations
for each row
execute function public.circle_invitation_audit_transition();

create or replace function public.is_circle_active_member(
  p_circle_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.circle_members cm
    where cm.circle_id = p_circle_id
      and cm.user_id = coalesce(p_user_id, auth.uid())
      and cm.status = 'active'::public.circle_membership_status
  );
$$;

create or replace function public.is_circle_manager(
  p_circle_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.circle_members cm
    where cm.circle_id = p_circle_id
      and cm.user_id = coalesce(p_user_id, auth.uid())
      and cm.status = 'active'::public.circle_membership_status
      and cm.role in (
        'owner'::public.circle_membership_role,
        'steward'::public.circle_membership_role
      )
  );
$$;

create or replace function public.is_circle_owner(
  p_circle_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.circle_members cm
    where cm.circle_id = p_circle_id
      and cm.user_id = coalesce(p_user_id, auth.uid())
      and cm.status = 'active'::public.circle_membership_status
      and cm.role = 'owner'::public.circle_membership_role
  );
$$;

create or replace function public.circle_membership_role_rank(
  p_role public.circle_membership_role
)
returns integer
language sql
immutable
as $$
  select case p_role
    when 'owner'::public.circle_membership_role then 3
    when 'steward'::public.circle_membership_role then 2
    else 1
  end;
$$;
