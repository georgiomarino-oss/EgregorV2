alter table public.news_driven_events
  add column if not exists country_code text,
  add column if not exists location_hint text;

create index if not exists news_driven_events_country_code_idx
  on public.news_driven_events (country_code);

create index if not exists news_driven_events_location_hint_idx
  on public.news_driven_events (location_hint);

update public.news_driven_events
set country_code = 'IR',
    location_hint = 'Iran'
where country_code is null
  and (
    headline ilike '%iran%'
    or summary ilike '%iran%'
    or script_text ilike '%iran%'
  );

update public.news_driven_events
set country_code = 'UA',
    location_hint = 'Ukraine'
where country_code is null
  and (
    headline ilike '%ukraine%'
    or summary ilike '%ukraine%'
    or script_text ilike '%ukraine%'
    or headline ilike '%kyiv%'
  );

update public.news_driven_events
set country_code = 'PS',
    location_hint = 'Palestine'
where country_code is null
  and (
    headline ilike '%gaza%'
    or summary ilike '%gaza%'
    or script_text ilike '%gaza%'
    or headline ilike '%palestin%'
  );
