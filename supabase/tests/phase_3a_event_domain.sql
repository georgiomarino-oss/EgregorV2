-- Phase 3A canonical event domain SQL integration test
-- Run against a migrated local/staging database as a privileged role.
-- Example:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase_3a_event_domain.sql

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
    '61111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'phase3a-owner@example.com',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  ),
  (
    '62222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'phase3a-member@example.com',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  ),
  (
    '63333333-3333-4333-8333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'phase3a-outsider@example.com',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  ),
  (
    '64444444-4444-4444-8444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'phase3a-ny@example.com',
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
  ('61111111-1111-4111-8111-111111111111', 'Phase3A Owner', 'Europe/London'),
  ('62222222-2222-4222-8222-222222222222', 'Phase3A Member', 'Europe/London'),
  ('63333333-3333-4333-8333-333333333333', 'Phase3A Outsider', 'UTC'),
  ('64444444-4444-4444-8444-444444444444', 'Phase3A New York', 'America/New_York')
on conflict (id) do update
set
  display_name = excluded.display_name,
  timezone = excluded.timezone;

create temporary table _phase3a_ctx (
  key text primary key,
  value text not null
) on commit drop;

grant all on table _phase3a_ctx to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '61111111-1111-4111-8111-111111111111',
  true
);

select public.ensure_personal_circle(
  'Phase3A Circle',
  'Canonical event domain boundary test circle.'
);

insert into _phase3a_ctx (key, value)
select
  'circle_id',
  c.id::text
from public.circles c
where c.created_by = '61111111-1111-4111-8111-111111111111'
  and c.name = 'Phase3A Circle'
order by c.created_at desc
limit 1
on conflict (key) do update
set value = excluded.value;

reset role;

insert into public.circle_members (
  circle_id,
  user_id,
  role,
  status,
  joined_at,
  source_invitation_id,
  left_at
)
values (
  (select value::uuid from _phase3a_ctx where key = 'circle_id'),
  '62222222-2222-4222-8222-222222222222',
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
  left_at = null;

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
  is_active
)
values (
  'phase3a-circle-gathering',
  'Phase 3A Circle Gathering',
  'Circle Event',
  'Circle-only canonical room validation event.',
  'Circle Events',
  'Circle coherence and continuity',
  'manual_trigger'::public.event_schedule_type,
  'utc'::public.event_timezone_policy,
  14,
  10,
  120,
  'circle'::public.event_visibility_scope,
  'circle_members'::public.event_access_mode,
  (select value::uuid from _phase3a_ctx where key = 'circle_id'),
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
  is_active = true,
  updated_at = timezone('utc', now());

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '61111111-1111-4111-8111-111111111111',
  true
);

select public.materialize_event_occurrences(
  timezone('utc', now()) - interval '6 hours',
  timezone('utc', now()) + interval '2 days',
  array['Europe/London', 'America/New_York', 'UTC']
);

select public.materialize_event_occurrences(
  timezone('utc', now()) - interval '6 hours',
  timezone('utc', now()) + interval '2 days',
  array['Europe/London', 'America/New_York', 'UTC']
);

select public.refresh_event_occurrence_statuses(timezone('utc', now()));

do $$
begin
  if not exists (
    select 1
    from public.event_occurrences eo
    join public.event_series es
      on es.id = eo.series_id
    where es.key = 'daily-1111-intention-reset'
      and eo.display_timezone = 'Europe/London'
      and (eo.starts_at_utc at time zone 'Europe/London')::time = '11:11'::time
  ) then
    raise exception 'Expected 11:11 local occurrence for Europe/London.';
  end if;

  if not exists (
    select 1
    from public.event_occurrences eo
    join public.event_series es
      on es.id = eo.series_id
    where es.key = 'daily-1111-intention-reset'
      and eo.display_timezone = 'America/New_York'
      and (eo.starts_at_utc at time zone 'America/New_York')::time = '11:11'::time
  ) then
    raise exception 'Expected 11:11 local occurrence for America/New_York.';
  end if;

  if not exists (
    select 1
    from public.event_occurrences eo
    join public.event_series es
      on es.id = eo.series_id
    where es.key = 'global-heartbeat'
      and eo.display_timezone = 'UTC'
      and extract(minute from eo.starts_at_utc) = 0
      and extract(hour from eo.starts_at_utc) in (0, 6, 12, 18)
  ) then
    raise exception 'Expected UTC global-heartbeat occurrences at 6-hour cadence.';
  end if;

  if exists (
    select 1
    from public.event_occurrences eo
    group by eo.series_id, eo.starts_at_utc, eo.display_timezone
    having count(*) > 1
  ) then
    raise exception 'Duplicate occurrences detected for (series_id, starts_at_utc, display_timezone).';
  end if;
end
$$;

reset role;

insert into _phase3a_ctx (key, value)
select
  'circle_occurrence_id',
  public.admin_trigger_event_occurrence(
    'phase3a-circle-gathering',
    timezone('utc', now()) + interval '10 minutes',
    14,
    'UTC',
    jsonb_build_object('test_case', 'phase3a')
  )::text
on conflict (key) do update
set value = excluded.value;

insert into _phase3a_ctx (key, value)
select
  'circle_room_id',
  public.ensure_occurrence_room_identity(
    (select value::uuid from _phase3a_ctx where key = 'circle_occurrence_id')
  )::text
on conflict (key) do update
set value = excluded.value;

insert into _phase3a_ctx (key, value)
select
  'circle_occurrence_key',
  eo.occurrence_key
from public.event_occurrences eo
where eo.id = (select value::uuid from _phase3a_ctx where key = 'circle_occurrence_id')
limit 1
on conflict (key) do update
set value = excluded.value;

do $$
declare
  v_occurrence_id uuid := (select value::uuid from _phase3a_ctx where key = 'circle_occurrence_id');
  v_room_id uuid := (select value::uuid from _phase3a_ctx where key = 'circle_room_id');
begin
  if v_occurrence_id is null or v_room_id is null then
    raise exception 'Expected manual circle occurrence and room identity.';
  end if;

  if exists (
    select 1
    from public.rooms r
    where r.occurrence_id is not null
    group by r.occurrence_id
    having count(*) > 1
  ) then
    raise exception 'Expected unique room identity per occurrence.';
  end if;
end
$$;

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  '62222222-2222-4222-8222-222222222222',
  true
);

do $$
declare
  v_occurrence_id uuid := (select value::uuid from _phase3a_ctx where key = 'circle_occurrence_id');
  v_room_id uuid := (select value::uuid from _phase3a_ctx where key = 'circle_room_id');
  v_occurrence_key text := (select value from _phase3a_ctx where key = 'circle_occurrence_key');
begin
  if not exists (
    select 1
    from public.get_event_occurrence_by_join_target(
      p_occurrence_id => v_occurrence_id
    )
  ) then
    raise exception 'Member should resolve occurrence by occurrence_id.';
  end if;

  if not exists (
    select 1
    from public.get_event_occurrence_by_join_target(
      p_occurrence_key => v_occurrence_key
    )
  ) then
    raise exception 'Member should resolve occurrence by occurrence_key.';
  end if;

  if not exists (
    select 1
    from public.get_event_occurrence_by_join_target(
      p_room_id => v_room_id
    )
  ) then
    raise exception 'Member should resolve occurrence by room_id.';
  end if;
end
$$;

select *
from public.join_event_room(
  p_occurrence_id => (select value::uuid from _phase3a_ctx where key = 'circle_occurrence_id')
);

do $$
begin
  if not exists (
    select 1
    from public.get_room_presence_summary(
      (select value::uuid from _phase3a_ctx where key = 'circle_room_id')
    ) s
    where s.active_participant_count = 1
      and s.participant_count = 1
  ) then
    raise exception 'Expected member join to set active participant count to 1.';
  end if;
end
$$;

select *
from public.save_event_reminder_preference(
  p_target_type => 'occurrence'::public.event_reminder_target_type,
  p_occurrence_id => (select value::uuid from _phase3a_ctx where key = 'circle_occurrence_id'),
  p_enabled => true,
  p_channel => 'push',
  p_lead_minutes => 15
);

do $$
begin
  if not exists (
    select 1
    from public.event_reminder_preferences erp
    where erp.user_id = '62222222-2222-4222-8222-222222222222'
      and erp.target_type = 'occurrence'::public.event_reminder_target_type
      and erp.occurrence_id = (select value::uuid from _phase3a_ctx where key = 'circle_occurrence_id')
      and erp.enabled = true
  ) then
    raise exception 'Expected occurrence reminder preference to persist by occurrence identity.';
  end if;
end
$$;

select set_config(
  'request.jwt.claim.sub',
  '61111111-1111-4111-8111-111111111111',
  true
);

select *
from public.join_event_room(
  p_occurrence_id => (select value::uuid from _phase3a_ctx where key = 'circle_occurrence_id')
);

do $$
begin
  if not exists (
    select 1
    from public.get_room_presence_summary(
      (select value::uuid from _phase3a_ctx where key = 'circle_room_id')
    ) s
    where s.active_participant_count = 2
      and s.participant_count = 2
  ) then
    raise exception 'Expected owner join to set active participant count to 2.';
  end if;
end
$$;

select public.leave_event_room(
  p_occurrence_id => (select value::uuid from _phase3a_ctx where key = 'circle_occurrence_id')
);

do $$
begin
  if not exists (
    select 1
    from public.get_room_presence_summary(
      (select value::uuid from _phase3a_ctx where key = 'circle_room_id')
    ) s
    where s.active_participant_count = 1
      and s.participant_count = 1
  ) then
    raise exception 'Expected active participant count to decrement after leave.';
  end if;
end
$$;

select set_config(
  'request.jwt.claim.sub',
  '63333333-3333-4333-8333-333333333333',
  true
);

do $$
declare
  v_occurrence_id uuid := (select value::uuid from _phase3a_ctx where key = 'circle_occurrence_id');
begin
  if exists (
    select 1
    from public.list_event_feed(24, 'UTC') feed
    where feed.occurrence_id = v_occurrence_id
  ) then
    raise exception 'Outsider should not see circle-scoped occurrence in feed.';
  end if;

  if exists (
    select 1
    from public.get_event_occurrence_by_join_target(
      p_occurrence_id => v_occurrence_id
    )
  ) then
    raise exception 'Outsider should not resolve circle occurrence by join target.';
  end if;
end
$$;

do $$
begin
  begin
    perform *
    from public.ensure_joinable_occurrence_room(
      p_occurrence_id => (select value::uuid from _phase3a_ctx where key = 'circle_occurrence_id')
    );
    raise exception 'Expected outsider ensure_joinable_occurrence_room to fail.';
  exception
    when others then
      if position('access' in lower(sqlerrm)) = 0 then
        raise;
      end if;
  end;
end
$$;

do $$
begin
  begin
    perform public.admin_trigger_event_occurrence(
      p_series_key => 'phase3a-circle-gathering',
      p_starts_at_utc => timezone('utc', now()) + interval '15 minutes',
      p_duration_minutes => 14,
      p_display_timezone => 'UTC',
      p_metadata => jsonb_build_object('test_case', 'phase3a-outsider-authz')
    );
    raise exception 'Expected outsider admin_trigger_event_occurrence call to fail.';
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

select set_config(
  'request.jwt.claim.sub',
  '62222222-2222-4222-8222-222222222222',
  true
);

do $$
declare
  v_occurrence_id uuid := (select value::uuid from _phase3a_ctx where key = 'circle_occurrence_id');
begin
  if not exists (
    select 1
    from public.list_event_feed(24, 'UTC') feed
    where feed.occurrence_id = v_occurrence_id
  ) then
    raise exception 'Active circle member should see circle-scoped occurrence in feed.';
  end if;
end
$$;

reset role;

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
  '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Phase3A Legacy Event',
  'Legacy Compatibility',
  'Legacy event row for canonical join-target backfill.',
  'Legacy host note',
  'Global',
  'GB',
  timezone('utc', now()) + interval '20 minutes',
  20,
  'scheduled',
  'public',
  '61111111-1111-4111-8111-111111111111'
)
on conflict (id) do update
set
  starts_at = excluded.starts_at,
  status = excluded.status,
  updated_at = timezone('utc', now());

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '61111111-1111-4111-8111-111111111111',
  true
);

insert into _phase3a_ctx (key, value)
select
  'legacy_occurrence_id',
  resolved.occurrence_id::text
from public.get_event_occurrence_by_join_target(
  p_legacy_event_id => '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
) resolved
limit 1
on conflict (key) do update
set value = excluded.value;

do $$
begin
  if not exists (
    select 1
    from public.event_occurrences eo
    where eo.id = (select value::uuid from _phase3a_ctx where key = 'legacy_occurrence_id')
      and eo.source_event_id = '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ) then
    raise exception 'Expected legacy event id to resolve to canonical occurrence and source mapping.';
  end if;
end
$$;

reset role;
rollback;
