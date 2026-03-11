create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t
      on t.oid = e.enumtypid
    where t.typnamespace = 'public'::regnamespace
      and t.typname = 'event_schedule_type'
      and e.enumlabel = 'lunar_phase'
  ) then
    alter type public.event_schedule_type add value 'lunar_phase';
  end if;
end
$$;

create table if not exists public.event_cleanup_archives (
  id bigint generated always as identity primary key,
  archive_batch text not null,
  source_table text not null,
  source_pk text not null,
  payload jsonb not null,
  archive_reason text not null,
  archived_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists event_cleanup_archives_source_pk_idx
on public.event_cleanup_archives(source_table, source_pk);

create index if not exists event_cleanup_archives_batch_idx
on public.event_cleanup_archives(archive_batch, archived_at desc);

create table if not exists public.lunar_phase_reference (
  id uuid primary key default gen_random_uuid(),
  phase_type text not null check (phase_type in ('full_moon', 'new_moon')),
  accepted_name text not null,
  occurs_at_utc timestamptz not null,
  source_label text not null,
  source_year integer,
  source_payload jsonb not null default '{}'::jsonb,
  has_lunar_eclipse boolean not null default false,
  eclipse_label text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (phase_type, occurs_at_utc)
);

create index if not exists lunar_phase_reference_occurs_idx
on public.lunar_phase_reference(occurs_at_utc);

create index if not exists lunar_phase_reference_phase_occurs_idx
on public.lunar_phase_reference(phase_type, occurs_at_utc);

drop trigger if exists lunar_phase_reference_set_updated_at on public.lunar_phase_reference;
create trigger lunar_phase_reference_set_updated_at
before update on public.lunar_phase_reference
for each row
execute function public.handle_updated_at();

insert into public.lunar_phase_reference (
  phase_type,
  accepted_name,
  occurs_at_utc,
  source_label,
  source_year,
  source_payload
)
values
  ('full_moon','Wolf Moon','2026-01-03T10:03:00Z','USNO Moon Phases API',2026,'{"day":3,"month":1,"phase":"Full Moon","time":"10:03","year":2026}'::jsonb),
  ('new_moon','New Moon','2026-01-18T19:52:00Z','USNO Moon Phases API',2026,'{"day":18,"month":1,"phase":"New Moon","time":"19:52","year":2026}'::jsonb),
  ('full_moon','Snow Moon','2026-02-01T22:09:00Z','USNO Moon Phases API',2026,'{"day":1,"month":2,"phase":"Full Moon","time":"22:09","year":2026}'::jsonb),
  ('new_moon','New Moon','2026-02-17T12:01:00Z','USNO Moon Phases API',2026,'{"day":17,"month":2,"phase":"New Moon","time":"12:01","year":2026}'::jsonb),
  ('full_moon','Worm Moon','2026-03-03T11:38:00Z','USNO Moon Phases API',2026,'{"day":3,"month":3,"phase":"Full Moon","time":"11:38","year":2026}'::jsonb),
  ('new_moon','New Moon','2026-03-19T01:23:00Z','USNO Moon Phases API',2026,'{"day":19,"month":3,"phase":"New Moon","time":"01:23","year":2026}'::jsonb),
  ('full_moon','Pink Moon','2026-04-02T02:12:00Z','USNO Moon Phases API',2026,'{"day":2,"month":4,"phase":"Full Moon","time":"02:12","year":2026}'::jsonb),
  ('new_moon','New Moon','2026-04-17T11:52:00Z','USNO Moon Phases API',2026,'{"day":17,"month":4,"phase":"New Moon","time":"11:52","year":2026}'::jsonb),
  ('full_moon','Flower Moon','2026-05-01T17:23:00Z','USNO Moon Phases API',2026,'{"day":1,"month":5,"phase":"Full Moon","time":"17:23","year":2026}'::jsonb),
  ('new_moon','New Moon','2026-05-16T20:01:00Z','USNO Moon Phases API',2026,'{"day":16,"month":5,"phase":"New Moon","time":"20:01","year":2026}'::jsonb),
  ('full_moon','Flower Moon','2026-05-31T08:45:00Z','USNO Moon Phases API',2026,'{"day":31,"month":5,"phase":"Full Moon","time":"08:45","year":2026}'::jsonb),
  ('new_moon','New Moon','2026-06-15T02:54:00Z','USNO Moon Phases API',2026,'{"day":15,"month":6,"phase":"New Moon","time":"02:54","year":2026}'::jsonb),
  ('full_moon','Strawberry Moon','2026-06-29T23:56:00Z','USNO Moon Phases API',2026,'{"day":29,"month":6,"phase":"Full Moon","time":"23:56","year":2026}'::jsonb),
  ('new_moon','New Moon','2026-07-14T09:43:00Z','USNO Moon Phases API',2026,'{"day":14,"month":7,"phase":"New Moon","time":"09:43","year":2026}'::jsonb),
  ('full_moon','Buck Moon','2026-07-29T14:36:00Z','USNO Moon Phases API',2026,'{"day":29,"month":7,"phase":"Full Moon","time":"14:36","year":2026}'::jsonb),
  ('new_moon','New Moon','2026-08-12T17:37:00Z','USNO Moon Phases API',2026,'{"day":12,"month":8,"phase":"New Moon","time":"17:37","year":2026}'::jsonb),
  ('full_moon','Sturgeon Moon','2026-08-28T04:18:00Z','USNO Moon Phases API',2026,'{"day":28,"month":8,"phase":"Full Moon","time":"04:18","year":2026}'::jsonb),
  ('new_moon','New Moon','2026-09-11T03:27:00Z','USNO Moon Phases API',2026,'{"day":11,"month":9,"phase":"New Moon","time":"03:27","year":2026}'::jsonb),
  ('full_moon','Harvest Moon','2026-09-26T16:49:00Z','USNO Moon Phases API',2026,'{"day":26,"month":9,"phase":"Full Moon","time":"16:49","year":2026}'::jsonb),
  ('new_moon','New Moon','2026-10-10T15:50:00Z','USNO Moon Phases API',2026,'{"day":10,"month":10,"phase":"New Moon","time":"15:50","year":2026}'::jsonb),
  ('full_moon','Hunter''s Moon','2026-10-26T04:12:00Z','USNO Moon Phases API',2026,'{"day":26,"month":10,"phase":"Full Moon","time":"04:12","year":2026}'::jsonb),
  ('new_moon','New Moon','2026-11-09T07:02:00Z','USNO Moon Phases API',2026,'{"day":9,"month":11,"phase":"New Moon","time":"07:02","year":2026}'::jsonb),
  ('full_moon','Beaver Moon','2026-11-24T14:53:00Z','USNO Moon Phases API',2026,'{"day":24,"month":11,"phase":"Full Moon","time":"14:53","year":2026}'::jsonb),
  ('new_moon','New Moon','2026-12-09T00:52:00Z','USNO Moon Phases API',2026,'{"day":9,"month":12,"phase":"New Moon","time":"00:52","year":2026}'::jsonb),
  ('full_moon','Cold Moon','2026-12-24T01:28:00Z','USNO Moon Phases API',2026,'{"day":24,"month":12,"phase":"Full Moon","time":"01:28","year":2026}'::jsonb),
  ('new_moon','New Moon','2027-01-07T20:24:00Z','USNO Moon Phases API',2027,'{"day":7,"month":1,"phase":"New Moon","time":"20:24","year":2027}'::jsonb),
  ('full_moon','Wolf Moon','2027-01-22T12:17:00Z','USNO Moon Phases API',2027,'{"day":22,"month":1,"phase":"Full Moon","time":"12:17","year":2027}'::jsonb),
  ('new_moon','New Moon','2027-02-06T15:56:00Z','USNO Moon Phases API',2027,'{"day":6,"month":2,"phase":"New Moon","time":"15:56","year":2027}'::jsonb),
  ('full_moon','Snow Moon','2027-02-20T23:23:00Z','USNO Moon Phases API',2027,'{"day":20,"month":2,"phase":"Full Moon","time":"23:23","year":2027}'::jsonb),
  ('new_moon','New Moon','2027-03-08T09:29:00Z','USNO Moon Phases API',2027,'{"day":8,"month":3,"phase":"New Moon","time":"09:29","year":2027}'::jsonb),
  ('full_moon','Worm Moon','2027-03-22T10:44:00Z','USNO Moon Phases API',2027,'{"day":22,"month":3,"phase":"Full Moon","time":"10:44","year":2027}'::jsonb),
  ('new_moon','New Moon','2027-04-06T23:51:00Z','USNO Moon Phases API',2027,'{"day":6,"month":4,"phase":"New Moon","time":"23:51","year":2027}'::jsonb),
  ('full_moon','Pink Moon','2027-04-20T22:27:00Z','USNO Moon Phases API',2027,'{"day":20,"month":4,"phase":"Full Moon","time":"22:27","year":2027}'::jsonb),
  ('new_moon','New Moon','2027-05-06T10:58:00Z','USNO Moon Phases API',2027,'{"day":6,"month":5,"phase":"New Moon","time":"10:58","year":2027}'::jsonb),
  ('full_moon','Flower Moon','2027-05-20T10:59:00Z','USNO Moon Phases API',2027,'{"day":20,"month":5,"phase":"Full Moon","time":"10:59","year":2027}'::jsonb),
  ('new_moon','New Moon','2027-06-04T19:40:00Z','USNO Moon Phases API',2027,'{"day":4,"month":6,"phase":"New Moon","time":"19:40","year":2027}'::jsonb),
  ('full_moon','Strawberry Moon','2027-06-19T00:44:00Z','USNO Moon Phases API',2027,'{"day":19,"month":6,"phase":"Full Moon","time":"00:44","year":2027}'::jsonb),
  ('new_moon','New Moon','2027-07-04T03:02:00Z','USNO Moon Phases API',2027,'{"day":4,"month":7,"phase":"New Moon","time":"03:02","year":2027}'::jsonb),
  ('full_moon','Buck Moon','2027-07-18T15:45:00Z','USNO Moon Phases API',2027,'{"day":18,"month":7,"phase":"Full Moon","time":"15:45","year":2027}'::jsonb),
  ('new_moon','New Moon','2027-08-02T10:05:00Z','USNO Moon Phases API',2027,'{"day":2,"month":8,"phase":"New Moon","time":"10:05","year":2027}'::jsonb),
  ('full_moon','Sturgeon Moon','2027-08-17T07:29:00Z','USNO Moon Phases API',2027,'{"day":17,"month":8,"phase":"Full Moon","time":"07:29","year":2027}'::jsonb),
  ('new_moon','New Moon','2027-08-31T17:41:00Z','USNO Moon Phases API',2027,'{"day":31,"month":8,"phase":"New Moon","time":"17:41","year":2027}'::jsonb),
  ('full_moon','Harvest Moon','2027-09-15T23:03:00Z','USNO Moon Phases API',2027,'{"day":15,"month":9,"phase":"Full Moon","time":"23:03","year":2027}'::jsonb),
  ('new_moon','New Moon','2027-09-30T02:36:00Z','USNO Moon Phases API',2027,'{"day":30,"month":9,"phase":"New Moon","time":"02:36","year":2027}'::jsonb),
  ('full_moon','Hunter''s Moon','2027-10-15T13:47:00Z','USNO Moon Phases API',2027,'{"day":15,"month":10,"phase":"Full Moon","time":"13:47","year":2027}'::jsonb),
  ('new_moon','New Moon','2027-10-29T13:36:00Z','USNO Moon Phases API',2027,'{"day":29,"month":10,"phase":"New Moon","time":"13:36","year":2027}'::jsonb),
  ('full_moon','Beaver Moon','2027-11-14T03:26:00Z','USNO Moon Phases API',2027,'{"day":14,"month":11,"phase":"Full Moon","time":"03:26","year":2027}'::jsonb),
  ('new_moon','New Moon','2027-11-28T03:24:00Z','USNO Moon Phases API',2027,'{"day":28,"month":11,"phase":"New Moon","time":"03:24","year":2027}'::jsonb),
  ('full_moon','Cold Moon','2027-12-13T16:09:00Z','USNO Moon Phases API',2027,'{"day":13,"month":12,"phase":"Full Moon","time":"16:09","year":2027}'::jsonb),
  ('new_moon','New Moon','2027-12-27T20:12:00Z','USNO Moon Phases API',2027,'{"day":27,"month":12,"phase":"New Moon","time":"20:12","year":2027}'::jsonb),
  ('full_moon','Wolf Moon','2028-01-12T04:03:00Z','USNO Moon Phases API',2028,'{"day":12,"month":1,"phase":"Full Moon","time":"04:03","year":2028}'::jsonb),
  ('new_moon','New Moon','2028-01-26T15:12:00Z','USNO Moon Phases API',2028,'{"day":26,"month":1,"phase":"New Moon","time":"15:12","year":2028}'::jsonb),
  ('full_moon','Snow Moon','2028-02-10T15:04:00Z','USNO Moon Phases API',2028,'{"day":10,"month":2,"phase":"Full Moon","time":"15:04","year":2028}'::jsonb),
  ('new_moon','New Moon','2028-02-25T10:37:00Z','USNO Moon Phases API',2028,'{"day":25,"month":2,"phase":"New Moon","time":"10:37","year":2028}'::jsonb),
  ('full_moon','Worm Moon','2028-03-11T01:06:00Z','USNO Moon Phases API',2028,'{"day":11,"month":3,"phase":"Full Moon","time":"01:06","year":2028}'::jsonb),
  ('new_moon','New Moon','2028-03-26T04:31:00Z','USNO Moon Phases API',2028,'{"day":26,"month":3,"phase":"New Moon","time":"04:31","year":2028}'::jsonb),
  ('full_moon','Pink Moon','2028-04-09T10:26:00Z','USNO Moon Phases API',2028,'{"day":9,"month":4,"phase":"Full Moon","time":"10:26","year":2028}'::jsonb),
  ('new_moon','New Moon','2028-04-24T19:47:00Z','USNO Moon Phases API',2028,'{"day":24,"month":4,"phase":"New Moon","time":"19:47","year":2028}'::jsonb),
  ('full_moon','Flower Moon','2028-05-08T19:49:00Z','USNO Moon Phases API',2028,'{"day":8,"month":5,"phase":"Full Moon","time":"19:49","year":2028}'::jsonb),
  ('new_moon','New Moon','2028-05-24T08:16:00Z','USNO Moon Phases API',2028,'{"day":24,"month":5,"phase":"New Moon","time":"08:16","year":2028}'::jsonb),
  ('full_moon','Strawberry Moon','2028-06-07T06:09:00Z','USNO Moon Phases API',2028,'{"day":7,"month":6,"phase":"Full Moon","time":"06:09","year":2028}'::jsonb),
  ('new_moon','New Moon','2028-06-22T18:27:00Z','USNO Moon Phases API',2028,'{"day":22,"month":6,"phase":"New Moon","time":"18:27","year":2028}'::jsonb),
  ('full_moon','Buck Moon','2028-07-06T18:11:00Z','USNO Moon Phases API',2028,'{"day":6,"month":7,"phase":"Full Moon","time":"18:11","year":2028}'::jsonb),
  ('new_moon','New Moon','2028-07-22T03:02:00Z','USNO Moon Phases API',2028,'{"day":22,"month":7,"phase":"New Moon","time":"03:02","year":2028}'::jsonb),
  ('full_moon','Sturgeon Moon','2028-08-05T08:10:00Z','USNO Moon Phases API',2028,'{"day":5,"month":8,"phase":"Full Moon","time":"08:10","year":2028}'::jsonb),
  ('new_moon','New Moon','2028-08-20T10:44:00Z','USNO Moon Phases API',2028,'{"day":20,"month":8,"phase":"New Moon","time":"10:44","year":2028}'::jsonb),
  ('full_moon','Harvest Moon','2028-09-03T23:47:00Z','USNO Moon Phases API',2028,'{"day":3,"month":9,"phase":"Full Moon","time":"23:47","year":2028}'::jsonb),
  ('new_moon','New Moon','2028-09-18T18:24:00Z','USNO Moon Phases API',2028,'{"day":18,"month":9,"phase":"New Moon","time":"18:24","year":2028}'::jsonb),
  ('full_moon','Hunter''s Moon','2028-10-03T16:25:00Z','USNO Moon Phases API',2028,'{"day":3,"month":10,"phase":"Full Moon","time":"16:25","year":2028}'::jsonb),
  ('new_moon','New Moon','2028-10-18T02:57:00Z','USNO Moon Phases API',2028,'{"day":18,"month":10,"phase":"New Moon","time":"02:57","year":2028}'::jsonb),
  ('full_moon','Beaver Moon','2028-11-02T09:17:00Z','USNO Moon Phases API',2028,'{"day":2,"month":11,"phase":"Full Moon","time":"09:17","year":2028}'::jsonb),
  ('new_moon','New Moon','2028-11-16T13:18:00Z','USNO Moon Phases API',2028,'{"day":16,"month":11,"phase":"New Moon","time":"13:18","year":2028}'::jsonb),
  ('full_moon','Cold Moon','2028-12-02T01:40:00Z','USNO Moon Phases API',2028,'{"day":2,"month":12,"phase":"Full Moon","time":"01:40","year":2028}'::jsonb),
  ('new_moon','New Moon','2028-12-16T02:06:00Z','USNO Moon Phases API',2028,'{"day":16,"month":12,"phase":"New Moon","time":"02:06","year":2028}'::jsonb),
  ('full_moon','Cold Moon','2028-12-31T16:48:00Z','USNO Moon Phases API',2028,'{"day":31,"month":12,"phase":"Full Moon","time":"16:48","year":2028}'::jsonb)
on conflict (phase_type, occurs_at_utc) do update
set
  accepted_name = excluded.accepted_name,
  source_label = excluded.source_label,
  source_year = excluded.source_year,
  source_payload = excluded.source_payload,
  updated_at = timezone('utc', now());

update public.lunar_phase_reference
set
  has_lunar_eclipse = true,
  eclipse_label = case
    when occurs_at_utc in (
      '2026-03-03T11:38:00Z'::timestamptz,
      '2027-07-18T15:45:00Z'::timestamptz
    ) then 'Total Lunar Eclipse'
    else 'Partial Lunar Eclipse'
  end,
  source_payload = source_payload
    || jsonb_build_object(
      'eclipse_source', 'NASA Lunar Eclipse Catalog 2021-2030',
      'eclipse_type', case
        when occurs_at_utc in (
          '2026-03-03T11:38:00Z'::timestamptz,
          '2027-07-18T15:45:00Z'::timestamptz
        ) then 'T'
        else 'P'
      end
    ),
  updated_at = timezone('utc', now())
where phase_type = 'full_moon'
  and occurs_at_utc in (
    '2026-03-03T11:38:00Z'::timestamptz,
    '2026-08-28T04:18:00Z'::timestamptz,
    '2027-02-20T23:23:00Z'::timestamptz,
    '2027-07-18T15:45:00Z'::timestamptz,
    '2028-01-12T04:03:00Z'::timestamptz,
    '2028-07-06T18:11:00Z'::timestamptz
  );

create table if not exists public.event_occurrence_content (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null references public.event_occurrences(id) on delete cascade,
  series_id uuid not null references public.event_series(id) on delete cascade,
  language text not null default 'en',
  duration_minutes integer not null check (duration_minutes > 0),
  script_text text not null,
  script_hash text not null,
  script_checksum text not null,
  script_word_count integer not null default 0 check (script_word_count >= 0),
  script_model text,
  script_tone text,
  script_prompt_version text not null default 'event-v1',
  source text not null default 'openai',
  voice_id text,
  voice_label text,
  audio_artifact_id uuid references public.prayer_audio_artifacts(id) on delete set null,
  audio_status text not null default 'missing' check (audio_status in ('missing', 'pending', 'ready', 'failed')),
  audio_error text,
  audio_generated_at timestamptz,
  has_word_timings boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (occurrence_id, language)
);

create index if not exists event_occurrence_content_series_idx
on public.event_occurrence_content(series_id, created_at desc);

create index if not exists event_occurrence_content_audio_idx
on public.event_occurrence_content(audio_status, updated_at desc);

create index if not exists event_occurrence_content_hash_idx
on public.event_occurrence_content(script_hash);

drop trigger if exists event_occurrence_content_set_updated_at on public.event_occurrence_content;
create trigger event_occurrence_content_set_updated_at
before update on public.event_occurrence_content
for each row
execute function public.handle_updated_at();

alter table public.event_occurrence_content enable row level security;

drop policy if exists event_occurrence_content_select_visible on public.event_occurrence_content;
create policy event_occurrence_content_select_visible
on public.event_occurrence_content
for select
to authenticated
using (public.can_access_event_occurrence(occurrence_id, auth.uid()));

drop policy if exists event_occurrence_content_insert_none on public.event_occurrence_content;
create policy event_occurrence_content_insert_none
on public.event_occurrence_content
for insert
to authenticated
with check (false);

drop policy if exists event_occurrence_content_update_none on public.event_occurrence_content;
create policy event_occurrence_content_update_none
on public.event_occurrence_content
for update
to authenticated
using (false)
with check (false);

drop policy if exists event_occurrence_content_delete_none on public.event_occurrence_content;
create policy event_occurrence_content_delete_none
on public.event_occurrence_content
for delete
to authenticated
using (false);

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
  local_timezone,
  utc_interval_minutes,
  utc_offset_minutes,
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
    'Daily Ritual',
    'Midday recentering and intention realignment.',
    'Daily Rhythm',
    'A daily collective pause to realign attention, breath, and intention.',
    'local_time_daily'::public.event_schedule_type,
    'viewer_local'::public.event_timezone_policy,
    '11:11'::time,
    null,
    null,
    0,
    11,
    15,
    120,
    'global'::public.event_visibility_scope,
    'open'::public.event_access_mode,
    false,
    true,
    jsonb_build_object(
      'phase', 'event-library-overhaul',
      'flagship', true,
      'ritual', true,
      'art_direction_key', 'live.card.flagship1111',
      'script_theme', 'intention reset and coherent alignment',
      'voice_recommendation', jsonb_build_object('voice_id', 'V904i8ujLitGpMyoTznT', 'voice_label', 'Dominic')
    ),
    true
  ),
  (
    'sunrise-gratitude',
    'Sunrise Gratitude',
    'Daily Ritual',
    'Begin the day in gratitude and grounded presence.',
    'Daily Rhythm',
    'A gentle dawn gathering for gratitude, breath, and steady focus.',
    'local_time_daily'::public.event_schedule_type,
    'viewer_local'::public.event_timezone_policy,
    '07:00'::time,
    null,
    null,
    0,
    12,
    20,
    120,
    'global'::public.event_visibility_scope,
    'open'::public.event_access_mode,
    false,
    false,
    jsonb_build_object(
      'phase', 'event-library-overhaul',
      'art_direction_key', 'live.card.default',
      'script_theme', 'morning gratitude and grounded optimism',
      'voice_recommendation', jsonb_build_object('voice_id', 'BFvr34n3gOoz0BAf9Rwn', 'voice_label', 'Amaya')
    ),
    true
  ),
  (
    'evening-release-reflection',
    'Evening Release Reflection',
    'Daily Ritual',
    'Release the day, integrate lessons, and settle into peace.',
    'Daily Rhythm',
    'An evening collective exhale to release tension and close the day with compassion.',
    'local_time_daily'::public.event_schedule_type,
    'viewer_local'::public.event_timezone_policy,
    '21:30'::time,
    null,
    null,
    0,
    15,
    20,
    150,
    'global'::public.event_visibility_scope,
    'open'::public.event_access_mode,
    false,
    false,
    jsonb_build_object(
      'phase', 'event-library-overhaul',
      'art_direction_key', 'live.card.default',
      'script_theme', 'release, forgiveness, and restful closure',
      'voice_recommendation', jsonb_build_object('voice_id', 'jfIS2w2yJi0grJZPyEsk', 'voice_label', 'Oliver')
    ),
    true
  ),
  (
    'global-peace-circle',
    'Global Peace Circle',
    'Global Intention',
    'A synchronized global prayer field for peace and reconciliation.',
    'Global Intention',
    'Unify collective intention for peace, dignity, and de-escalation across regions.',
    'utc_interval'::public.event_schedule_type,
    'utc'::public.event_timezone_policy,
    null,
    null,
    360,
    0,
    15,
    30,
    180,
    'global'::public.event_visibility_scope,
    'open'::public.event_access_mode,
    false,
    true,
    jsonb_build_object(
      'phase', 'event-library-overhaul',
      'flagship', true,
      'art_direction_key', 'live.card.flagship1111',
      'script_theme', 'global peace, reconciliation, human dignity',
      'voice_recommendation', jsonb_build_object('voice_id', 'V904i8ujLitGpMyoTznT', 'voice_label', 'Dominic')
    ),
    true
  ),
  (
    'global-awakening-meditation',
    'Global Awakening Meditation',
    'Meditation',
    'A shared stillness practice for insight, compassion, and awakened presence.',
    'Meditation',
    'A recurring global meditation for clarity, compassion, and conscious action.',
    'utc_interval'::public.event_schedule_type,
    'utc'::public.event_timezone_policy,
    null,
    null,
    480,
    120,
    20,
    30,
    210,
    'global'::public.event_visibility_scope,
    'open'::public.event_access_mode,
    false,
    false,
    jsonb_build_object(
      'phase', 'event-library-overhaul',
      'art_direction_key', 'live.card.default',
      'script_theme', 'awareness, stillness, compassion in action',
      'voice_recommendation', jsonb_build_object('voice_id', 'BFvr34n3gOoz0BAf9Rwn', 'voice_label', 'Amaya')
    ),
    true
  ),
  (
    'heart-coherence-circle',
    'Heart Coherence Circle',
    'Heart Coherence',
    'A guided coherence practice for emotional balance and compassionate connection.',
    'Heart Coherence',
    'Cultivate heart-brain coherence and relational compassion through synchronized breathing.',
    'utc_interval'::public.event_schedule_type,
    'utc'::public.event_timezone_policy,
    null,
    null,
    720,
    360,
    15,
    25,
    180,
    'global'::public.event_visibility_scope,
    'open'::public.event_access_mode,
    false,
    false,
    jsonb_build_object(
      'phase', 'event-library-overhaul',
      'art_direction_key', 'live.card.default',
      'script_theme', 'heart coherence, breathing, compassionate attunement',
      'voice_recommendation', jsonb_build_object('voice_id', 'bgU7lBMo69PNEOWHFqxM', 'voice_label', 'Rainbird')
    ),
    true
  ),
  (
    'full-moon-gathering',
    'Full Moon Gathering',
    'Lunar Rhythm',
    'A lunar-synced shared gathering aligned to the astronomical full moon.',
    'Lunar Rhythm',
    'Gather at each full moon for reflection, release, and collective blessing.',
    'lunar_phase'::public.event_schedule_type,
    'utc'::public.event_timezone_policy,
    null,
    null,
    null,
    0,
    24,
    45,
    240,
    'global'::public.event_visibility_scope,
    'open'::public.event_access_mode,
    false,
    true,
    jsonb_build_object(
      'phase', 'event-library-overhaul',
      'lunar_phase', 'full_moon',
      'flagship', true,
      'art_direction_key', 'live.card.flagship1111',
      'script_theme', 'full moon reflection, release, blessing, renewal',
      'voice_recommendation', jsonb_build_object('voice_id', 'V904i8ujLitGpMyoTznT', 'voice_label', 'Dominic')
    ),
    true
  ),
  (
    'new-moon-intention-setting',
    'New Moon Intention Setting',
    'Lunar Rhythm',
    'A lunar-synced gathering aligned to the astronomical new moon.',
    'Lunar Rhythm',
    'Set intentional direction and grounded commitments at each new moon.',
    'lunar_phase'::public.event_schedule_type,
    'utc'::public.event_timezone_policy,
    null,
    null,
    null,
    0,
    20,
    40,
    220,
    'global'::public.event_visibility_scope,
    'open'::public.event_access_mode,
    false,
    false,
    jsonb_build_object(
      'phase', 'event-library-overhaul',
      'lunar_phase', 'new_moon',
      'art_direction_key', 'live.card.default',
      'script_theme', 'new moon intention, clarity, commitment, gentle momentum',
      'voice_recommendation', jsonb_build_object('voice_id', 'BFvr34n3gOoz0BAf9Rwn', 'voice_label', 'Amaya')
    ),
    true
  ),
  (
    'special-collective-moment',
    'Special Collective Moment',
    'Curated',
    'Admin-curated one-off collective gatherings.',
    'Special Moment',
    'A curated container for special global moments.',
    'admin_curated'::public.event_schedule_type,
    'utc'::public.event_timezone_policy,
    null,
    null,
    null,
    0,
    20,
    30,
    240,
    'global'::public.event_visibility_scope,
    'open'::public.event_access_mode,
    false,
    true,
    jsonb_build_object(
      'phase', 'event-library-overhaul',
      'curated', true,
      'art_direction_key', 'live.card.flagship1111',
      'script_theme', 'collective focus, unity, significance',
      'voice_recommendation', jsonb_build_object('voice_id', 'V904i8ujLitGpMyoTznT', 'voice_label', 'Dominic')
    ),
    true
  ),
  (
    'emergency-global-prayer',
    'Emergency Global Prayer',
    'Alert',
    'Rapid coordinated response to collective crises.',
    'Alert',
    'Hold a fast, compassionate global response during urgent events.',
    'manual_trigger'::public.event_schedule_type,
    'utc'::public.event_timezone_policy,
    null,
    null,
    null,
    0,
    20,
    5,
    180,
    'global'::public.event_visibility_scope,
    'open'::public.event_access_mode,
    true,
    true,
    jsonb_build_object(
      'phase', 'event-library-overhaul',
      'emergency', true,
      'flagship', true,
      'art_direction_key', 'live.card.flagship1111',
      'script_theme', 'stability, compassion, protection, practical solidarity',
      'voice_recommendation', jsonb_build_object('voice_id', 'V904i8ujLitGpMyoTznT', 'voice_label', 'Dominic')
    ),
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
  local_timezone = excluded.local_timezone,
  utc_interval_minutes = excluded.utc_interval_minutes,
  utc_offset_minutes = excluded.utc_offset_minutes,
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

do $$
declare
  v_archive_batch constant text := 'event_library_overhaul_20260311';
  v_reason constant text := 'Overhaul: archive legacy/obsolete event library/news/legacy-event rows before cleanup.';
begin
  insert into public.event_cleanup_archives (archive_batch, source_table, source_pk, payload, archive_reason)
  select v_archive_batch, 'event_library_items', eli.id::text, to_jsonb(eli), v_reason
  from public.event_library_items eli
  on conflict (source_table, source_pk) do nothing;

  insert into public.event_cleanup_archives (archive_batch, source_table, source_pk, payload, archive_reason)
  select v_archive_batch, 'news_driven_events', nde.id::text, to_jsonb(nde), v_reason
  from public.news_driven_events nde
  on conflict (source_table, source_pk) do nothing;

  insert into public.event_cleanup_archives (archive_batch, source_table, source_pk, payload, archive_reason)
  select v_archive_batch, 'event_participants', format('%s|%s', ep.event_id, ep.user_id), to_jsonb(ep), v_reason
  from public.event_participants ep
  on conflict (source_table, source_pk) do nothing;

  insert into public.event_cleanup_archives (archive_batch, source_table, source_pk, payload, archive_reason)
  select v_archive_batch, 'events', e.id::text, to_jsonb(e), v_reason
  from public.events e
  on conflict (source_table, source_pk) do nothing;

  insert into public.event_cleanup_archives (archive_batch, source_table, source_pk, payload, archive_reason)
  select v_archive_batch, 'event_series', es.id::text, to_jsonb(es), v_reason
  from public.event_series es
  where es.visibility_scope = 'global'::public.event_visibility_scope
    and es.created_by is null
    and es.key not in (
      'daily-1111-intention-reset',
      'sunrise-gratitude',
      'evening-release-reflection',
      'global-peace-circle',
      'global-awakening-meditation',
      'heart-coherence-circle',
      'full-moon-gathering',
      'new-moon-intention-setting',
      'special-collective-moment',
      'emergency-global-prayer'
    )
  on conflict (source_table, source_pk) do nothing;

  insert into public.event_cleanup_archives (archive_batch, source_table, source_pk, payload, archive_reason)
  select v_archive_batch, 'event_occurrences', eo.id::text, to_jsonb(eo), v_reason
  from public.event_occurrences eo
  join public.event_series es
    on es.id = eo.series_id
  where es.visibility_scope = 'global'::public.event_visibility_scope
    and es.created_by is null
    and es.key not in (
      'daily-1111-intention-reset',
      'sunrise-gratitude',
      'evening-release-reflection',
      'global-peace-circle',
      'global-awakening-meditation',
      'heart-coherence-circle',
      'full-moon-gathering',
      'new-moon-intention-setting',
      'special-collective-moment',
      'emergency-global-prayer'
    )
    and eo.starts_at_utc >= timezone('utc', now()) - interval '2 days'
  on conflict (source_table, source_pk) do nothing;
end
$$;

update public.event_series
set
  is_active = false,
  updated_at = timezone('utc', now())
where visibility_scope = 'global'::public.event_visibility_scope
  and created_by is null
  and key not in (
    'daily-1111-intention-reset',
    'sunrise-gratitude',
    'evening-release-reflection',
    'global-peace-circle',
    'global-awakening-meditation',
    'heart-coherence-circle',
    'full-moon-gathering',
    'new-moon-intention-setting',
    'special-collective-moment',
    'emergency-global-prayer'
  );

delete from public.rooms r
using public.event_occurrences eo
join public.event_series es
  on es.id = eo.series_id
where r.occurrence_id = eo.id
  and r.room_kind = 'event_occurrence'::public.room_kind
  and es.visibility_scope = 'global'::public.event_visibility_scope
  and es.created_by is null
  and es.key not in (
    'daily-1111-intention-reset',
    'sunrise-gratitude',
    'evening-release-reflection',
    'global-peace-circle',
    'global-awakening-meditation',
    'heart-coherence-circle',
    'full-moon-gathering',
    'new-moon-intention-setting',
    'special-collective-moment',
    'emergency-global-prayer'
  )
  and eo.starts_at_utc >= timezone('utc', now()) - interval '2 days';

delete from public.event_occurrences eo
using public.event_series es
where es.id = eo.series_id
  and es.visibility_scope = 'global'::public.event_visibility_scope
  and es.created_by is null
  and es.key not in (
    'daily-1111-intention-reset',
    'sunrise-gratitude',
    'evening-release-reflection',
    'global-peace-circle',
    'global-awakening-meditation',
    'heart-coherence-circle',
    'full-moon-gathering',
    'new-moon-intention-setting',
    'special-collective-moment',
    'emergency-global-prayer'
  )
  and eo.starts_at_utc >= timezone('utc', now()) - interval '2 days';

delete from public.event_library_items;
delete from public.news_driven_events;
delete from public.event_participants;
delete from public.events;

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
  ),
  lunar_series as (
    select
      es.id as series_id,
      es.key as series_key,
      es.default_duration_minutes,
      es.join_window_start_minutes,
      es.join_window_end_minutes,
      coalesce(nullif(btrim(es.metadata ->> 'lunar_phase'), ''), 'full_moon') as lunar_phase_key
    from public.event_series es
    where es.is_active = true
      and es.schedule_type = 'lunar_phase'::public.event_schedule_type
      and es.timezone_policy = 'utc'::public.event_timezone_policy
  ),
  lunar_candidates as (
    select
      ls.series_id,
      ls.series_key,
      ls.default_duration_minutes,
      ls.join_window_start_minutes,
      ls.join_window_end_minutes,
      lpr.phase_type,
      lpr.accepted_name,
      lpr.occurs_at_utc as starts_at_utc,
      lpr.has_lunar_eclipse,
      lpr.eclipse_label,
      lpr.source_label,
      lpr.source_year
    from lunar_series ls
    join public.lunar_phase_reference lpr
      on lpr.phase_type = ls.lunar_phase_key
    where lpr.occurs_at_utc >= p_horizon_start - interval '1 day'
      and lpr.occurs_at_utc <= p_horizon_end + interval '1 day'
  ),
  lunar_insert as (
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
      format('%s|UTC|%s|%s', lc.series_key, to_char(lc.starts_at_utc, 'YYYYMMDD"T"HH24MI"Z"'), lc.phase_type) as occurrence_key,
      lc.starts_at_utc,
      lc.starts_at_utc + make_interval(mins => lc.default_duration_minutes),
      'UTC'::text,
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
        'timezone_policy', 'lunar_phase',
        'lunar_phase', lc.phase_type,
        'lunar_name', lc.accepted_name,
        'has_lunar_eclipse', lc.has_lunar_eclipse,
        'eclipse_label', lc.eclipse_label,
        'moon_source', lc.source_label,
        'moon_source_year', lc.source_year
      )
    from lunar_candidates lc
    on conflict (series_id, starts_at_utc, display_timezone) do update
    set
      metadata = excluded.metadata,
      updated_at = timezone('utc', now())
    returning id
  )
  select
    coalesce((select count(*) from local_insert), 0)
    + coalesce((select count(*) from utc_insert), 0)
    + coalesce((select count(*) from lunar_insert), 0)
  into v_inserted;

  return coalesce(v_inserted, 0);
end;
$$;

select public.materialize_event_occurrences(
  timezone('utc', now()) - interval '2 hours',
  timezone('utc', now()) + interval '18 months',
  null
);

select public.refresh_event_occurrence_statuses(timezone('utc', now()));
