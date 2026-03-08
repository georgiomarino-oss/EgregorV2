-- Phase 3A focused verification: idempotence, timezone semantics, and authz hardening.
-- Run against a migrated local/staging database as a privileged role.
-- Example:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase_3a_event_domain_idempotence.sql

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
    '71111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'phase3a-verify-owner@example.com',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  ),
  (
    '72222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'phase3a-verify-ny@example.com',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  ),
  (
    '73333333-3333-4333-8333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'phase3a-verify-peer@example.com',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  )
on conflict (id) do nothing;

insert into public.profiles (id, display_name, timezone)
values
  ('71111111-1111-4111-8111-111111111111', 'Phase3A Verify Owner', null),
  ('72222222-2222-4222-8222-222222222222', 'Phase3A Verify New York', 'America/New_York'),
  ('73333333-3333-4333-8333-333333333333', 'Phase3A Verify Peer', 'America/New_York')
on conflict (id) do update
set
  display_name = excluded.display_name,
  timezone = excluded.timezone;

create temporary table _phase3a_verify_ctx (
  key text primary key,
  value text not null
) on commit drop;

grant all on table _phase3a_verify_ctx to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '72222222-2222-4222-8222-222222222222',
  true
);

select public.materialize_event_occurrences(
  '2026-10-30 00:00:00+00'::timestamptz,
  '2026-11-03 23:59:00+00'::timestamptz,
  array['America/New_York', 'UTC']
);

select public.materialize_event_occurrences(
  '2026-10-30 00:00:00+00'::timestamptz,
  '2026-11-03 23:59:00+00'::timestamptz,
  array['America/New_York', 'UTC']
);

do $$
begin
  if exists (
    select 1
    from public.event_occurrences eo
    join public.event_series es
      on es.id = eo.series_id
    where es.key = 'daily-1111-intention-reset'
      and eo.display_timezone = 'America/New_York'
      and (eo.starts_at_utc at time zone 'America/New_York')::date
          between '2026-10-30'::date and '2026-11-03'::date
    group by (eo.starts_at_utc at time zone 'America/New_York')::date
    having count(*) <> 1
  ) then
    raise exception 'Expected exactly one 11:11 local occurrence per New York local day.';
  end if;

  if not exists (
    select 1
    from public.event_occurrences eo
    join public.event_series es
      on es.id = eo.series_id
    where es.key = 'daily-1111-intention-reset'
      and eo.display_timezone = 'America/New_York'
      and (eo.starts_at_utc at time zone 'America/New_York')::date = '2026-10-31'::date
      and (eo.starts_at_utc at time zone 'America/New_York')::time = '11:11'::time
      and extract(hour from eo.starts_at_utc) = 15
  ) then
    raise exception 'Expected pre-DST-end New York 11:11 occurrence at 15:11 UTC.';
  end if;

  if not exists (
    select 1
    from public.event_occurrences eo
    join public.event_series es
      on es.id = eo.series_id
    where es.key = 'daily-1111-intention-reset'
      and eo.display_timezone = 'America/New_York'
      and (eo.starts_at_utc at time zone 'America/New_York')::date = '2026-11-02'::date
      and (eo.starts_at_utc at time zone 'America/New_York')::time = '11:11'::time
      and extract(hour from eo.starts_at_utc) = 16
  ) then
    raise exception 'Expected post-DST-end New York 11:11 occurrence at 16:11 UTC.';
  end if;

  if exists (
    select 1
    from public.event_occurrences eo
    group by eo.series_id, eo.starts_at_utc, eo.display_timezone
    having count(*) > 1
  ) then
    raise exception 'Duplicate occurrences detected after repeated materialization.';
  end if;
end
$$;

select set_config(
  'request.jwt.claim.sub',
  '71111111-1111-4111-8111-111111111111',
  true
);

do $$
begin
  if public.resolve_valid_timezone(null, auth.uid()) <> 'UTC' then
    raise exception 'Expected UTC fallback for missing profile timezone.';
  end if;

  if not exists (
    select 1
    from public.list_event_feed(72, null) feed
    where feed.series_key = 'daily-1111-intention-reset'
      and feed.display_timezone = 'UTC'
  ) then
    raise exception 'Expected list_event_feed fallback timezone to resolve to UTC for missing profile timezone.';
  end if;
end
$$;

update public.profiles
set timezone = 'America/New_York'
where id = '71111111-1111-4111-8111-111111111111';

do $$
begin
  if public.resolve_valid_timezone(null, auth.uid()) <> 'America/New_York' then
    raise exception 'Expected profile timezone override to be applied.';
  end if;

  if not exists (
    select 1
    from public.list_event_feed(72, null) feed
    where feed.series_key = 'daily-1111-intention-reset'
      and feed.display_timezone = 'America/New_York'
  ) then
    raise exception 'Expected list_event_feed to switch to updated profile timezone.';
  end if;
end
$$;

update public.profiles
set timezone = 'Invalid/Timezone'
where id = '71111111-1111-4111-8111-111111111111';

do $$
begin
  if public.resolve_valid_timezone(null, auth.uid()) <> 'UTC' then
    raise exception 'Expected invalid profile timezone to fall back to UTC.';
  end if;
end
$$;

update public.profiles
set timezone = 'America/New_York'
where id = '71111111-1111-4111-8111-111111111111';

reset role;

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
  is_active
)
values (
  'phase3a-idempotence-room',
  'Phase 3A Idempotence Room',
  'Verification room',
  'Join idempotence and presence verification occurrence.',
  'Verification',
  'Prove canonical room idempotence',
  'manual_trigger'::public.event_schedule_type,
  'utc'::public.event_timezone_policy,
  20,
  30,
  180,
  'global'::public.event_visibility_scope,
  'open'::public.event_access_mode,
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
  is_active = true,
  updated_at = timezone('utc', now());

insert into _phase3a_verify_ctx (key, value)
select
  'occurrence_id',
  public.admin_trigger_event_occurrence(
    p_series_key => 'phase3a-idempotence-room',
    p_starts_at_utc => timezone('utc', now()) + interval '12 minutes',
    p_duration_minutes => 20,
    p_display_timezone => 'UTC',
    p_metadata => jsonb_build_object('test_case', 'phase3a-idempotence')
  )::text
on conflict (key) do update
set value = excluded.value;

insert into _phase3a_verify_ctx (key, value)
select
  'occurrence_key',
  eo.occurrence_key
from public.event_occurrences eo
where eo.id = (select value::uuid from _phase3a_verify_ctx where key = 'occurrence_id')
limit 1
on conflict (key) do update
set value = excluded.value;

insert into _phase3a_verify_ctx (key, value)
select
  'room_id',
  public.ensure_occurrence_room_identity(
    (select value::uuid from _phase3a_verify_ctx where key = 'occurrence_id')
  )::text
on conflict (key) do update
set value = excluded.value;

insert into public.events (
  id,
  title,
  subtitle,
  description,
  host_note,
  region,
  country_code,
  starts_at,
  duration_minutes,
  status,
  visibility,
  created_by
)
values (
  '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Phase3A Verify Legacy Event',
  'Legacy target for precedence checks',
  'Legacy event to validate canonical join target precedence.',
  'Legacy host note',
  'Global',
  'US',
  timezone('utc', now()) + interval '30 minutes',
  20,
  'scheduled',
  'public',
  '71111111-1111-4111-8111-111111111111'
)
on conflict (id) do update
set
  starts_at = excluded.starts_at,
  duration_minutes = excluded.duration_minutes,
  status = excluded.status,
  updated_at = timezone('utc', now());

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '71111111-1111-4111-8111-111111111111',
  true
);

insert into _phase3a_verify_ctx (key, value)
select
  'ensure_room_a',
  ensured.room_id::text
from public.ensure_joinable_occurrence_room(
  p_occurrence_id => (select value::uuid from _phase3a_verify_ctx where key = 'occurrence_id')
) ensured
limit 1
on conflict (key) do update
set value = excluded.value;

insert into _phase3a_verify_ctx (key, value)
select
  'ensure_room_b',
  ensured.room_id::text
from public.ensure_joinable_occurrence_room(
  p_occurrence_key => (select value from _phase3a_verify_ctx where key = 'occurrence_key')
) ensured
limit 1
on conflict (key) do update
set value = excluded.value;

do $$
declare
  v_room_id uuid := (select value::uuid from _phase3a_verify_ctx where key = 'room_id');
  v_room_a uuid := (select value::uuid from _phase3a_verify_ctx where key = 'ensure_room_a');
  v_room_b uuid := (select value::uuid from _phase3a_verify_ctx where key = 'ensure_room_b');
begin
  if v_room_id is null or v_room_a is null or v_room_b is null then
    raise exception 'Expected canonical room idempotence targets.';
  end if;

  if v_room_a <> v_room_b or v_room_a <> v_room_id then
    raise exception 'Expected ensure_joinable_occurrence_room to return a stable room identity.';
  end if;
end
$$;

do $$
begin
  for i in 1..20 loop
    perform *
    from public.join_event_room(
      p_occurrence_id => (select value::uuid from _phase3a_verify_ctx where key = 'occurrence_id')
    );
  end loop;
end
$$;

do $$
begin
  if exists (
    select 1
    from public.room_participants rp
    where rp.room_id = (select value::uuid from _phase3a_verify_ctx where key = 'room_id')
      and rp.user_id = '71111111-1111-4111-8111-111111111111'
    group by rp.room_id, rp.user_id
    having count(*) > 1
  ) then
    raise exception 'Repeated join_event_room calls created duplicate participant rows.';
  end if;

  if not exists (
    select 1
    from public.get_room_presence_summary(
      (select value::uuid from _phase3a_verify_ctx where key = 'room_id')
    ) s
    where s.participant_count = 1
      and s.active_participant_count = 1
  ) then
    raise exception 'Expected repeated same-user joins to keep participant counts stable at 1.';
  end if;
end
$$;

select set_config(
  'request.jwt.claim.sub',
  '73333333-3333-4333-8333-333333333333',
  true
);

do $$
begin
  for i in 1..10 loop
    perform *
    from public.join_event_room(
      p_occurrence_id => (select value::uuid from _phase3a_verify_ctx where key = 'occurrence_id')
    );
  end loop;
end
$$;

do $$
begin
  if not exists (
    select 1
    from public.get_room_presence_summary(
      (select value::uuid from _phase3a_verify_ctx where key = 'room_id')
    ) s
    where s.participant_count = 2
      and s.active_participant_count = 2
  ) then
    raise exception 'Expected repeated second-user joins to converge at participant count 2.';
  end if;
end
$$;

select set_config(
  'request.jwt.claim.sub',
  '71111111-1111-4111-8111-111111111111',
  true
);

select public.leave_event_room(
  p_occurrence_id => (select value::uuid from _phase3a_verify_ctx where key = 'occurrence_id')
);

select public.leave_event_room(
  p_occurrence_id => (select value::uuid from _phase3a_verify_ctx where key = 'occurrence_id')
);

select *
from public.join_event_room(
  p_occurrence_id => (select value::uuid from _phase3a_verify_ctx where key = 'occurrence_id')
);

do $$
begin
  if exists (
    select 1
    from public.room_participants rp
    where rp.room_id = (select value::uuid from _phase3a_verify_ctx where key = 'room_id')
      and rp.user_id in (
        '71111111-1111-4111-8111-111111111111',
        '73333333-3333-4333-8333-333333333333'
      )
    group by rp.room_id, rp.user_id
    having count(*) > 1
  ) then
    raise exception 'Leave/rejoin sequence produced duplicate room_participants rows.';
  end if;

  if not exists (
    select 1
    from public.get_room_presence_summary(
      (select value::uuid from _phase3a_verify_ctx where key = 'room_id')
    ) s
    where s.participant_count = 2
      and s.active_participant_count = 2
  ) then
    raise exception 'Expected active participant count to recover to 2 after leave+rejoin.';
  end if;
end
$$;

select *
from public.save_event_reminder_preference(
  p_target_type => 'occurrence'::public.event_reminder_target_type,
  p_occurrence_id => (select value::uuid from _phase3a_verify_ctx where key = 'occurrence_id'),
  p_enabled => true,
  p_channel => 'push',
  p_lead_minutes => 15
);

select *
from public.save_event_reminder_preference(
  p_target_type => 'occurrence'::public.event_reminder_target_type,
  p_occurrence_id => (select value::uuid from _phase3a_verify_ctx where key = 'occurrence_id'),
  p_enabled => true,
  p_channel => 'push',
  p_lead_minutes => 30
);

do $$
begin
  if (
    select count(*)
    from public.event_reminder_preferences pref
    where pref.user_id = '71111111-1111-4111-8111-111111111111'
      and pref.target_type = 'occurrence'::public.event_reminder_target_type
      and pref.occurrence_id = (select value::uuid from _phase3a_verify_ctx where key = 'occurrence_id')
  ) <> 1 then
    raise exception 'Expected reminder upsert idempotence for occurrence target.';
  end if;

  if not exists (
    select 1
    from public.event_reminder_preferences pref
    where pref.user_id = '71111111-1111-4111-8111-111111111111'
      and pref.target_type = 'occurrence'::public.event_reminder_target_type
      and pref.occurrence_id = (select value::uuid from _phase3a_verify_ctx where key = 'occurrence_id')
      and pref.lead_minutes = 30
      and pref.enabled = true
  ) then
    raise exception 'Expected reminder preference update to persist latest lead_minutes value.';
  end if;
end
$$;

insert into _phase3a_verify_ctx (key, value)
select
  'legacy_occurrence_id',
  resolved.occurrence_id::text
from public.get_event_occurrence_by_join_target(
  p_legacy_event_id => '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
) resolved
limit 1
on conflict (key) do update
set value = excluded.value;

do $$
declare
  v_manual_occurrence uuid := (select value::uuid from _phase3a_verify_ctx where key = 'occurrence_id');
begin
  if not exists (
    select 1
    from public.get_event_occurrence_by_join_target(
      p_occurrence_id => v_manual_occurrence,
      p_legacy_event_id => '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    ) resolved
    where resolved.occurrence_id = v_manual_occurrence
  ) then
    raise exception 'Expected canonical occurrence_id to take precedence over legacy join target.';
  end if;
end
$$;

do $$
begin
  begin
    perform public.admin_trigger_event_occurrence(
      p_series_key => 'phase3a-idempotence-room',
      p_starts_at_utc => timezone('utc', now()) + interval '10 minutes',
      p_duration_minutes => 20,
      p_display_timezone => 'UTC',
      p_metadata => jsonb_build_object('test_case', 'phase3a-authz')
    );
    raise exception 'Expected authenticated caller to be blocked from admin_trigger_event_occurrence.';
  exception
    when insufficient_privilege then
      null;
    when others then
      if position('permission denied' in lower(sqlerrm)) = 0 then
        raise;
      end if;
  end;
end
$$;

reset role;
rollback;
