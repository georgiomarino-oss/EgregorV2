-- Phase 5A notifications/trust/privacy/account-deletion foundation verification.
-- Run against a migrated local/staging database as a privileged role.
-- Example:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase_5a_foundation.sql

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
    '81111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'phase5a-owner@example.com',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  ),
  (
    '82222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'phase5a-peer@example.com',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  ),
  (
    '83333333-3333-4333-8333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'phase5a-outsider@example.com',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  ),
  (
    '85555555-5555-4555-8555-555555555555',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'phase5a-operator@example.com',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"],"role":"support"}'::jsonb,
    '{}'::jsonb,
    false
  )
on conflict (id) do nothing;

insert into public.profiles (
  id,
  display_name,
  timezone,
  username
)
values
  ('81111111-1111-4111-8111-111111111111', 'Phase5A Owner', 'Europe/London', 'phase5a_owner'),
  ('82222222-2222-4222-8222-222222222222', 'Phase5A Peer', 'Europe/London', 'phase5a_peer'),
  ('83333333-3333-4333-8333-333333333333', 'Phase5A Outsider', 'UTC', 'phase5a_outsider'),
  ('85555555-5555-4555-8555-555555555555', 'Phase5A Operator', 'UTC', 'phase5a_operator')
on conflict (id) do update
set
  display_name = excluded.display_name,
  timezone = excluded.timezone,
  username = excluded.username;

insert into public.circles (
  id,
  name,
  description,
  visibility,
  created_by
)
values (
  '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Phase5A Trust Circle',
  'Circle for trust/privacy/report tests.',
  'private',
  '81111111-1111-4111-8111-111111111111'
)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  visibility = excluded.visibility;

insert into public.circle_members (
  circle_id,
  user_id,
  role,
  status,
  joined_at,
  source_invitation_id,
  left_at
)
values
  (
    '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '81111111-1111-4111-8111-111111111111',
    'owner'::public.circle_membership_role,
    'active'::public.circle_membership_status,
    timezone('utc', now()),
    null,
    null
  ),
  (
    '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '82222222-2222-4222-8222-222222222222',
    'member'::public.circle_membership_role,
    'active'::public.circle_membership_status,
    timezone('utc', now()),
    null,
    null
  )
on conflict on constraint circle_members_pkey do update
set
  role = excluded.role,
  status = excluded.status,
  left_at = null,
  updated_at = timezone('utc', now());

insert into public.event_series (
  key,
  name,
  subtitle,
  description,
  category,
  purpose,
  schedule_type,
  timezone_policy,
  default_duration_minutes,
  join_window_start_minutes,
  join_window_end_minutes,
  visibility_scope,
  access_mode,
  circle_id,
  created_by,
  is_active
)
values (
  'phase5a-circle-room',
  'Phase 5A Circle Room',
  'Trust and privacy verification room',
  'Used to verify block/privacy room join behavior.',
  'Verification',
  'Test room privacy and block enforcement',
  'manual_trigger'::public.event_schedule_type,
  'utc'::public.event_timezone_policy,
  20,
  30,
  180,
  'circle'::public.event_visibility_scope,
  'circle_members'::public.event_access_mode,
  '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '81111111-1111-4111-8111-111111111111',
  true
)
on conflict (key) do update
set
  name = excluded.name,
  subtitle = excluded.subtitle,
  description = excluded.description,
  category = excluded.category,
  purpose = excluded.purpose,
  schedule_type = excluded.schedule_type,
  timezone_policy = excluded.timezone_policy,
  default_duration_minutes = excluded.default_duration_minutes,
  join_window_start_minutes = excluded.join_window_start_minutes,
  join_window_end_minutes = excluded.join_window_end_minutes,
  visibility_scope = excluded.visibility_scope,
  access_mode = excluded.access_mode,
  circle_id = excluded.circle_id,
  created_by = excluded.created_by,
  is_active = true,
  updated_at = timezone('utc', now());

create temporary table _phase5a_ctx (
  key text primary key,
  value text not null
) on commit drop;

grant all on table _phase5a_ctx to authenticated;

insert into _phase5a_ctx (key, value)
select
  'occurrence_id',
  public.admin_trigger_event_occurrence(
    p_series_key => 'phase5a-circle-room',
    p_starts_at_utc => timezone('utc', now()) + interval '15 minutes',
    p_duration_minutes => 20,
    p_display_timezone => 'UTC',
    p_metadata => jsonb_build_object('test_case', 'phase5a')
  )::text
on conflict (key) do update
set value = excluded.value;

insert into _phase5a_ctx (key, value)
select
  'room_id',
  public.ensure_occurrence_room_identity(
    (select value::uuid from _phase5a_ctx where key = 'occurrence_id')
  )::text
on conflict (key) do update
set value = excluded.value;

set local role authenticated;
select set_config('request.jwt.claim.sub', '81111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.app_metadata', '{"role":"member"}', true);

select *
from public.register_device_push_target(
  p_installation_id => 'phase5a-installation-owner',
  p_device_token => 'ExponentPushToken[phase5a-owner]',
  p_platform => 'ios',
  p_push_provider => 'expo',
  p_locale => 'en-GB',
  p_timezone => 'Europe/London',
  p_app_version => '1.0.0',
  p_build_number => '100',
  p_device_name => 'Phase5A Device',
  p_metadata => jsonb_build_object('test_case', 'phase5a')
);

select *
from public.update_notification_subscription(
  p_category => 'occurrence_reminder'::public.notification_category,
  p_target_type => 'event_occurrence'::public.notification_target_type,
  p_target_id => (select value::uuid from _phase5a_ctx where key = 'occurrence_id'),
  p_channel => 'push'::public.notification_channel,
  p_enabled => true,
  p_lead_minutes => 15
);

select *
from public.update_notification_subscription(
  p_category => 'occurrence_reminder'::public.notification_category,
  p_target_type => 'event_occurrence'::public.notification_target_type,
  p_target_id => (select value::uuid from _phase5a_ctx where key = 'occurrence_id'),
  p_channel => 'push'::public.notification_channel,
  p_enabled => true,
  p_lead_minutes => 30
);

do $$
begin
  if (
    select count(*)
    from public.notification_subscriptions ns
    where ns.user_id = '81111111-1111-4111-8111-111111111111'
      and ns.category = 'occurrence_reminder'::public.notification_category
      and ns.target_type = 'event_occurrence'::public.notification_target_type
      and ns.target_id = (select value::uuid from _phase5a_ctx where key = 'occurrence_id')
  ) <> 1 then
    raise exception 'Expected idempotent reminder subscription row for occurrence target.';
  end if;

  if not exists (
    select 1
    from public.notification_subscriptions ns
    where ns.user_id = '81111111-1111-4111-8111-111111111111'
      and ns.category = 'occurrence_reminder'::public.notification_category
      and ns.target_type = 'event_occurrence'::public.notification_target_type
      and ns.target_id = (select value::uuid from _phase5a_ctx where key = 'occurrence_id')
      and ns.lead_minutes = 30
      and ns.enabled = true
  ) then
    raise exception 'Expected reminder subscription to persist latest lead_minutes.';
  end if;

  if (
    select count(*)
    from public.event_reminder_preferences pref
    where pref.user_id = '81111111-1111-4111-8111-111111111111'
      and pref.target_type = 'occurrence'::public.event_reminder_target_type
      and pref.occurrence_id = (select value::uuid from _phase5a_ctx where key = 'occurrence_id')
  ) <> 1 then
    raise exception 'Expected canonical reminder preference upsert to remain idempotent.';
  end if;
end
$$;

select *
from public.update_my_privacy_settings(
  p_member_list_visibility => 'circles_only'::public.privacy_visibility,
  p_live_presence_visibility => 'hidden'::public.privacy_visibility,
  p_allow_direct_invites => false,
  p_allow_circle_invites => true
);

select *
from public.block_user(
  p_blocked_user_id => '82222222-2222-4222-8222-222222222222',
  p_reason => 'phase5a test block'
);

do $$
begin
  if not exists (
    select 1
    from public.list_my_blocks() b
    where b.blocked_user_id = '82222222-2222-4222-8222-222222222222'
  ) then
    raise exception 'Expected blocked user to appear in blocker list.';
  end if;
end
$$;

select *
from public.join_event_room(
  p_occurrence_id => (select value::uuid from _phase5a_ctx where key = 'occurrence_id')
);

do $$
begin
  begin
    perform *
    from public.create_circle_invite(
      p_circle_id => '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      p_target_user_id => '82222222-2222-4222-8222-222222222222'
    );
    raise exception 'Expected blocked target to be ineligible for new invite.';
  exception
    when others then
      if position('eligible' in lower(sqlerrm)) = 0
        and position('block' in lower(sqlerrm)) = 0
      then
        raise;
      end if;
  end;
end
$$;

select *
from public.submit_moderation_report(
  p_target_type => 'user'::public.moderation_target_type,
  p_target_id => '82222222-2222-4222-8222-222222222222',
  p_reason_code => 'harassment'::public.moderation_reason_code,
  p_details => 'Phase5A user report from owner.',
  p_evidence => jsonb_build_object('source', 'phase5a-sql-test'),
  p_support_route => 'https://egregor.world/support',
  p_support_metadata => jsonb_build_object('test_case', 'phase5a')
);

insert into _phase5a_ctx (key, value)
select
  'report_id',
  mr.id::text
from public.moderation_reports mr
where mr.reporter_user_id = '81111111-1111-4111-8111-111111111111'
order by mr.created_at desc
limit 1
on conflict (key) do update
set value = excluded.value;

select *
from public.create_account_deletion_request(
  p_reason => 'phase5a_in_app',
  p_details => 'Phase5A test deletion initiation',
  p_support_route => 'https://egregor.world/account-deletion',
  p_support_metadata => jsonb_build_object('test_case', 'phase5a')
);

select *
from public.create_account_deletion_request(
  p_reason => 'phase5a_repeat',
  p_details => 'Phase5A repeat deletion request should be idempotent'
);

do $$
begin
  if (
    select count(*)
    from public.account_deletion_requests adr
    where adr.user_id = '81111111-1111-4111-8111-111111111111'
      and adr.status in (
        'requested'::public.account_deletion_status,
        'acknowledged'::public.account_deletion_status,
        'in_review'::public.account_deletion_status
      )
  ) <> 1 then
    raise exception 'Expected one active account deletion request after repeated initiation.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = '81111111-1111-4111-8111-111111111111'
      and p.account_state = 'deletion_requested'::public.profile_account_state
  ) then
    raise exception 'Expected profile account_state to reflect deletion requested.';
  end if;

  if not exists (
    select 1
    from public.notification_device_targets ndt
    where ndt.user_id = '81111111-1111-4111-8111-111111111111'
      and ndt.disabled_at is not null
  ) then
    raise exception 'Expected active device targets to be disabled after deletion initiation.';
  end if;
end
$$;

select set_config('request.jwt.claim.sub', '82222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.app_metadata', '{"role":"member"}', true);

do $$
begin
  begin
    perform *
    from public.join_event_room(
      p_occurrence_id => (select value::uuid from _phase5a_ctx where key = 'occurrence_id')
    );
    raise exception 'Expected blocked member join to fail in restricted room.';
  exception
    when others then
      if position('privacy' in lower(sqlerrm)) = 0
        and position('block' in lower(sqlerrm)) = 0
      then
        raise;
      end if;
  end;
end
$$;

do $$
begin
  if exists (
    select 1
    from public.user_blocks ub
    where ub.blocker_user_id = '81111111-1111-4111-8111-111111111111'
  ) then
    raise exception 'Peer should not read another user''s block rows.';
  end if;

  if exists (
    select 1
    from public.notification_device_targets ndt
    where ndt.user_id = '81111111-1111-4111-8111-111111111111'
  ) then
    raise exception 'Peer should not read another user''s device targets.';
  end if;

  if exists (
    select 1
    from public.account_deletion_requests adr
    where adr.user_id = '81111111-1111-4111-8111-111111111111'
  ) then
    raise exception 'Peer should not read another user''s deletion requests.';
  end if;

  if exists (
    select 1
    from public.moderation_reports mr
    where mr.reporter_user_id = '81111111-1111-4111-8111-111111111111'
  ) then
    raise exception 'Peer should not read another user''s reports.';
  end if;
end
$$;

do $$
begin
  begin
    perform *
    from public.set_moderation_report_status(
      p_report_id => (select value::uuid from _phase5a_ctx where key = 'report_id'),
      p_status => 'triaged'::public.moderation_report_status,
      p_action_type => 'note'::public.moderation_action_type,
      p_notes => 'peer should not be authorized'
    );
    raise exception 'Expected non-operator moderation status update to fail.';
  exception
    when others then
      if position('operator' in lower(sqlerrm)) = 0 then
        raise;
      end if;
  end;
end
$$;

select set_config('request.jwt.claim.sub', '85555555-5555-4555-8555-555555555555', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.app_metadata', '{"role":"support"}', true);

select *
from public.set_moderation_report_status(
  p_report_id => (select value::uuid from _phase5a_ctx where key = 'report_id'),
  p_status => 'triaged'::public.moderation_report_status,
  p_action_type => 'note'::public.moderation_action_type,
  p_notes => 'Phase5A operator triage'
);

do $$
begin
  if not exists (
    select 1
    from public.moderation_actions ma
    where ma.report_id = (select value::uuid from _phase5a_ctx where key = 'report_id')
      and ma.notes = 'Phase5A operator triage'
  ) then
    raise exception 'Expected moderation action log entry after operator status transition.';
  end if;
end
$$;

reset role;
rollback;
