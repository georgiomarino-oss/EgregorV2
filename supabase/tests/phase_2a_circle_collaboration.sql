-- Phase 2A collaboration foundation SQL integration test
-- Run against a migrated local/staging database as a privileged role.
-- Example:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase_2a_circle_collaboration.sql

begin;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'phase2a-owner@example.com',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'phase2a-invitee@example.com',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'phase2a-outsider@example.com',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  )
on conflict (id) do nothing;

insert into public.profiles (id, display_name)
values
  ('11111111-1111-4111-8111-111111111111', 'Phase2A Owner'),
  ('22222222-2222-4222-8222-222222222222', 'Phase2A Invitee'),
  ('33333333-3333-4333-8333-333333333333', 'Phase2A Outsider')
on conflict (id) do update
set display_name = excluded.display_name;

create temporary table _phase2a_ctx (
  key text primary key,
  value text not null
) on commit drop;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);

select public.ensure_personal_circle(
  'Phase2A Test Circle',
  'Canonical circle collaboration foundation test.'
);

insert into _phase2a_ctx (key, value)
select
  'circle_id',
  c.id::text
from public.circles c
where c.created_by = '11111111-1111-4111-8111-111111111111'
  and c.name = 'Phase2A Test Circle'
order by c.created_at desc
limit 1
on conflict (key) do update
set value = excluded.value;

do $$
declare
  v_circle_id uuid;
begin
  select value::uuid
  into v_circle_id
  from _phase2a_ctx
  where key = 'circle_id';

  if v_circle_id is null then
    raise exception 'Expected circle_id to be created.';
  end if;

  if not exists (
    select 1
    from public.circle_members cm
    where cm.circle_id = v_circle_id
      and cm.user_id = '11111111-1111-4111-8111-111111111111'
      and cm.role = 'owner'::public.circle_membership_role
      and cm.status = 'active'::public.circle_membership_status
  ) then
    raise exception 'Expected owner active membership row for creator.';
  end if;
end
$$;

insert into _phase2a_ctx (key, value)
select
  'invite_id',
  created.invitation_id::text
from public.create_circle_invite(
  (select value::uuid from _phase2a_ctx where key = 'circle_id'),
  '22222222-2222-4222-8222-222222222222',
  null,
  'in_app'::public.circle_invitation_channel,
  'member'::public.circle_membership_role,
  null
) as created
limit 1
on conflict (key) do update
set value = excluded.value;

do $$
begin
  if not exists (
    select 1
    from public.circle_invitations ci
    where ci.id = (select value::uuid from _phase2a_ctx where key = 'invite_id')
      and ci.status = 'pending'::public.circle_invitation_status
  ) then
    raise exception 'Expected pending invitation after create_circle_invite.';
  end if;
end
$$;

select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-4222-8222-222222222222',
  true
);

do $$
begin
  if not exists (
    select 1
    from public.list_pending_circle_invites() pending
    where pending.invitation_id = (select value::uuid from _phase2a_ctx where key = 'invite_id')
  ) then
    raise exception 'Expected invitee to see pending invitation.';
  end if;
end
$$;

select *
from public.accept_circle_invite(
  (select value::uuid from _phase2a_ctx where key = 'invite_id'),
  null
);

do $$
declare
  v_circle_id uuid;
begin
  select value::uuid
  into v_circle_id
  from _phase2a_ctx
  where key = 'circle_id';

  if not exists (
    select 1
    from public.circle_members cm
    where cm.circle_id = v_circle_id
      and cm.user_id = '22222222-2222-4222-8222-222222222222'
      and cm.status = 'active'::public.circle_membership_status
  ) then
    raise exception 'Expected invitee to become an active member after acceptance.';
  end if;

  if not exists (
    select 1
    from public.list_shared_with_me() shared
    where shared.circle_id = v_circle_id
  ) then
    raise exception 'Expected shared-with-me retrieval to include accepted circle.';
  end if;
end
$$;

select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-4333-8333-333333333333',
  true
);

do $$
declare
  v_circle_id uuid;
begin
  select value::uuid
  into v_circle_id
  from _phase2a_ctx
  where key = 'circle_id';

  if exists (
    select 1
    from public.circles c
    where c.id = v_circle_id
  ) then
    raise exception 'Expected outsider to be blocked by circle select RLS.';
  end if;

  if exists (select 1 from public.list_pending_circle_invites()) then
    raise exception 'Expected outsider to have no pending invites.';
  end if;
end
$$;

select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);

insert into _phase2a_ctx (key, value)
select
  'invite2_id',
  created.invitation_id::text
from public.create_circle_invite(
  (select value::uuid from _phase2a_ctx where key = 'circle_id'),
  '33333333-3333-4333-8333-333333333333',
  null,
  'in_app'::public.circle_invitation_channel,
  'member'::public.circle_membership_role,
  null
) as created
limit 1
on conflict (key) do update
set value = excluded.value;

select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-4333-8333-333333333333',
  true
);

do $$
begin
  begin
    perform public.revoke_circle_invite(
      (select value::uuid from _phase2a_ctx where key = 'invite2_id'),
      'unauthorized revoke attempt'
    );
    raise exception 'Expected outsider revoke to fail.';
  exception
    when others then
      if position('Only the inviter or a circle manager can revoke this invite' in sqlerrm) = 0 then
        raise;
      end if;
  end;
end
$$;

select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);

select public.update_circle_member_role(
  (select value::uuid from _phase2a_ctx where key = 'circle_id'),
  '22222222-2222-4222-8222-222222222222',
  'steward'::public.circle_membership_role
);

select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-4222-8222-222222222222',
  true
);

do $$
begin
  begin
    perform public.update_circle_member_role(
      (select value::uuid from _phase2a_ctx where key = 'circle_id'),
      '11111111-1111-4111-8111-111111111111',
      'member'::public.circle_membership_role
    );
    raise exception 'Expected steward role-boundary enforcement failure.';
  exception
    when others then
      if position('Stewards cannot modify owner or steward roles' in sqlerrm) = 0 then
        raise;
      end if;
  end;
end
$$;

do $$
begin
  if (
    select count(*)
    from public.circle_invitation_events cie
    where cie.invitation_id = (select value::uuid from _phase2a_ctx where key = 'invite_id')
  ) < 2 then
    raise exception 'Expected invitation lifecycle audit events for pending->accepted.';
  end if;
end
$$;

reset role;
rollback;
