-- Event library overhaul archive/removal summary
-- Run with:
-- psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/scripts/event-library-cleanup-summary.sql

select
  archive_batch,
  source_table,
  count(*) as archived_rows,
  min(archived_at) as first_archived_at,
  max(archived_at) as last_archived_at
from public.event_cleanup_archives
where archive_batch = 'event_library_overhaul_20260311'
group by archive_batch, source_table
order by source_table;

select
  'event_library_items' as table_name,
  count(*) as remaining_rows
from public.event_library_items
union all
select 'news_driven_events', count(*) from public.news_driven_events
union all
select 'event_participants', count(*) from public.event_participants
union all
select 'events', count(*) from public.events;

select
  es.key,
  es.name,
  es.is_active,
  es.schedule_type,
  es.visibility_scope
from public.event_series es
where es.visibility_scope = 'global'::public.event_visibility_scope
  and es.created_by is null
order by es.key;
