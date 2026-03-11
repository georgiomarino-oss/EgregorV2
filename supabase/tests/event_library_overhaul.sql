-- Event library overhaul verification
-- Run after migrations with:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/event_library_overhaul.sql

begin;

do $$
declare
  v_expected_keys constant text[] := array[
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
  ];
  v_count integer;
begin
  if to_regclass('public.event_cleanup_archives') is null then
    raise exception 'event_cleanup_archives table is missing';
  end if;

  if to_regclass('public.lunar_phase_reference') is null then
    raise exception 'lunar_phase_reference table is missing';
  end if;

  if to_regclass('public.event_occurrence_content') is null then
    raise exception 'event_occurrence_content table is missing';
  end if;

  select count(*)
  into v_count
  from public.event_series es
  where es.visibility_scope = 'global'::public.event_visibility_scope
    and es.created_by is null
    and es.key = any(v_expected_keys);

  if v_count <> array_length(v_expected_keys, 1) then
    raise exception 'Expected % canonical global event series, found %', array_length(v_expected_keys, 1), v_count;
  end if;

  if exists (
    select 1
    from public.event_series es
    where es.visibility_scope = 'global'::public.event_visibility_scope
      and es.created_by is null
      and es.is_active = true
      and not (es.key = any(v_expected_keys))
  ) then
    raise exception 'Found active non-canonical global event series';
  end if;

  if exists (select 1 from public.event_library_items) then
    raise exception 'event_library_items should be empty after overhaul cleanup';
  end if;

  if exists (select 1 from public.news_driven_events) then
    raise exception 'news_driven_events should be empty after overhaul cleanup';
  end if;

  if exists (select 1 from public.event_participants) then
    raise exception 'event_participants should be empty after overhaul cleanup';
  end if;

  if exists (select 1 from public.events) then
    raise exception 'events table should be empty after overhaul cleanup';
  end if;

  select count(*)
  into v_count
  from public.lunar_phase_reference lpr
  where lpr.occurs_at_utc >= '2026-01-01T00:00:00Z'::timestamptz
    and lpr.occurs_at_utc < '2029-01-01T00:00:00Z'::timestamptz
    and lpr.phase_type in ('full_moon', 'new_moon');

  if v_count < 70 then
    raise exception 'Expected at least 70 lunar phase reference rows in 2026-2028, found %', v_count;
  end if;

  if exists (
    select 1
    from public.lunar_phase_reference lpr
    where lpr.phase_type = 'full_moon'
      and nullif(btrim(lpr.accepted_name), '') is null
  ) then
    raise exception 'All full moon rows must include accepted_name';
  end if;

  if not exists (
    select 1
    from public.lunar_phase_reference lpr
    where lpr.phase_type = 'full_moon'
      and lpr.occurs_at_utc = '2026-03-03T11:38:00Z'::timestamptz
      and lpr.has_lunar_eclipse = true
      and lpr.eclipse_label = 'Total Lunar Eclipse'
  ) then
    raise exception 'Missing expected 2026-03-03 total lunar eclipse annotation';
  end if;

  if not exists (
    select 1
    from public.lunar_phase_reference lpr
    where lpr.phase_type = 'full_moon'
      and lpr.occurs_at_utc = '2027-07-18T15:45:00Z'::timestamptz
      and lpr.has_lunar_eclipse = true
      and lpr.eclipse_label = 'Total Lunar Eclipse'
  ) then
    raise exception 'Missing expected 2027-07-18 total lunar eclipse annotation';
  end if;

  if not exists (
    select 1
    from public.event_occurrences eo
    join public.event_series es on es.id = eo.series_id
    where es.key = 'full-moon-gathering'
      and eo.metadata ? 'lunar_name'
      and eo.metadata ? 'lunar_phase'
      and eo.starts_at_utc >= timezone('utc', now()) - interval '1 day'
  ) then
    raise exception 'Expected at least one materialized full moon occurrence with lunar metadata';
  end if;

  if not exists (
    select 1
    from public.event_occurrences eo
    join public.event_series es on es.id = eo.series_id
    where es.key = 'new-moon-intention-setting'
      and eo.metadata ->> 'lunar_phase' = 'new_moon'
      and eo.starts_at_utc >= timezone('utc', now()) - interval '1 day'
  ) then
    raise exception 'Expected at least one materialized new moon occurrence with lunar metadata';
  end if;
end;
$$;

rollback;
