create extension if not exists "pgcrypto";

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferred_voice_id text,
  preferred_breath_mode text not null default 'Deep',
  preferred_ambient text not null default 'Bowls',
  preferred_session_minutes integer not null default 5 check (preferred_session_minutes > 0),
  high_contrast_mode boolean not null default false,
  voice_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.handle_updated_at();

create table if not exists public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.circle_members (
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (circle_id, user_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  description text,
  host_note text,
  region text,
  country_code text,
  starts_at timestamptz not null,
  duration_minutes integer not null default 20 check (duration_minutes > 0),
  status text not null default 'scheduled' check (status in ('live', 'scheduled', 'completed', 'cancelled')),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row
execute function public.handle_updated_at();

create table if not exists public.event_participants (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  is_active boolean not null default true,
  primary key (event_id, user_id)
);

create table if not exists public.prayer_library_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category text,
  duration_minutes integer not null default 5 check (duration_minutes > 0),
  starts_count integer not null default 0 check (starts_count >= 0),
  is_public boolean not null default true,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_intentions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  intention text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.solo_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  intention text,
  script_text text,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists events_status_starts_at_idx
on public.events(status, starts_at);

create index if not exists events_country_code_idx
on public.events(country_code);

create index if not exists event_participants_event_active_idx
on public.event_participants(event_id, is_active, last_seen_at desc);

create index if not exists event_participants_user_idx
on public.event_participants(user_id, joined_at desc);

create index if not exists circle_members_user_idx
on public.circle_members(user_id, joined_at desc);

create index if not exists user_intentions_user_created_idx
on public.user_intentions(user_id, created_at desc);

create index if not exists solo_sessions_user_completed_idx
on public.solo_sessions(user_id, completed_at desc);

alter table public.profiles enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.prayer_library_items enable row level security;
alter table public.user_intentions enable row level security;
alter table public.solo_sessions enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists circles_select_authenticated on public.circles;
create policy circles_select_authenticated
on public.circles
for select
to authenticated
using (true);

drop policy if exists circles_insert_authenticated on public.circles;
create policy circles_insert_authenticated
on public.circles
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists circles_update_owner on public.circles;
create policy circles_update_owner
on public.circles
for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists circles_delete_owner on public.circles;
create policy circles_delete_owner
on public.circles
for delete
to authenticated
using (auth.uid() = created_by);

drop policy if exists circle_members_select_authenticated on public.circle_members;
create policy circle_members_select_authenticated
on public.circle_members
for select
to authenticated
using (true);

drop policy if exists circle_members_insert_self on public.circle_members;
create policy circle_members_insert_self
on public.circle_members
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists circle_members_delete_self_or_owner on public.circle_members;
create policy circle_members_delete_self_or_owner
on public.circle_members
for delete
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.circles c
    where c.id = circle_members.circle_id and c.created_by = auth.uid()
  )
);

drop policy if exists events_select_public_or_owner on public.events;
create policy events_select_public_or_owner
on public.events
for select
to authenticated
using (visibility = 'public' or auth.uid() = created_by);

drop policy if exists events_insert_owner on public.events;
create policy events_insert_owner
on public.events
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists events_update_owner on public.events;
create policy events_update_owner
on public.events
for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists events_delete_owner on public.events;
create policy events_delete_owner
on public.events
for delete
to authenticated
using (auth.uid() = created_by);

drop policy if exists event_participants_select_authenticated on public.event_participants;
create policy event_participants_select_authenticated
on public.event_participants
for select
to authenticated
using (true);

drop policy if exists event_participants_insert_self on public.event_participants;
create policy event_participants_insert_self
on public.event_participants
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists event_participants_update_self on public.event_participants;
create policy event_participants_update_self
on public.event_participants
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists event_participants_delete_self on public.event_participants;
create policy event_participants_delete_self
on public.event_participants
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists prayer_library_select_public_or_owner on public.prayer_library_items;
create policy prayer_library_select_public_or_owner
on public.prayer_library_items
for select
to authenticated
using (is_public = true or auth.uid() = created_by);

drop policy if exists prayer_library_insert_owner on public.prayer_library_items;
create policy prayer_library_insert_owner
on public.prayer_library_items
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists prayer_library_update_owner on public.prayer_library_items;
create policy prayer_library_update_owner
on public.prayer_library_items
for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists prayer_library_delete_owner on public.prayer_library_items;
create policy prayer_library_delete_owner
on public.prayer_library_items
for delete
to authenticated
using (auth.uid() = created_by);

drop policy if exists intentions_select_own on public.user_intentions;
create policy intentions_select_own
on public.user_intentions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists intentions_insert_own on public.user_intentions;
create policy intentions_insert_own
on public.user_intentions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists intentions_delete_own on public.user_intentions;
create policy intentions_delete_own
on public.user_intentions
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists solo_sessions_select_own on public.solo_sessions;
create policy solo_sessions_select_own
on public.solo_sessions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists solo_sessions_insert_own on public.solo_sessions;
create policy solo_sessions_insert_own
on public.solo_sessions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists solo_sessions_update_own on public.solo_sessions;
create policy solo_sessions_update_own
on public.solo_sessions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists solo_sessions_delete_own on public.solo_sessions;
create policy solo_sessions_delete_own
on public.solo_sessions
for delete
to authenticated
using (auth.uid() = user_id);
