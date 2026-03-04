create table if not exists public.user_event_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('all', 'event')),
  subscription_key text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, scope, subscription_key)
);

create index if not exists user_event_subscriptions_user_idx
on public.user_event_subscriptions (user_id, created_at desc);

alter table public.user_event_subscriptions enable row level security;

drop policy if exists user_event_subscriptions_select_own on public.user_event_subscriptions;
create policy user_event_subscriptions_select_own
on public.user_event_subscriptions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists user_event_subscriptions_insert_own on public.user_event_subscriptions;
create policy user_event_subscriptions_insert_own
on public.user_event_subscriptions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists user_event_subscriptions_delete_own on public.user_event_subscriptions;
create policy user_event_subscriptions_delete_own
on public.user_event_subscriptions
for delete
to authenticated
using (auth.uid() = user_id);

create table if not exists public.news_driven_events (
  id uuid primary key default gen_random_uuid(),
  source_url text not null,
  source_title text,
  headline text not null,
  summary text not null,
  script_text text not null,
  category text not null,
  duration_minutes integer not null default 10 check (duration_minutes in (5, 10, 15)),
  starts_at timestamptz not null,
  event_day date not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (source_url, event_day)
);

create index if not exists news_driven_events_starts_idx
on public.news_driven_events (starts_at asc);

create index if not exists news_driven_events_event_day_idx
on public.news_driven_events (event_day desc);

drop trigger if exists news_driven_events_set_updated_at on public.news_driven_events;
create trigger news_driven_events_set_updated_at
before update on public.news_driven_events
for each row
execute function public.handle_updated_at();

alter table public.news_driven_events enable row level security;

drop policy if exists news_driven_events_select_authenticated on public.news_driven_events;
create policy news_driven_events_select_authenticated
on public.news_driven_events
for select
to authenticated
using (true);
