-- Phase 2B invite token preview SQL integration test
-- Run against a migrated local/staging database as a privileged role.
-- Example:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase_2b_circle_invite_preview.sql

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
    '51111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'phase2b-owner@example.com',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  ),
  (
    '52222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'phase2b-invitee@example.com',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  ),
  (
    '53333333-3333-4333-8333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'phase2b-outsider@example.com',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  ),
  (
    '54444444-4444-4444-8444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'phase2b-decliner@example.com',
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
  ('51111111-1111-4111-8111-111111111111', 'Phase2B Owner'),
  ('52222222-2222-4222-8222-222222222222', 'Phase2B Invitee'),
  ('53333333-3333-4333-8333-333333333333', 'Phase2B Outsider'),
  ('54444444-4444-4444-8444-444444444444', 'Phase2B Decliner')
on conflict (id) do update
set display_name = excluded.display_name;

create temporary table _phase2b_ctx (
  key text primary key,
  value text not null
) on commit drop;

grant all on table _phase2b_ctx to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '51111111-1111-4111-8111-111111111111',
  true
);

select public.ensure_personal_circle(
  'Phase2B Preview Test Circle',
  'Invite token preview function test.'
);

insert into _phase2b_ctx (key, value)
select
  'circle_id',
  c.id::text
from public.circles c
where c.created_by = '51111111-1111-4111-8111-111111111111'
  and c.name = 'Phase2B Preview Test Circle'
order by c.created_at desc
limit 1
on conflict (key) do update
set value = excluded.value;

insert into _phase2b_ctx (key, value)
select
  'invite_targeted_pending_id',
  created.invitation_id::text
from public.create_circle_invite(
  (select value::uuid from _phase2b_ctx where key = 'circle_id'),
  '52222222-2222-4222-8222-222222222222',
  null,
  'in_app'::public.circle_invitation_channel,
  'member'::public.circle_membership_role,
  null
) as created
limit 1;

insert into _phase2b_ctx (key, value)
select
  'invite_link_pending_id',
  created.invitation_id::text
from public.create_circle_invite(
  (select value::uuid from _phase2b_ctx where key = 'circle_id'),
  null,
  'preview-link@example.com',
  'link'::public.circle_invitation_channel,
  'member'::public.circle_membership_role,
  null
) as created
limit 1;

insert into _phase2b_ctx (key, value)
select
  'invite_link_expired_id',
  created.invitation_id::text
from public.create_circle_invite(
  (select value::uuid from _phase2b_ctx where key = 'circle_id'),
  null,
  'expired-link@example.com',
  'link'::public.circle_invitation_channel,
  'member'::public.circle_membership_role,
  null
) as created
limit 1;

insert into _phase2b_ctx (key, value)
select
  'invite_targeted_declined_id',
  created.invitation_id::text
from public.create_circle_invite(
  (select value::uuid from _phase2b_ctx where key = 'circle_id'),
  '54444444-4444-4444-8444-444444444444',
  null,
  'in_app'::public.circle_invitation_channel,
  'member'::public.circle_membership_role,
  null
) as created
limit 1;

insert into _phase2b_ctx (key, value)
select
  'invite_targeted_revoked_id',
  created.invitation_id::text
from public.create_circle_invite(
  (select value::uuid from _phase2b_ctx where key = 'circle_id'),
  '53333333-3333-4333-8333-333333333333',
  null,
  'in_app'::public.circle_invitation_channel,
  'member'::public.circle_membership_role,
  null
) as created
limit 1;

insert into _phase2b_ctx (key, value)
select
  'invite_targeted_pending_token',
  ci.invite_token
from public.circle_invitations ci
where ci.id = (select value::uuid from _phase2b_ctx where key = 'invite_targeted_pending_id')
limit 1;

insert into _phase2b_ctx (key, value)
select
  'invite_link_pending_token',
  ci.invite_token
from public.circle_invitations ci
where ci.id = (select value::uuid from _phase2b_ctx where key = 'invite_link_pending_id')
limit 1;

insert into _phase2b_ctx (key, value)
select
  'invite_link_expired_token',
  ci.invite_token
from public.circle_invitations ci
where ci.id = (select value::uuid from _phase2b_ctx where key = 'invite_link_expired_id')
limit 1;

insert into _phase2b_ctx (key, value)
select
  'invite_targeted_declined_token',
  ci.invite_token
from public.circle_invitations ci
where ci.id = (select value::uuid from _phase2b_ctx where key = 'invite_targeted_declined_id')
limit 1;

insert into _phase2b_ctx (key, value)
select
  'invite_targeted_revoked_token',
  ci.invite_token
from public.circle_invitations ci
where ci.id = (select value::uuid from _phase2b_ctx where key = 'invite_targeted_revoked_id')
limit 1;

reset role;
update public.circle_invitations ci
set expires_at = timezone('utc', now()) - interval '5 minutes'
where ci.id = (select value::uuid from _phase2b_ctx where key = 'invite_link_expired_id')
  and ci.status = 'pending'::public.circle_invitation_status;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '51111111-1111-4111-8111-111111111111',
  true
);

select set_config(
  'request.jwt.claim.sub',
  '52222222-2222-4222-8222-222222222222',
  true
);

do $$
begin
  if not exists (
    select 1
    from public.get_circle_invite_preview_by_token(
      (select value from _phase2b_ctx where key = 'invite_targeted_pending_token')
    ) preview
    where preview.status = 'pending'
  ) then
    raise exception 'Expected invitee preview for targeted pending invite.';
  end if;
end
$$;

select *
from public.accept_circle_invite(
  (select value::uuid from _phase2b_ctx where key = 'invite_targeted_pending_id'),
  null
);

do $$
begin
  if not exists (
    select 1
    from public.get_circle_invite_preview_by_token(
      (select value from _phase2b_ctx where key = 'invite_targeted_pending_token')
    ) preview
    where preview.status = 'accepted'
  ) then
    raise exception 'Expected accepted status in preview after acceptance.';
  end if;
end
$$;

select set_config(
  'request.jwt.claim.sub',
  '54444444-4444-4444-8444-444444444444',
  true
);

select public.decline_circle_invite(
  (select value::uuid from _phase2b_ctx where key = 'invite_targeted_declined_id'),
  null,
  null
);

do $$
begin
  if not exists (
    select 1
    from public.get_circle_invite_preview_by_token(
      (select value from _phase2b_ctx where key = 'invite_targeted_declined_token')
    ) preview
    where preview.status = 'declined'
  ) then
    raise exception 'Expected declined status in preview after decline.';
  end if;
end
$$;

select set_config(
  'request.jwt.claim.sub',
  '51111111-1111-4111-8111-111111111111',
  true
);

select public.revoke_circle_invite(
  (select value::uuid from _phase2b_ctx where key = 'invite_targeted_revoked_id'),
  'phase2b revoke test'
);

select set_config(
  'request.jwt.claim.sub',
  '53333333-3333-4333-8333-333333333333',
  true
);

do $$
begin
  if not exists (
    select 1
    from public.get_circle_invite_preview_by_token(
      (select value from _phase2b_ctx where key = 'invite_targeted_revoked_token')
    ) preview
    where preview.status = 'revoked'
  ) then
    raise exception 'Expected revoked status in preview after revoke.';
  end if;
end
$$;

select set_config(
  'request.jwt.claim.sub',
  '52222222-2222-4222-8222-222222222222',
  true
);

do $$
begin
  if exists (
    select 1
    from public.get_circle_invite_preview_by_token(
      (select value from _phase2b_ctx where key = 'invite_targeted_revoked_token')
    )
  ) then
    raise exception 'Expected non-target member to be blocked from targeted invite preview.';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from public.get_circle_invite_preview_by_token(
      (select value from _phase2b_ctx where key = 'invite_link_pending_token')
    ) preview
    where preview.status = 'pending'
  ) then
    raise exception 'Expected outsider to preview link-based invite.';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from public.get_circle_invite_preview_by_token(
      (select value from _phase2b_ctx where key = 'invite_link_expired_token')
    ) preview
    where preview.status = 'expired'
  ) then
    raise exception 'Expected expired status for lazy-expired invite preview.';
  end if;
end
$$;

reset role;

do $$
begin
  if not exists (
    select 1
    from public.circle_invitations ci
    where ci.id = (select value::uuid from _phase2b_ctx where key = 'invite_link_expired_id')
      and ci.status = 'expired'::public.circle_invitation_status
  ) then
    raise exception 'Expected lazy-expired invite to persist status=expired.';
  end if;
end
$$;

rollback;
