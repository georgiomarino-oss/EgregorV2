create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'event_schedule_type'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.event_schedule_type as enum (
      'local_time_daily',
      'utc_interval',
      'admin_curated',
      'manual_trigger'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'event_timezone_policy'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.event_timezone_policy as enum (
      'viewer_local',
      'fixed_timezone',
      'utc'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'event_visibility_scope'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.event_visibility_scope as enum (
      'global',
      'circle',
      'private'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'event_access_mode'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.event_access_mode as enum (
      'open',
      'circle_members',
      'invite_only'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'event_occurrence_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.event_occurrence_status as enum (
      'scheduled',
      'live',
      'ended',
      'cancelled'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'room_kind'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.room_kind as enum (
      'event_occurrence',
      'shared_solo',
      'circle_dropin'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'room_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.room_status as enum (
      'open',
      'locked',
      'ended'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'room_participant_role'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.room_participant_role as enum (
      'host',
      'participant',
      'moderator'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'room_presence_state'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.room_presence_state as enum (
      'active',
      'idle',
      'left'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'event_reminder_target_type'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.event_reminder_target_type as enum (
      'series',
      'occurrence',
      'room'
    );
  end if;
end
$$;

alter table public.profiles
  add column if not exists timezone text;

create index if not exists profiles_timezone_idx
on public.profiles(timezone)
where timezone is not null;

create table if not exists public.event_series (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  subtitle text,
  description text,
  category text not null default 'Daily Rhythm',
  purpose text,
  schedule_type public.event_schedule_type not null,
  timezone_policy public.event_timezone_policy not null default 'utc',
  local_time time,
  local_timezone text,
  utc_interval_minutes integer,
  utc_offset_minutes integer not null default 0 check (utc_offset_minutes >= 0 and utc_offset_minutes < 1440),
  rrule text,
  default_duration_minutes integer not null check (default_duration_minutes > 0),
  join_window_start_minutes integer not null default 15 check (join_window_start_minutes >= 0 and join_window_start_minutes <= 1440),
  join_window_end_minutes integer not null default 120 check (join_window_end_minutes >= 0 and join_window_end_minutes <= 4320),
  visibility_scope public.event_visibility_scope not null default 'global',
  access_mode public.event_access_mode not null default 'open',
  circle_id uuid references public.circles(id) on delete cascade,
  is_emergency boolean not null default false,
  is_special boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint event_series_local_time_required check (
    schedule_type <> 'local_time_daily'::public.event_schedule_type
    or local_time is not null
  ),
  constraint event_series_utc_interval_required check (
    schedule_type <> 'utc_interval'::public.event_schedule_type
    or (utc_interval_minutes is not null and utc_interval_minutes > 0)
  ),
  constraint event_series_fixed_timezone_required check (
    timezone_policy <> 'fixed_timezone'::public.event_timezone_policy
    or nullif(btrim(local_timezone), '') is not null
  ),
  constraint event_series_circle_scope_requires_circle check (
    visibility_scope <> 'circle'::public.event_visibility_scope
    or circle_id is not null
  )
);

create index if not exists event_series_active_schedule_idx
on public.event_series(is_active, schedule_type, visibility_scope);

create index if not exists event_series_circle_scope_idx
on public.event_series(circle_id, is_active)
where circle_id is not null;

drop trigger if exists event_series_set_updated_at on public.event_series;
create trigger event_series_set_updated_at
before update on public.event_series
for each row
execute function public.handle_updated_at();

create table if not exists public.event_occurrences (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.event_series(id) on delete cascade,
  occurrence_key text not null unique,
  starts_at_utc timestamptz not null,
  ends_at_utc timestamptz not null,
  display_timezone text not null default 'UTC',
  status public.event_occurrence_status not null default 'scheduled',
  join_window_start timestamptz not null,
  join_window_end timestamptz not null,
  source_event_id uuid references public.events(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint event_occurrences_window_order check (
    join_window_start <= starts_at_utc
    and join_window_end >= starts_at_utc
    and ends_at_utc > starts_at_utc
  )
);

create unique index if not exists event_occurrences_series_start_tz_idx
on public.event_occurrences(series_id, starts_at_utc, display_timezone);

create unique index if not exists event_occurrences_source_event_idx
on public.event_occurrences(source_event_id)
where source_event_id is not null;

create index if not exists event_occurrences_status_start_idx
on public.event_occurrences(status, starts_at_utc);

create index if not exists event_occurrences_display_timezone_idx
on public.event_occurrences(display_timezone, starts_at_utc)
where display_timezone is not null;

drop trigger if exists event_occurrences_set_updated_at on public.event_occurrences;
create trigger event_occurrences_set_updated_at
before update on public.event_occurrences
for each row
execute function public.handle_updated_at();

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_kind public.room_kind not null default 'event_occurrence',
  occurrence_id uuid unique references public.event_occurrences(id) on delete set null,
  circle_id uuid references public.circles(id) on delete set null,
  host_user_id uuid references auth.users(id) on delete set null,
  visibility_scope public.event_visibility_scope not null default 'global',
  access_mode public.event_access_mode not null default 'open',
  status public.room_status not null default 'open',
  opened_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz,
  legacy_event_id uuid references public.events(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint rooms_occurrence_required_for_event_room check (
    room_kind <> 'event_occurrence'::public.room_kind
    or occurrence_id is not null
  )
);

create unique index if not exists rooms_legacy_event_unique_idx
on public.rooms(legacy_event_id)
where legacy_event_id is not null
  and room_kind = 'event_occurrence'::public.room_kind;

create index if not exists rooms_occurrence_status_idx
on public.rooms(occurrence_id, status);

create index if not exists rooms_circle_status_idx
on public.rooms(circle_id, status)
where circle_id is not null;

drop trigger if exists rooms_set_updated_at on public.rooms;
create trigger rooms_set_updated_at
before update on public.rooms
for each row
execute function public.handle_updated_at();

create table if not exists public.room_participants (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.room_participant_role not null default 'participant',
  presence_state public.room_presence_state not null default 'active',
  joined_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  left_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  primary key (room_id, user_id),
  constraint room_participants_left_state_requires_left_at check (
    presence_state <> 'left'::public.room_presence_state
    or left_at is not null
  )
);

create index if not exists room_participants_room_presence_idx
on public.room_participants(room_id, presence_state, last_seen_at desc);

create index if not exists room_participants_user_presence_idx
on public.room_participants(user_id, presence_state, last_seen_at desc);

create table if not exists public.event_reminder_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type public.event_reminder_target_type not null,
  series_id uuid references public.event_series(id) on delete cascade,
  occurrence_id uuid references public.event_occurrences(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete cascade,
  enabled boolean not null default true,
  channel text not null default 'push' check (channel in ('push', 'email', 'in_app')),
  lead_minutes integer not null default 15 check (lead_minutes >= 0 and lead_minutes <= 1440),
  quiet_hours jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint event_reminder_target_match check (
    (
      target_type = 'series'::public.event_reminder_target_type
      and series_id is not null
      and occurrence_id is null
      and room_id is null
    )
    or (
      target_type = 'occurrence'::public.event_reminder_target_type
      and series_id is null
      and occurrence_id is not null
      and room_id is null
    )
    or (
      target_type = 'room'::public.event_reminder_target_type
      and series_id is null
      and occurrence_id is null
      and room_id is not null
    )
  )
);

create unique index if not exists event_reminders_unique_series_idx
on public.event_reminder_preferences(user_id, series_id)
where target_type = 'series'::public.event_reminder_target_type;

create unique index if not exists event_reminders_unique_occurrence_idx
on public.event_reminder_preferences(user_id, occurrence_id)
where target_type = 'occurrence'::public.event_reminder_target_type;

create unique index if not exists event_reminders_unique_room_idx
on public.event_reminder_preferences(user_id, room_id)
where target_type = 'room'::public.event_reminder_target_type;

drop trigger if exists event_reminder_preferences_set_updated_at on public.event_reminder_preferences;
create trigger event_reminder_preferences_set_updated_at
before update on public.event_reminder_preferences
for each row
execute function public.handle_updated_at();

create or replace function public.resolve_valid_timezone(
  p_requested_timezone text default null,
  p_user_id uuid default auth.uid()
)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_candidate text := nullif(btrim(p_requested_timezone), '');
begin
  if v_candidate is null and p_user_id is not null then
    select nullif(btrim(p.timezone), '')
    into v_candidate
    from public.profiles p
    where p.id = p_user_id
    limit 1;
  end if;

  if v_candidate is not null and exists (
    select 1
    from pg_timezone_names tz
    where tz.name = v_candidate
  ) then
    return v_candidate;
  end if;

  return 'UTC';
end;
$$;

create or replace function public.can_access_event_series(
  p_series_id uuid,
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
    from public.event_series es
    where es.id = p_series_id
      and (
        es.visibility_scope = 'global'::public.event_visibility_scope
        or (
          es.visibility_scope = 'circle'::public.event_visibility_scope
          and es.circle_id is not null
          and public.is_circle_active_member(es.circle_id, coalesce(p_user_id, auth.uid()))
        )
        or (
          es.visibility_scope = 'private'::public.event_visibility_scope
          and es.created_by = coalesce(p_user_id, auth.uid())
        )
      )
  );
$$;

create or replace function public.can_access_event_occurrence(
  p_occurrence_id uuid,
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
    from public.event_occurrences eo
    where eo.id = p_occurrence_id
      and public.can_access_event_series(eo.series_id, coalesce(p_user_id, auth.uid()))
  );
$$;

create or replace function public.can_access_room(
  p_room_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  with target as (
    select
      r.id,
      r.room_kind,
      r.occurrence_id,
      r.circle_id,
      r.host_user_id,
      r.access_mode
    from public.rooms r
    where r.id = p_room_id
  )
  select exists (
    select 1
    from target t
    where
      t.host_user_id = coalesce(p_user_id, auth.uid())
      or (
        t.room_kind = 'event_occurrence'::public.room_kind
        and t.occurrence_id is not null
        and public.can_access_event_occurrence(t.occurrence_id, coalesce(p_user_id, auth.uid()))
        and (
          t.access_mode = 'open'::public.event_access_mode
          or (
            t.access_mode = 'circle_members'::public.event_access_mode
            and t.circle_id is not null
            and public.is_circle_active_member(t.circle_id, coalesce(p_user_id, auth.uid()))
          )
          or (
            t.access_mode = 'invite_only'::public.event_access_mode
            and (
              exists (
                select 1
                from public.room_participants rp
                where rp.room_id = t.id
                  and rp.user_id = coalesce(p_user_id, auth.uid())
                  and rp.presence_state <> 'left'::public.room_presence_state
              )
              or (
                t.circle_id is not null
                and public.is_circle_active_member(t.circle_id, coalesce(p_user_id, auth.uid()))
              )
            )
          )
        )
      )
  );
$$;

create or replace function public.can_join_room(
  p_room_id uuid,
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
    from public.rooms r
    where r.id = p_room_id
      and r.status = 'open'::public.room_status
      and public.can_access_room(r.id, coalesce(p_user_id, auth.uid()))
  );
$$;

alter table public.event_series enable row level security;
alter table public.event_occurrences enable row level security;
alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.event_reminder_preferences enable row level security;

drop policy if exists event_series_select_visible on public.event_series;
create policy event_series_select_visible
on public.event_series
for select
to authenticated
using (
  public.can_access_event_series(id, auth.uid())
  and (is_active = true or created_by = auth.uid())
);

drop policy if exists event_series_insert_none on public.event_series;
create policy event_series_insert_none
on public.event_series
for insert
to authenticated
with check (false);

drop policy if exists event_series_update_none on public.event_series;
create policy event_series_update_none
on public.event_series
for update
to authenticated
using (false)
with check (false);

drop policy if exists event_series_delete_none on public.event_series;
create policy event_series_delete_none
on public.event_series
for delete
to authenticated
using (false);

drop policy if exists event_occurrences_select_visible on public.event_occurrences;
create policy event_occurrences_select_visible
on public.event_occurrences
for select
to authenticated
using (public.can_access_event_occurrence(id, auth.uid()));

drop policy if exists event_occurrences_insert_none on public.event_occurrences;
create policy event_occurrences_insert_none
on public.event_occurrences
for insert
to authenticated
with check (false);

drop policy if exists event_occurrences_update_none on public.event_occurrences;
create policy event_occurrences_update_none
on public.event_occurrences
for update
to authenticated
using (false)
with check (false);

drop policy if exists event_occurrences_delete_none on public.event_occurrences;
create policy event_occurrences_delete_none
on public.event_occurrences
for delete
to authenticated
using (false);

drop policy if exists rooms_select_visible on public.rooms;
create policy rooms_select_visible
on public.rooms
for select
to authenticated
using (public.can_access_room(id, auth.uid()));

drop policy if exists rooms_insert_none on public.rooms;
create policy rooms_insert_none
on public.rooms
for insert
to authenticated
with check (false);

drop policy if exists rooms_update_none on public.rooms;
create policy rooms_update_none
on public.rooms
for update
to authenticated
using (false)
with check (false);

drop policy if exists rooms_delete_none on public.rooms;
create policy rooms_delete_none
on public.rooms
for delete
to authenticated
using (false);

drop policy if exists room_participants_select_visible on public.room_participants;
create policy room_participants_select_visible
on public.room_participants
for select
to authenticated
using (
  user_id = auth.uid()
  or public.can_access_room(room_id, auth.uid())
);

drop policy if exists room_participants_insert_self on public.room_participants;
create policy room_participants_insert_self
on public.room_participants
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.can_join_room(room_id, auth.uid())
);

drop policy if exists room_participants_update_self on public.room_participants;
create policy room_participants_update_self
on public.room_participants
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists room_participants_delete_self on public.room_participants;
create policy room_participants_delete_self
on public.room_participants
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists event_reminders_select_own on public.event_reminder_preferences;
create policy event_reminders_select_own
on public.event_reminder_preferences
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists event_reminders_insert_own on public.event_reminder_preferences;
create policy event_reminders_insert_own
on public.event_reminder_preferences
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists event_reminders_update_own on public.event_reminder_preferences;
create policy event_reminders_update_own
on public.event_reminder_preferences
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists event_reminders_delete_own on public.event_reminder_preferences;
create policy event_reminders_delete_own
on public.event_reminder_preferences
for delete
to authenticated
using (user_id = auth.uid());
insert into public.event_series (
  key,
  name,
  subtitle,
  description,
  category,
  purpose,
  schedule_type,
  timezone_policy,
  local_time,
  utc_interval_minutes,
  default_duration_minutes,
  join_window_start_minutes,
  join_window_end_minutes,
  visibility_scope,
  access_mode,
  is_emergency,
  is_special,
  metadata,
  is_active
)
values
  (
    'daily-1111-intention-reset',
    '11:11 Intention Reset',
    'Daily Rhythm',
    'Midday recentering and intention realignment.',
    'Daily Rhythm',
    'Midday recentering and intention realignment',
    'local_time_daily'::public.event_schedule_type,
    'viewer_local'::public.event_timezone_policy,
    '11:11'::time,
    null,
    11,
    15,
    120,
    'global'::public.event_visibility_scope,
    'open'::public.event_access_mode,
    false,
    false,
    jsonb_build_object('phase', '3a', 'ritual', true),
    true
  ),
  (
    'daily-sunrise-gratitude',
    'Sunrise Gratitude',
    'Daily Rhythm',
    'Begin day grounded in gratitude.',
    'Daily Rhythm',
    'Begin day grounded in gratitude',
    'local_time_daily'::public.event_schedule_type,
    'viewer_local'::public.event_timezone_policy,
    '07:00'::time,
    null,
    12,
    20,
    120,
    'global'::public.event_visibility_scope,
    'open'::public.event_access_mode,
    false,
    false,
    jsonb_build_object('phase', '3a', 'ritual', true),
    true
  ),
  (
    'daily-evening-release',
    'Evening Release',
    'Daily Rhythm',
    'Let go, forgive, and close the day.',
    'Daily Rhythm',
    'Let go, forgive, and close the day',
    'local_time_daily'::public.event_schedule_type,
    'viewer_local'::public.event_timezone_policy,
    '21:30'::time,
    null,
    15,
    20,
    150,
    'global'::public.event_visibility_scope,
    'open'::public.event_access_mode,
    false,
    false,
    jsonb_build_object('phase', '3a', 'ritual', true),
    true
  ),
  (
    'global-heartbeat',
    'Global Heartbeat',
    'Global Moment',
    'Shared synchronized prayer across regions every six hours.',
    'Global Moment',
    'Shared synchronized prayer across regions',
    'utc_interval'::public.event_schedule_type,
    'utc'::public.event_timezone_policy,
    null,
    360,
    15,
    30,
    180,
    'global'::public.event_visibility_scope,
    'open'::public.event_access_mode,
    false,
    false,
    jsonb_build_object('phase', '3a', 'utc_slots', jsonb_build_array('00:00', '06:00', '12:00', '18:00')),
    true
  ),
  (
    'admin-curated-special-moment',
    'Special Collective Moment',
    'Admin Curated',
    'Admin-curated one-off event series for special collective moments.',
    'Special Moment',
    'Admin-curated one-off collective events',
    'admin_curated'::public.event_schedule_type,
    'utc'::public.event_timezone_policy,
    null,
    null,
    20,
    30,
    240,
    'global'::public.event_visibility_scope,
    'open'::public.event_access_mode,
    false,
    true,
    jsonb_build_object('phase', '3a', 'curated', true),
    true
  ),
  (
    'emergency-global-prayer',
    'Emergency Global Prayer',
    'Alert',
    'Rapid coordinated response to collective crises.',
    'Alert',
    'Rapid coordinated response to crisis',
    'manual_trigger'::public.event_schedule_type,
    'utc'::public.event_timezone_policy,
    null,
    null,
    20,
    5,
    180,
    'global'::public.event_visibility_scope,
    'open'::public.event_access_mode,
    true,
    true,
    jsonb_build_object('phase', '3a', 'emergency', true),
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
  local_time = excluded.local_time,
  utc_interval_minutes = excluded.utc_interval_minutes,
  default_duration_minutes = excluded.default_duration_minutes,
  join_window_start_minutes = excluded.join_window_start_minutes,
  join_window_end_minutes = excluded.join_window_end_minutes,
  visibility_scope = excluded.visibility_scope,
  access_mode = excluded.access_mode,
  is_emergency = excluded.is_emergency,
  is_special = excluded.is_special,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

update public.event_series
set utc_interval_minutes = 360
where key = 'global-heartbeat'
  and (utc_interval_minutes is null or utc_interval_minutes <> 360);

create or replace function public.materialize_event_occurrences(
  p_horizon_start timestamptz default timezone('utc', now()) - interval '2 hours',
  p_horizon_end timestamptz default timezone('utc', now()) + interval '7 days',
  p_timezones text[] default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
begin
  if p_horizon_end <= p_horizon_start then
    raise exception 'Occurrence horizon end must be after horizon start.';
  end if;

  with profile_timezones as (
    select distinct public.resolve_valid_timezone(nullif(btrim(p.timezone), ''), p.id) as tz
    from public.profiles p
    where p.timezone is not null
      and nullif(btrim(p.timezone), '') is not null
  ),
  requested_timezones as (
    select distinct public.resolve_valid_timezone(nullif(btrim(req.tz), ''), null) as tz
    from unnest(coalesce(p_timezones, array[]::text[])) as req(tz)
    where nullif(btrim(req.tz), '') is not null
  ),
  timezone_targets as (
    select tz from requested_timezones
    union
    select tz from profile_timezones
    union
    select 'UTC'::text as tz
  ),
  viewer_local_series as (
    select
      es.id as series_id,
      es.key as series_key,
      es.local_time,
      es.default_duration_minutes,
      es.join_window_start_minutes,
      es.join_window_end_minutes,
      es.circle_id,
      es.visibility_scope,
      es.access_mode,
      es.metadata as series_metadata,
      tz.tz as display_timezone
    from public.event_series es
    join timezone_targets tz
      on true
    where es.is_active = true
      and es.schedule_type = 'local_time_daily'::public.event_schedule_type
      and es.timezone_policy = 'viewer_local'::public.event_timezone_policy
      and es.local_time is not null
  ),
  fixed_timezone_series as (
    select
      es.id as series_id,
      es.key as series_key,
      es.local_time,
      es.default_duration_minutes,
      es.join_window_start_minutes,
      es.join_window_end_minutes,
      es.circle_id,
      es.visibility_scope,
      es.access_mode,
      es.metadata as series_metadata,
      public.resolve_valid_timezone(es.local_timezone, null) as display_timezone
    from public.event_series es
    where es.is_active = true
      and es.schedule_type = 'local_time_daily'::public.event_schedule_type
      and es.timezone_policy = 'fixed_timezone'::public.event_timezone_policy
      and es.local_time is not null
      and nullif(btrim(es.local_timezone), '') is not null
  ),
  local_series_targets as (
    select * from viewer_local_series
    union all
    select * from fixed_timezone_series
  ),
  day_span as (
    select gs::date as day_value
    from generate_series(
      (p_horizon_start at time zone 'UTC')::date - 1,
      (p_horizon_end at time zone 'UTC')::date + 1,
      interval '1 day'
    ) as gs
  ),
  local_candidates as (
    select
      lst.series_id,
      lst.series_key,
      lst.default_duration_minutes,
      lst.join_window_start_minutes,
      lst.join_window_end_minutes,
      lst.circle_id,
      lst.visibility_scope,
      lst.access_mode,
      lst.series_metadata,
      lst.display_timezone,
      make_timestamptz(
        extract(year from ds.day_value)::integer,
        extract(month from ds.day_value)::integer,
        extract(day from ds.day_value)::integer,
        extract(hour from lst.local_time)::integer,
        extract(minute from lst.local_time)::integer,
        0,
        lst.display_timezone
      ) as starts_at_utc
    from local_series_targets lst
    cross join day_span ds
  ),
  local_insert as (
    insert into public.event_occurrences (
      series_id,
      occurrence_key,
      starts_at_utc,
      ends_at_utc,
      display_timezone,
      status,
      join_window_start,
      join_window_end,
      metadata
    )
    select
      lc.series_id,
      format(
        '%s|%s|%s',
        lc.series_key,
        coalesce(lc.display_timezone, 'UTC'),
        to_char(lc.starts_at_utc, 'YYYYMMDD"T"HH24MI"Z"')
      ) as occurrence_key,
      lc.starts_at_utc,
      lc.starts_at_utc + make_interval(mins => lc.default_duration_minutes),
      lc.display_timezone,
      case
        when timezone('utc', now()) >= lc.starts_at_utc + make_interval(mins => lc.default_duration_minutes)
          then 'ended'::public.event_occurrence_status
        when timezone('utc', now()) >= lc.starts_at_utc
          then 'live'::public.event_occurrence_status
        else 'scheduled'::public.event_occurrence_status
      end as status,
      lc.starts_at_utc - make_interval(mins => lc.join_window_start_minutes),
      lc.starts_at_utc + make_interval(mins => greatest(lc.join_window_end_minutes, lc.default_duration_minutes)),
      jsonb_build_object(
        'materialized_by', 'materialize_event_occurrences',
        'timezone_policy', 'local_time_daily'
      )
    from local_candidates lc
    where lc.starts_at_utc >= p_horizon_start - interval '1 day'
      and lc.starts_at_utc <= p_horizon_end + interval '1 day'
    on conflict (series_id, starts_at_utc, display_timezone) do nothing
    returning id
  ),
  utc_interval_series as (
    select
      es.id as series_id,
      es.key as series_key,
      es.default_duration_minutes,
      es.join_window_start_minutes,
      es.join_window_end_minutes,
      es.utc_interval_minutes,
      es.utc_offset_minutes
    from public.event_series es
    where es.is_active = true
      and es.schedule_type = 'utc_interval'::public.event_schedule_type
      and es.timezone_policy = 'utc'::public.event_timezone_policy
      and es.utc_interval_minutes is not null
      and es.utc_interval_minutes > 0
  ),
  utc_minute_span as (
    select gs as starts_at_utc
    from generate_series(
      date_trunc('minute', p_horizon_start - interval '1 day'),
      date_trunc('minute', p_horizon_end + interval '1 day'),
      interval '1 minute'
    ) as gs
  ),
  utc_candidates as (
    select
      us.series_id,
      us.series_key,
      us.default_duration_minutes,
      us.join_window_start_minutes,
      us.join_window_end_minutes,
      span.starts_at_utc
    from utc_interval_series us
    join utc_minute_span span
      on mod(
        ((extract(epoch from span.starts_at_utc)::bigint / 60) - us.utc_offset_minutes)::bigint,
        us.utc_interval_minutes::bigint
      ) = 0
  ),
  utc_insert as (
    insert into public.event_occurrences (
      series_id,
      occurrence_key,
      starts_at_utc,
      ends_at_utc,
      display_timezone,
      status,
      join_window_start,
      join_window_end,
      metadata
    )
    select
      uc.series_id,
      format('%s|UTC|%s', uc.series_key, to_char(uc.starts_at_utc, 'YYYYMMDD"T"HH24MI"Z"')) as occurrence_key,
      uc.starts_at_utc,
      uc.starts_at_utc + make_interval(mins => uc.default_duration_minutes),
      'UTC'::text,
      case
        when timezone('utc', now()) >= uc.starts_at_utc + make_interval(mins => uc.default_duration_minutes)
          then 'ended'::public.event_occurrence_status
        when timezone('utc', now()) >= uc.starts_at_utc
          then 'live'::public.event_occurrence_status
        else 'scheduled'::public.event_occurrence_status
      end as status,
      uc.starts_at_utc - make_interval(mins => uc.join_window_start_minutes),
      uc.starts_at_utc + make_interval(mins => greatest(uc.join_window_end_minutes, uc.default_duration_minutes)),
      jsonb_build_object(
        'materialized_by', 'materialize_event_occurrences',
        'timezone_policy', 'utc_interval'
      )
    from utc_candidates uc
    where uc.starts_at_utc >= p_horizon_start - interval '1 day'
      and uc.starts_at_utc <= p_horizon_end + interval '1 day'
    on conflict (series_id, starts_at_utc, display_timezone) do nothing
    returning id
  )
  select
    coalesce((select count(*) from local_insert), 0)
    + coalesce((select count(*) from utc_insert), 0)
  into v_inserted;

  return coalesce(v_inserted, 0);
end;
$$;

create or replace function public.refresh_event_occurrence_statuses(
  p_now timestamptz default timezone('utc', now())
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer := 0;
begin
  with updates as (
    update public.event_occurrences eo
    set status = case
      when eo.status = 'cancelled'::public.event_occurrence_status
        then eo.status
      when p_now >= eo.ends_at_utc
        then 'ended'::public.event_occurrence_status
      when p_now >= eo.starts_at_utc
        then 'live'::public.event_occurrence_status
      else 'scheduled'::public.event_occurrence_status
    end,
    updated_at = timezone('utc', now())
    where eo.status <> 'cancelled'::public.event_occurrence_status
      and eo.status is distinct from case
        when p_now >= eo.ends_at_utc
          then 'ended'::public.event_occurrence_status
        when p_now >= eo.starts_at_utc
          then 'live'::public.event_occurrence_status
        else 'scheduled'::public.event_occurrence_status
      end
    returning eo.id, eo.status
  )
  select count(*)::integer
  into v_updated
  from updates;

  update public.rooms r
  set
    status = case
      when eo.status = 'ended'::public.event_occurrence_status
        then 'ended'::public.room_status
      when eo.status = 'cancelled'::public.event_occurrence_status
        then 'locked'::public.room_status
      else 'open'::public.room_status
    end,
    ended_at = case
      when eo.status = 'ended'::public.event_occurrence_status
        then coalesce(r.ended_at, p_now)
      else null
    end,
    updated_at = timezone('utc', now())
  from public.event_occurrences eo
  where r.occurrence_id = eo.id
    and r.room_kind = 'event_occurrence'::public.room_kind
    and r.status is distinct from case
      when eo.status = 'ended'::public.event_occurrence_status
        then 'ended'::public.room_status
      when eo.status = 'cancelled'::public.event_occurrence_status
        then 'locked'::public.room_status
      else 'open'::public.room_status
    end;

  return coalesce(v_updated, 0);
end;
$$;

create or replace function public.ensure_occurrence_room_identity(
  p_occurrence_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
begin
  if p_occurrence_id is null then
    raise exception 'Occurrence id is required.';
  end if;

  insert into public.rooms (
    room_kind,
    occurrence_id,
    circle_id,
    visibility_scope,
    access_mode,
    status,
    opened_at,
    started_at,
    legacy_event_id,
    metadata
  )
  select
    'event_occurrence'::public.room_kind,
    eo.id,
    es.circle_id,
    es.visibility_scope,
    es.access_mode,
    case
      when eo.status = 'ended'::public.event_occurrence_status
        then 'ended'::public.room_status
      when eo.status = 'cancelled'::public.event_occurrence_status
        then 'locked'::public.room_status
      else 'open'::public.room_status
    end,
    eo.join_window_start,
    eo.starts_at_utc,
    eo.source_event_id,
    jsonb_build_object(
      'series_id', es.id,
      'series_key', es.key,
      'occurrence_key', eo.occurrence_key
    )
  from public.event_occurrences eo
  join public.event_series es
    on es.id = eo.series_id
  where eo.id = p_occurrence_id
  on conflict (occurrence_id) do update
  set
    circle_id = excluded.circle_id,
    visibility_scope = excluded.visibility_scope,
    access_mode = excluded.access_mode,
    status = excluded.status,
    legacy_event_id = excluded.legacy_event_id,
    metadata = excluded.metadata,
    updated_at = timezone('utc', now())
  returning id into v_room_id;

  if v_room_id is null then
    raise exception 'Occurrence not found for room identity.';
  end if;

  update public.event_occurrences eo
  set metadata = coalesce(eo.metadata, '{}'::jsonb) || jsonb_build_object('room_id', v_room_id)
  where eo.id = p_occurrence_id;

  return v_room_id;
end;
$$;

create or replace function public.ensure_legacy_event_occurrence(
  p_event_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_occurrence_id uuid;
  v_series_id uuid;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_occurrence_status public.event_occurrence_status;
begin
  if p_event_id is null then
    return null;
  end if;

  select *
  into v_event
  from public.events e
  where e.id = p_event_id
  limit 1;

  if v_event.id is null then
    return null;
  end if;

  select eo.id
  into v_occurrence_id
  from public.event_occurrences eo
  where eo.source_event_id = p_event_id
  limit 1;

  if v_occurrence_id is not null then
    perform public.ensure_occurrence_room_identity(v_occurrence_id);
    return v_occurrence_id;
  end if;

  v_starts_at := v_event.starts_at;
  v_ends_at := v_event.starts_at + make_interval(mins => greatest(1, coalesce(v_event.duration_minutes, 20)));

  v_occurrence_status := case
    when v_event.status = 'cancelled' then 'cancelled'::public.event_occurrence_status
    when v_event.status = 'completed' then 'ended'::public.event_occurrence_status
    when v_event.status = 'live' then 'live'::public.event_occurrence_status
    when timezone('utc', now()) >= v_ends_at then 'ended'::public.event_occurrence_status
    when timezone('utc', now()) >= v_starts_at then 'live'::public.event_occurrence_status
    else 'scheduled'::public.event_occurrence_status
  end;

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
    metadata,
    is_active,
    created_by
  )
  values (
    format('legacy-event-%s', replace(v_event.id::text, '-', '')),
    v_event.title,
    v_event.subtitle,
    v_event.description,
    coalesce(nullif(btrim(v_event.region), ''), 'Legacy Event'),
    coalesce(nullif(btrim(v_event.host_note), ''), 'Legacy migrated event'),
    'admin_curated'::public.event_schedule_type,
    'utc'::public.event_timezone_policy,
    greatest(1, coalesce(v_event.duration_minutes, 20)),
    30,
    180,
    case
      when v_event.visibility = 'private'
        then 'private'::public.event_visibility_scope
      else 'global'::public.event_visibility_scope
    end,
    case
      when v_event.visibility = 'private'
        then 'invite_only'::public.event_access_mode
      else 'open'::public.event_access_mode
    end,
    jsonb_build_object(
      'legacy_event_id', v_event.id,
      'legacy_host_note', v_event.host_note,
      'legacy_region', v_event.region
    ),
    true,
    v_event.created_by
  )
  on conflict (key) do update
  set
    name = excluded.name,
    subtitle = excluded.subtitle,
    description = excluded.description,
    category = excluded.category,
    purpose = excluded.purpose,
    default_duration_minutes = excluded.default_duration_minutes,
    visibility_scope = excluded.visibility_scope,
    access_mode = excluded.access_mode,
    metadata = excluded.metadata,
    is_active = true,
    updated_at = timezone('utc', now())
  returning id into v_series_id;

  insert into public.event_occurrences (
    series_id,
    occurrence_key,
    starts_at_utc,
    ends_at_utc,
    display_timezone,
    status,
    join_window_start,
    join_window_end,
    source_event_id,
    metadata
  )
  values (
    v_series_id,
    format('legacy|%s|%s', replace(v_event.id::text, '-', ''), to_char(v_starts_at, 'YYYYMMDD"T"HH24MI"Z"')),
    v_starts_at,
    v_ends_at,
    'UTC',
    v_occurrence_status,
    v_starts_at - interval '30 minutes',
    v_ends_at + interval '120 minutes',
    v_event.id,
    jsonb_build_object('legacy_event_id', v_event.id)
  )
  on conflict (source_event_id) where source_event_id is not null do update
  set
    starts_at_utc = excluded.starts_at_utc,
    ends_at_utc = excluded.ends_at_utc,
    status = excluded.status,
    join_window_start = excluded.join_window_start,
    join_window_end = excluded.join_window_end,
    metadata = excluded.metadata,
    updated_at = timezone('utc', now())
  returning id into v_occurrence_id;

  perform public.ensure_occurrence_room_identity(v_occurrence_id);

  return v_occurrence_id;
end;
$$;

do $$
declare
  rec record;
begin
  for rec in select e.id from public.events e
  loop
    perform public.ensure_legacy_event_occurrence(rec.id);
  end loop;
end;
$$;

insert into public.room_participants (
  room_id,
  user_id,
  role,
  presence_state,
  joined_at,
  last_seen_at,
  left_at,
  metadata
)
select
  r.id as room_id,
  ep.user_id,
  'participant'::public.room_participant_role,
  case
    when ep.is_active then 'active'::public.room_presence_state
    else 'left'::public.room_presence_state
  end as presence_state,
  ep.joined_at,
  ep.last_seen_at,
  case
    when ep.is_active then null
    else ep.last_seen_at
  end as left_at,
  jsonb_build_object(
    'migrated_from', 'event_participants',
    'legacy_event_id', ep.event_id
  ) as metadata
from public.event_participants ep
join public.event_occurrences eo
  on eo.source_event_id = ep.event_id
join public.rooms r
  on r.occurrence_id = eo.id
on conflict (room_id, user_id) do update
set
  presence_state = excluded.presence_state,
  last_seen_at = excluded.last_seen_at,
  left_at = excluded.left_at,
  metadata = excluded.metadata;

select public.materialize_event_occurrences(
  timezone('utc', now()) - interval '2 hours',
  timezone('utc', now()) + interval '7 days',
  null
);

select public.refresh_event_occurrence_statuses(timezone('utc', now()));

create or replace function public.get_event_occurrence_by_join_target(
  p_occurrence_id uuid default null,
  p_room_id uuid default null,
  p_occurrence_key text default null,
  p_legacy_event_id uuid default null
)
returns table (
  occurrence_id uuid,
  occurrence_key text,
  series_id uuid,
  series_key text,
  series_name text,
  series_description text,
  series_purpose text,
  category text,
  starts_at_utc timestamptz,
  ends_at_utc timestamptz,
  duration_minutes integer,
  display_timezone text,
  status text,
  visibility_scope text,
  access_mode text,
  circle_id uuid,
  room_id uuid,
  participant_count integer,
  active_participant_count integer,
  source_event_id uuid,
  series_metadata jsonb,
  occurrence_metadata jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_occurrence_id uuid := p_occurrence_id;
begin
  if v_occurrence_id is null and p_room_id is not null then
    select r.occurrence_id
    into v_occurrence_id
    from public.rooms r
    where r.id = p_room_id
    limit 1;
  end if;

  if v_occurrence_id is null and p_occurrence_key is not null and btrim(p_occurrence_key) <> '' then
    select eo.id
    into v_occurrence_id
    from public.event_occurrences eo
    where eo.occurrence_key = btrim(p_occurrence_key)
    limit 1;
  end if;

  if v_occurrence_id is null and p_legacy_event_id is not null then
    v_occurrence_id := public.ensure_legacy_event_occurrence(p_legacy_event_id);
  end if;

  if v_occurrence_id is null then
    return;
  end if;

  if not public.can_access_event_occurrence(v_occurrence_id, auth.uid()) then
    return;
  end if;

  perform public.ensure_occurrence_room_identity(v_occurrence_id);
  perform public.refresh_event_occurrence_statuses(timezone('utc', now()));

  return query
  with target as (
    select
      eo.id as occurrence_id,
      eo.occurrence_key,
      eo.series_id,
      eo.starts_at_utc,
      eo.ends_at_utc,
      eo.display_timezone,
      eo.status,
      eo.source_event_id,
      eo.metadata as occurrence_metadata,
      es.key as series_key,
      es.name as series_name,
      es.description as series_description,
      es.purpose as series_purpose,
      es.category,
      es.visibility_scope,
      es.access_mode,
      es.circle_id,
      es.metadata as series_metadata,
      greatest(
        1,
        extract(epoch from (eo.ends_at_utc - eo.starts_at_utc))::integer / 60
      ) as duration_minutes
    from public.event_occurrences eo
    join public.event_series es
      on es.id = eo.series_id
    where eo.id = v_occurrence_id
      and public.can_access_event_occurrence(eo.id, auth.uid())
  ),
  room_target as (
    select r.id as room_id, r.occurrence_id
    from public.rooms r
    where r.occurrence_id = v_occurrence_id
      and r.room_kind = 'event_occurrence'::public.room_kind
    limit 1
  ),
  participant_counts as (
    select
      rp.room_id,
      count(*)::integer as participant_count,
      count(*) filter (
        where rp.presence_state in (
          'active'::public.room_presence_state,
          'idle'::public.room_presence_state
        )
          and rp.last_seen_at >= timezone('utc', now()) - interval '90 minutes'
      )::integer as active_participant_count
    from public.room_participants rp
    join room_target rt
      on rt.room_id = rp.room_id
    where rp.presence_state in (
      'active'::public.room_presence_state,
      'idle'::public.room_presence_state
    )
    group by rp.room_id
  )
  select
    t.occurrence_id,
    t.occurrence_key,
    t.series_id,
    t.series_key,
    t.series_name,
    t.series_description,
    t.series_purpose,
    t.category,
    t.starts_at_utc,
    t.ends_at_utc,
    t.duration_minutes,
    t.display_timezone,
    t.status::text as status,
    t.visibility_scope::text as visibility_scope,
    t.access_mode::text as access_mode,
    t.circle_id,
    rt.room_id,
    coalesce(pc.participant_count, 0) as participant_count,
    coalesce(pc.active_participant_count, 0) as active_participant_count,
    t.source_event_id,
    t.series_metadata,
    t.occurrence_metadata
  from target t
  left join room_target rt
    on rt.occurrence_id = t.occurrence_id
  left join participant_counts pc
    on pc.room_id = rt.room_id;
end;
$$;

create or replace function public.get_event_occurrence(
  p_occurrence_id uuid
)
returns table (
  occurrence_id uuid,
  occurrence_key text,
  series_id uuid,
  series_key text,
  series_name text,
  series_description text,
  series_purpose text,
  category text,
  starts_at_utc timestamptz,
  ends_at_utc timestamptz,
  duration_minutes integer,
  display_timezone text,
  status text,
  visibility_scope text,
  access_mode text,
  circle_id uuid,
  room_id uuid,
  participant_count integer,
  active_participant_count integer,
  source_event_id uuid,
  series_metadata jsonb,
  occurrence_metadata jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.get_event_occurrence_by_join_target(
    p_occurrence_id => p_occurrence_id,
    p_room_id => null,
    p_occurrence_key => null,
    p_legacy_event_id => null
  );
$$;

create or replace function public.list_event_feed(
  p_horizon_hours integer default 72,
  p_timezone text default null
)
returns table (
  occurrence_id uuid,
  occurrence_key text,
  series_id uuid,
  series_key text,
  series_name text,
  series_description text,
  series_purpose text,
  category text,
  starts_at_utc timestamptz,
  ends_at_utc timestamptz,
  duration_minutes integer,
  display_timezone text,
  status text,
  visibility_scope text,
  access_mode text,
  circle_id uuid,
  room_id uuid,
  participant_count integer,
  active_participant_count integer,
  source_event_id uuid,
  series_metadata jsonb,
  occurrence_metadata jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_horizon integer := greatest(1, least(coalesce(p_horizon_hours, 72), 336));
  v_timezone text := public.resolve_valid_timezone(p_timezone, auth.uid());
begin
  perform public.materialize_event_occurrences(
    p_horizon_start => v_now - interval '2 hours',
    p_horizon_end => v_now + make_interval(hours => v_horizon),
    p_timezones => array[v_timezone, 'UTC']
  );

  perform public.refresh_event_occurrence_statuses(v_now);

  return query
  with visible as (
    select
      eo.id as occurrence_id,
      eo.occurrence_key,
      eo.series_id,
      eo.starts_at_utc,
      eo.ends_at_utc,
      eo.display_timezone,
      eo.status,
      eo.source_event_id,
      eo.metadata as occurrence_metadata,
      es.key as series_key,
      es.name as series_name,
      es.description as series_description,
      es.purpose as series_purpose,
      es.category,
      es.visibility_scope,
      es.access_mode,
      es.circle_id,
      es.metadata as series_metadata,
      es.timezone_policy,
      greatest(
        1,
        extract(epoch from (eo.ends_at_utc - eo.starts_at_utc))::integer / 60
      ) as duration_minutes
    from public.event_occurrences eo
    join public.event_series es
      on es.id = eo.series_id
    where es.is_active = true
      and eo.status <> 'cancelled'::public.event_occurrence_status
      and eo.ends_at_utc > v_now - interval '2 hours'
      and eo.starts_at_utc <= v_now + make_interval(hours => v_horizon)
      and public.can_access_event_occurrence(eo.id, auth.uid())
      and (
        es.timezone_policy <> 'viewer_local'::public.event_timezone_policy
        or eo.display_timezone = v_timezone
      )
  ),
  ensured_rooms as (
    select
      v.occurrence_id,
      public.ensure_occurrence_room_identity(v.occurrence_id) as room_id
    from visible v
  ),
  room_target as (
    select
      er.room_id,
      er.occurrence_id
    from ensured_rooms er
  ),
  participant_counts as (
    select
      rp.room_id,
      count(*)::integer as participant_count,
      count(*) filter (
        where rp.presence_state in (
          'active'::public.room_presence_state,
          'idle'::public.room_presence_state
        )
          and rp.last_seen_at >= v_now - interval '90 minutes'
      )::integer as active_participant_count
    from public.room_participants rp
    join room_target rt
      on rt.room_id = rp.room_id
    where rp.presence_state in (
      'active'::public.room_presence_state,
      'idle'::public.room_presence_state
    )
    group by rp.room_id
  )
  select
    v.occurrence_id,
    v.occurrence_key,
    v.series_id,
    v.series_key,
    v.series_name,
    v.series_description,
    v.series_purpose,
    v.category,
    v.starts_at_utc,
    v.ends_at_utc,
    v.duration_minutes,
    v.display_timezone,
    v.status::text as status,
    v.visibility_scope::text as visibility_scope,
    v.access_mode::text as access_mode,
    v.circle_id,
    rt.room_id,
    coalesce(pc.participant_count, 0) as participant_count,
    coalesce(pc.active_participant_count, 0) as active_participant_count,
    v.source_event_id,
    v.series_metadata,
    v.occurrence_metadata
  from visible v
  left join room_target rt
    on rt.occurrence_id = v.occurrence_id
  left join participant_counts pc
    on pc.room_id = rt.room_id
  order by
    case v.status
      when 'live'::public.event_occurrence_status then 0
      when 'scheduled'::public.event_occurrence_status then 1
      else 2
    end,
    v.starts_at_utc asc;
end;
$$;

create or replace function public.ensure_joinable_occurrence_room(
  p_occurrence_id uuid default null,
  p_room_id uuid default null,
  p_occurrence_key text default null,
  p_legacy_event_id uuid default null
)
returns table (
  room_id uuid,
  occurrence_id uuid,
  occurrence_key text,
  series_id uuid,
  starts_at_utc timestamptz,
  ends_at_utc timestamptz,
  join_window_start timestamptz,
  join_window_end timestamptz,
  status text,
  participant_count integer,
  active_participant_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_occurrence_id uuid;
  v_room_id uuid;
  v_now timestamptz := timezone('utc', now());
begin
  if p_occurrence_id is not null then
    v_occurrence_id := p_occurrence_id;
  elsif p_room_id is not null then
    select r.occurrence_id
    into v_occurrence_id
    from public.rooms r
    where r.id = p_room_id
    limit 1;
  elsif p_occurrence_key is not null and btrim(p_occurrence_key) <> '' then
    select eo.id
    into v_occurrence_id
    from public.event_occurrences eo
    where eo.occurrence_key = btrim(p_occurrence_key)
    limit 1;
  elsif p_legacy_event_id is not null then
    v_occurrence_id := public.ensure_legacy_event_occurrence(p_legacy_event_id);
  end if;

  if v_occurrence_id is null then
    raise exception 'Unable to resolve a target occurrence for room join.';
  end if;

  if not public.can_access_event_occurrence(v_occurrence_id, auth.uid()) then
    raise exception 'You do not have access to this occurrence.';
  end if;

  perform public.refresh_event_occurrence_statuses(v_now);

  if exists (
    select 1
    from public.event_occurrences eo
    where eo.id = v_occurrence_id
      and (
        eo.status = 'cancelled'::public.event_occurrence_status
        or eo.status = 'ended'::public.event_occurrence_status
        or v_now > eo.join_window_end
        or v_now < eo.join_window_start
      )
  ) then
    raise exception 'This occurrence is not currently joinable.';
  end if;

  v_room_id := public.ensure_occurrence_room_identity(v_occurrence_id);

  return query
  with presence as (
    select
      count(*)::integer as participant_count,
      count(*) filter (
        where rp.presence_state in (
          'active'::public.room_presence_state,
          'idle'::public.room_presence_state
        )
          and rp.last_seen_at >= v_now - interval '90 minutes'
      )::integer as active_participant_count
    from public.room_participants rp
    where rp.room_id = v_room_id
      and rp.presence_state in (
        'active'::public.room_presence_state,
        'idle'::public.room_presence_state
      )
  )
  select
    v_room_id as room_id,
    eo.id as occurrence_id,
    eo.occurrence_key,
    eo.series_id,
    eo.starts_at_utc,
    eo.ends_at_utc,
    eo.join_window_start,
    eo.join_window_end,
    eo.status::text as status,
    coalesce(p.participant_count, 0) as participant_count,
    coalesce(p.active_participant_count, 0) as active_participant_count
  from public.event_occurrences eo
  left join presence p
    on true
  where eo.id = v_occurrence_id;
end;
$$;

create or replace function public.join_event_room(
  p_occurrence_id uuid default null,
  p_room_id uuid default null,
  p_occurrence_key text default null,
  p_legacy_event_id uuid default null
)
returns table (
  room_id uuid,
  occurrence_id uuid,
  participant_count integer,
  active_participant_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_room_id uuid;
  v_occurrence_id uuid;
  v_now timestamptz := timezone('utc', now());
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  select ensured.room_id, ensured.occurrence_id
  into v_room_id, v_occurrence_id
  from public.ensure_joinable_occurrence_room(
    p_occurrence_id => p_occurrence_id,
    p_room_id => p_room_id,
    p_occurrence_key => p_occurrence_key,
    p_legacy_event_id => p_legacy_event_id
  ) ensured
  limit 1;

  insert into public.room_participants (
    room_id,
    user_id,
    role,
    presence_state,
    joined_at,
    last_seen_at,
    left_at,
    metadata
  )
  values (
    v_room_id,
    v_user_id,
    'participant'::public.room_participant_role,
    'active'::public.room_presence_state,
    v_now,
    v_now,
    null,
    jsonb_build_object('joined_via', 'join_event_room')
  )
  on conflict on constraint room_participants_pkey do update
  set
    presence_state = 'active'::public.room_presence_state,
    last_seen_at = excluded.last_seen_at,
    left_at = null,
    metadata = coalesce(public.room_participants.metadata, '{}'::jsonb) || excluded.metadata;

  return query
  select
    summary.room_id,
    summary.occurrence_id,
    summary.participant_count,
    summary.active_participant_count
  from public.get_room_presence_summary(v_room_id) summary;
end;
$$;

create or replace function public.leave_event_room(
  p_occurrence_id uuid default null,
  p_room_id uuid default null,
  p_occurrence_key text default null,
  p_legacy_event_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_room_id uuid := p_room_id;
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  if v_room_id is null and p_occurrence_id is not null then
    select r.id
    into v_room_id
    from public.rooms r
    where r.occurrence_id = p_occurrence_id
      and r.room_kind = 'event_occurrence'::public.room_kind
    limit 1;
  end if;

  if v_room_id is null and p_occurrence_key is not null and btrim(p_occurrence_key) <> '' then
    select r.id
    into v_room_id
    from public.rooms r
    join public.event_occurrences eo
      on eo.id = r.occurrence_id
    where eo.occurrence_key = btrim(p_occurrence_key)
      and r.room_kind = 'event_occurrence'::public.room_kind
    limit 1;
  end if;

  if v_room_id is null and p_legacy_event_id is not null then
    select r.id
    into v_room_id
    from public.rooms r
    where r.legacy_event_id = p_legacy_event_id
      and r.room_kind = 'event_occurrence'::public.room_kind
    limit 1;
  end if;

  if v_room_id is null then
    return;
  end if;

  update public.room_participants rp
  set
    presence_state = 'left'::public.room_presence_state,
    last_seen_at = timezone('utc', now()),
    left_at = timezone('utc', now()),
    metadata = coalesce(rp.metadata, '{}'::jsonb) || jsonb_build_object('left_via', 'leave_event_room')
  where rp.room_id = v_room_id
    and rp.user_id = v_user_id;
end;
$$;

create or replace function public.refresh_event_room_presence(
  p_occurrence_id uuid default null,
  p_room_id uuid default null,
  p_occurrence_key text default null,
  p_legacy_event_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_room_id uuid := p_room_id;
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  if v_room_id is null and p_occurrence_id is not null then
    select r.id
    into v_room_id
    from public.rooms r
    where r.occurrence_id = p_occurrence_id
      and r.room_kind = 'event_occurrence'::public.room_kind
    limit 1;
  end if;

  if v_room_id is null and p_occurrence_key is not null and btrim(p_occurrence_key) <> '' then
    select r.id
    into v_room_id
    from public.rooms r
    join public.event_occurrences eo
      on eo.id = r.occurrence_id
    where eo.occurrence_key = btrim(p_occurrence_key)
      and r.room_kind = 'event_occurrence'::public.room_kind
    limit 1;
  end if;

  if v_room_id is null and p_legacy_event_id is not null then
    select r.id
    into v_room_id
    from public.rooms r
    where r.legacy_event_id = p_legacy_event_id
      and r.room_kind = 'event_occurrence'::public.room_kind
    limit 1;
  end if;

  if v_room_id is null then
    return;
  end if;

  update public.room_participants rp
  set
    presence_state = 'active'::public.room_presence_state,
    last_seen_at = timezone('utc', now()),
    left_at = null,
    metadata = coalesce(rp.metadata, '{}'::jsonb) || jsonb_build_object('refreshed_via', 'refresh_event_room_presence')
  where rp.room_id = v_room_id
    and rp.user_id = v_user_id
    and rp.presence_state <> 'left'::public.room_presence_state;
end;
$$;

create or replace function public.list_room_participants(
  p_room_id uuid,
  p_active_only boolean default false
)
returns table (
  room_id uuid,
  user_id uuid,
  display_name text,
  role text,
  presence_state text,
  joined_at timestamptz,
  last_seen_at timestamptz,
  left_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_room_id is null then
    raise exception 'Room id is required.';
  end if;

  if not public.can_access_room(p_room_id, auth.uid()) then
    raise exception 'You do not have access to this room.';
  end if;

  return query
  select
    rp.room_id,
    rp.user_id,
    coalesce(nullif(btrim(p.display_name), ''), 'Member') as display_name,
    rp.role::text as role,
    rp.presence_state::text as presence_state,
    rp.joined_at,
    rp.last_seen_at,
    rp.left_at
  from public.room_participants rp
  left join public.profiles p
    on p.id = rp.user_id
  where rp.room_id = p_room_id
    and (
      not p_active_only
      or rp.presence_state in (
        'active'::public.room_presence_state,
        'idle'::public.room_presence_state
      )
    )
  order by
    case rp.role
      when 'host'::public.room_participant_role then 0
      when 'moderator'::public.room_participant_role then 1
      else 2
    end,
    rp.joined_at asc;
end;
$$;

create or replace function public.get_room_presence_summary(
  p_room_id uuid
)
returns table (
  room_id uuid,
  occurrence_id uuid,
  participant_count integer,
  active_participant_count integer,
  last_activity_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_room_id is null then
    raise exception 'Room id is required.';
  end if;

  if not public.can_access_room(p_room_id, auth.uid()) then
    raise exception 'You do not have access to this room.';
  end if;

  return query
  select
    r.id as room_id,
    r.occurrence_id,
    count(rp.*)::integer as participant_count,
    count(rp.*) filter (
      where rp.presence_state in (
        'active'::public.room_presence_state,
        'idle'::public.room_presence_state
      )
        and rp.last_seen_at >= timezone('utc', now()) - interval '90 minutes'
    )::integer as active_participant_count,
    max(rp.last_seen_at) as last_activity_at
  from public.rooms r
  left join public.room_participants rp
    on rp.room_id = r.id
    and rp.presence_state in (
      'active'::public.room_presence_state,
      'idle'::public.room_presence_state
    )
  where r.id = p_room_id
  group by r.id, r.occurrence_id;
end;
$$;

create or replace function public.list_active_occurrence_presence(
  p_active_window_minutes integer default 15
)
returns table (
  occurrence_id uuid,
  room_id uuid,
  user_id uuid,
  last_seen_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    r.occurrence_id,
    rp.room_id,
    rp.user_id,
    rp.last_seen_at
  from public.room_participants rp
  join public.rooms r
    on r.id = rp.room_id
  where r.room_kind = 'event_occurrence'::public.room_kind
    and r.occurrence_id is not null
    and rp.presence_state in (
      'active'::public.room_presence_state,
      'idle'::public.room_presence_state
    )
    and rp.last_seen_at >= timezone('utc', now()) - make_interval(mins => greatest(1, least(coalesce(p_active_window_minutes, 15), 240)))
    and public.can_access_room(r.id, auth.uid());
$$;

create or replace function public.save_event_reminder_preference(
  p_target_type public.event_reminder_target_type,
  p_series_id uuid default null,
  p_occurrence_id uuid default null,
  p_room_id uuid default null,
  p_enabled boolean default true,
  p_channel text default 'push',
  p_lead_minutes integer default 15
)
returns table (
  reminder_id uuid,
  user_id uuid,
  target_type text,
  series_id uuid,
  occurrence_id uuid,
  room_id uuid,
  enabled boolean,
  channel text,
  lead_minutes integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  if p_target_type = 'series'::public.event_reminder_target_type and p_series_id is not null then
    if not public.can_access_event_series(p_series_id, v_user_id) then
      raise exception 'You do not have access to this series reminder target.';
    end if;
  elsif p_target_type = 'occurrence'::public.event_reminder_target_type and p_occurrence_id is not null then
    if not public.can_access_event_occurrence(p_occurrence_id, v_user_id) then
      raise exception 'You do not have access to this occurrence reminder target.';
    end if;
  elsif p_target_type = 'room'::public.event_reminder_target_type and p_room_id is not null then
    if not public.can_access_room(p_room_id, v_user_id) then
      raise exception 'You do not have access to this room reminder target.';
    end if;
  end if;

  if p_target_type = 'series'::public.event_reminder_target_type then
    update public.event_reminder_preferences pref
    set
      enabled = p_enabled,
      channel = coalesce(nullif(btrim(p_channel), ''), 'push'),
      lead_minutes = greatest(0, least(coalesce(p_lead_minutes, 15), 1440)),
      updated_at = timezone('utc', now())
    where pref.user_id = v_user_id
      and pref.target_type = 'series'::public.event_reminder_target_type
      and pref.series_id = p_series_id
    returning pref.id into v_id;

    if v_id is null then
      begin
        insert into public.event_reminder_preferences (
          user_id,
          target_type,
          series_id,
          enabled,
          channel,
          lead_minutes
        )
        values (
          v_user_id,
          p_target_type,
          p_series_id,
          p_enabled,
          coalesce(nullif(btrim(p_channel), ''), 'push'),
          greatest(0, least(coalesce(p_lead_minutes, 15), 1440))
        )
        returning id into v_id;
      exception
        when unique_violation then
          update public.event_reminder_preferences pref
          set
            enabled = p_enabled,
            channel = coalesce(nullif(btrim(p_channel), ''), 'push'),
            lead_minutes = greatest(0, least(coalesce(p_lead_minutes, 15), 1440)),
            updated_at = timezone('utc', now())
          where pref.user_id = v_user_id
            and pref.target_type = 'series'::public.event_reminder_target_type
            and pref.series_id = p_series_id
          returning pref.id into v_id;
      end;
    end if;
  elsif p_target_type = 'occurrence'::public.event_reminder_target_type then
    update public.event_reminder_preferences pref
    set
      enabled = p_enabled,
      channel = coalesce(nullif(btrim(p_channel), ''), 'push'),
      lead_minutes = greatest(0, least(coalesce(p_lead_minutes, 15), 1440)),
      updated_at = timezone('utc', now())
    where pref.user_id = v_user_id
      and pref.target_type = 'occurrence'::public.event_reminder_target_type
      and pref.occurrence_id = p_occurrence_id
    returning pref.id into v_id;

    if v_id is null then
      begin
        insert into public.event_reminder_preferences (
          user_id,
          target_type,
          occurrence_id,
          enabled,
          channel,
          lead_minutes
        )
        values (
          v_user_id,
          p_target_type,
          p_occurrence_id,
          p_enabled,
          coalesce(nullif(btrim(p_channel), ''), 'push'),
          greatest(0, least(coalesce(p_lead_minutes, 15), 1440))
        )
        returning id into v_id;
      exception
        when unique_violation then
          update public.event_reminder_preferences pref
          set
            enabled = p_enabled,
            channel = coalesce(nullif(btrim(p_channel), ''), 'push'),
            lead_minutes = greatest(0, least(coalesce(p_lead_minutes, 15), 1440)),
            updated_at = timezone('utc', now())
          where pref.user_id = v_user_id
            and pref.target_type = 'occurrence'::public.event_reminder_target_type
            and pref.occurrence_id = p_occurrence_id
          returning pref.id into v_id;
      end;
    end if;
  else
    update public.event_reminder_preferences pref
    set
      enabled = p_enabled,
      channel = coalesce(nullif(btrim(p_channel), ''), 'push'),
      lead_minutes = greatest(0, least(coalesce(p_lead_minutes, 15), 1440)),
      updated_at = timezone('utc', now())
    where pref.user_id = v_user_id
      and pref.target_type = 'room'::public.event_reminder_target_type
      and pref.room_id = p_room_id
    returning pref.id into v_id;

    if v_id is null then
      begin
        insert into public.event_reminder_preferences (
          user_id,
          target_type,
          room_id,
          enabled,
          channel,
          lead_minutes
        )
        values (
          v_user_id,
          p_target_type,
          p_room_id,
          p_enabled,
          coalesce(nullif(btrim(p_channel), ''), 'push'),
          greatest(0, least(coalesce(p_lead_minutes, 15), 1440))
        )
        returning id into v_id;
      exception
        when unique_violation then
          update public.event_reminder_preferences pref
          set
            enabled = p_enabled,
            channel = coalesce(nullif(btrim(p_channel), ''), 'push'),
            lead_minutes = greatest(0, least(coalesce(p_lead_minutes, 15), 1440)),
            updated_at = timezone('utc', now())
          where pref.user_id = v_user_id
            and pref.target_type = 'room'::public.event_reminder_target_type
            and pref.room_id = p_room_id
          returning pref.id into v_id;
      end;
    end if;
  end if;

  return query
  select
    pref.id as reminder_id,
    pref.user_id,
    pref.target_type::text as target_type,
    pref.series_id,
    pref.occurrence_id,
    pref.room_id,
    pref.enabled,
    pref.channel,
    pref.lead_minutes
  from public.event_reminder_preferences pref
  where pref.id = v_id
  limit 1;
end;
$$;

create or replace function public.admin_trigger_event_occurrence(
  p_series_key text,
  p_starts_at_utc timestamptz default timezone('utc', now()),
  p_duration_minutes integer default null,
  p_display_timezone text default 'UTC',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_series public.event_series%rowtype;
  v_occurrence_id uuid;
  v_duration integer;
  v_starts_at timestamptz := coalesce(p_starts_at_utc, timezone('utc', now()));
  v_display_timezone text := public.resolve_valid_timezone(p_display_timezone, null);
begin
  if p_series_key is null or btrim(p_series_key) = '' then
    raise exception 'Series key is required.';
  end if;

  select *
  into v_series
  from public.event_series es
  where es.key = btrim(p_series_key)
  limit 1;

  if v_series.id is null then
    raise exception 'Series key not found: %', p_series_key;
  end if;

  if v_series.schedule_type not in (
    'manual_trigger'::public.event_schedule_type,
    'admin_curated'::public.event_schedule_type
  ) then
    raise exception 'Series % is not manual/admin-curated triggerable.', p_series_key;
  end if;

  v_duration := greatest(1, coalesce(p_duration_minutes, v_series.default_duration_minutes));

  insert into public.event_occurrences (
    series_id,
    occurrence_key,
    starts_at_utc,
    ends_at_utc,
    display_timezone,
    status,
    join_window_start,
    join_window_end,
    metadata
  )
  values (
    v_series.id,
    format('%s|manual|%s', v_series.key, to_char(v_starts_at, 'YYYYMMDD"T"HH24MI"Z"')),
    v_starts_at,
    v_starts_at + make_interval(mins => v_duration),
    v_display_timezone,
    case
      when timezone('utc', now()) >= v_starts_at + make_interval(mins => v_duration)
        then 'ended'::public.event_occurrence_status
      when timezone('utc', now()) >= v_starts_at
        then 'live'::public.event_occurrence_status
      else 'scheduled'::public.event_occurrence_status
    end,
    v_starts_at - make_interval(mins => v_series.join_window_start_minutes),
    v_starts_at + make_interval(mins => greatest(v_series.join_window_end_minutes, v_duration)),
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('triggered_by', auth.uid())
  )
  on conflict (occurrence_key) do update
  set
    starts_at_utc = excluded.starts_at_utc,
    ends_at_utc = excluded.ends_at_utc,
    display_timezone = excluded.display_timezone,
    status = excluded.status,
    join_window_start = excluded.join_window_start,
    join_window_end = excluded.join_window_end,
    metadata = excluded.metadata,
    updated_at = timezone('utc', now())
  returning id into v_occurrence_id;

  perform public.ensure_occurrence_room_identity(v_occurrence_id);

  return v_occurrence_id;
end;
$$;

revoke all on function public.resolve_valid_timezone(text, uuid) from public;
revoke all on function public.can_access_event_series(uuid, uuid) from public;
revoke all on function public.can_access_event_occurrence(uuid, uuid) from public;
revoke all on function public.can_access_room(uuid, uuid) from public;
revoke all on function public.can_join_room(uuid, uuid) from public;
revoke all on function public.materialize_event_occurrences(timestamptz, timestamptz, text[]) from public;
revoke all on function public.refresh_event_occurrence_statuses(timestamptz) from public;
revoke all on function public.ensure_occurrence_room_identity(uuid) from public;
revoke all on function public.ensure_legacy_event_occurrence(uuid) from public;
revoke all on function public.get_event_occurrence_by_join_target(uuid, uuid, text, uuid) from public;
revoke all on function public.get_event_occurrence(uuid) from public;
revoke all on function public.list_event_feed(integer, text) from public;
revoke all on function public.ensure_joinable_occurrence_room(uuid, uuid, text, uuid) from public;
revoke all on function public.join_event_room(uuid, uuid, text, uuid) from public;
revoke all on function public.leave_event_room(uuid, uuid, text, uuid) from public;
revoke all on function public.refresh_event_room_presence(uuid, uuid, text, uuid) from public;
revoke all on function public.list_room_participants(uuid, boolean) from public;
revoke all on function public.get_room_presence_summary(uuid) from public;
revoke all on function public.list_active_occurrence_presence(integer) from public;
revoke all on function public.save_event_reminder_preference(
  public.event_reminder_target_type,
  uuid,
  uuid,
  uuid,
  boolean,
  text,
  integer
) from public;
revoke all on function public.admin_trigger_event_occurrence(
  text,
  timestamptz,
  integer,
  text,
  jsonb
) from public;

revoke execute on function public.resolve_valid_timezone(text, uuid) from anon;
revoke execute on function public.can_access_event_series(uuid, uuid) from anon;
revoke execute on function public.can_access_event_occurrence(uuid, uuid) from anon;
revoke execute on function public.can_access_room(uuid, uuid) from anon;
revoke execute on function public.can_join_room(uuid, uuid) from anon;
revoke execute on function public.materialize_event_occurrences(timestamptz, timestamptz, text[]) from anon;
revoke execute on function public.refresh_event_occurrence_statuses(timestamptz) from anon;
revoke execute on function public.ensure_occurrence_room_identity(uuid) from anon;
revoke execute on function public.ensure_legacy_event_occurrence(uuid) from anon;
revoke execute on function public.get_event_occurrence_by_join_target(uuid, uuid, text, uuid) from anon;
revoke execute on function public.get_event_occurrence(uuid) from anon;
revoke execute on function public.list_event_feed(integer, text) from anon;
revoke execute on function public.ensure_joinable_occurrence_room(uuid, uuid, text, uuid) from anon;
revoke execute on function public.join_event_room(uuid, uuid, text, uuid) from anon;
revoke execute on function public.leave_event_room(uuid, uuid, text, uuid) from anon;
revoke execute on function public.refresh_event_room_presence(uuid, uuid, text, uuid) from anon;
revoke execute on function public.list_room_participants(uuid, boolean) from anon;
revoke execute on function public.get_room_presence_summary(uuid) from anon;
revoke execute on function public.list_active_occurrence_presence(integer) from anon;
revoke execute on function public.save_event_reminder_preference(
  public.event_reminder_target_type,
  uuid,
  uuid,
  uuid,
  boolean,
  text,
  integer
) from anon;
revoke execute on function public.admin_trigger_event_occurrence(
  text,
  timestamptz,
  integer,
  text,
  jsonb
) from anon;
revoke execute on function public.admin_trigger_event_occurrence(
  text,
  timestamptz,
  integer,
  text,
  jsonb
) from authenticated;

grant execute on function public.resolve_valid_timezone(text, uuid) to authenticated;
grant execute on function public.can_access_event_series(uuid, uuid) to authenticated;
grant execute on function public.can_access_event_occurrence(uuid, uuid) to authenticated;
grant execute on function public.can_access_room(uuid, uuid) to authenticated;
grant execute on function public.can_join_room(uuid, uuid) to authenticated;
grant execute on function public.materialize_event_occurrences(timestamptz, timestamptz, text[]) to authenticated;
grant execute on function public.refresh_event_occurrence_statuses(timestamptz) to authenticated;
grant execute on function public.ensure_occurrence_room_identity(uuid) to authenticated;
grant execute on function public.ensure_legacy_event_occurrence(uuid) to authenticated;
grant execute on function public.get_event_occurrence_by_join_target(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.get_event_occurrence(uuid) to authenticated;
grant execute on function public.list_event_feed(integer, text) to authenticated;
grant execute on function public.ensure_joinable_occurrence_room(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.join_event_room(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.leave_event_room(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.refresh_event_room_presence(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.list_room_participants(uuid, boolean) to authenticated;
grant execute on function public.get_room_presence_summary(uuid) to authenticated;
grant execute on function public.list_active_occurrence_presence(integer) to authenticated;
grant execute on function public.save_event_reminder_preference(
  public.event_reminder_target_type,
  uuid,
  uuid,
  uuid,
  boolean,
  text,
  integer
) to authenticated;
grant execute on function public.admin_trigger_event_occurrence(
  text,
  timestamptz,
  integer,
  text,
  jsonb
) to service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'event_occurrences'
    ) then
      execute 'alter publication supabase_realtime add table public.event_occurrences';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'rooms'
    ) then
      execute 'alter publication supabase_realtime add table public.rooms';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'room_participants'
    ) then
      execute 'alter publication supabase_realtime add table public.room_participants';
    end if;
  end if;
end
$$;
