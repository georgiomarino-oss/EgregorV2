delete from public.news_driven_events;

with base as (
  select date_trunc('hour', timezone('utc', now())) + interval '1 hour' as first_starts_at
)
insert into public.news_driven_events (
  source_url,
  source_title,
  headline,
  summary,
  script_text,
  category,
  country_code,
  location_hint,
  duration_minutes,
  starts_at,
  event_day
)
select
  row.source_url,
  row.source_title,
  row.headline,
  row.summary,
  row.script_text,
  row.category,
  row.country_code,
  row.location_hint,
  row.duration_minutes,
  row.starts_at,
  row.event_day
from base
cross join lateral (
  values
    (
      'https://egregor.world/news/peace-for-the-middle-east'::text,
      'Egregor Curated'::text,
      'Peace for the Middle East'::text,
      'A focused collective intention for de-escalation, dignity, and durable peace across the Middle East.'::text,
      'Peace for the Middle East'::text,
      'Peace'::text,
      null::text,
      'Middle East'::text,
      10::integer,
      base.first_starts_at,
      (base.first_starts_at at time zone 'utc')::date
    ),
    (
      'https://egregor.world/news/freedom-for-the-people-of-palestine'::text,
      'Egregor Curated'::text,
      'Freedom for the people of Palestine'::text,
      'A collective prayer for freedom, safety, and human dignity for the people of Palestine.'::text,
      'Freedom for the people of Palestine'::text,
      'Freedom'::text,
      'PS'::text,
      'Palestine'::text,
      10::integer,
      base.first_starts_at + interval '3 hours',
      ((base.first_starts_at + interval '3 hours') at time zone 'utc')::date
    )
) as row(
  source_url,
  source_title,
  headline,
  summary,
  script_text,
  category,
  country_code,
  location_hint,
  duration_minutes,
  starts_at,
  event_day
);
