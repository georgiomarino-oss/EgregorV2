create table if not exists public.event_library_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  script_text text not null,
  category text,
  duration_minutes integer not null default 10 check (duration_minutes in (5, 10, 15)),
  starts_count integer not null default 0 check (starts_count >= 0),
  is_public boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists event_library_items_title_unique_idx
on public.event_library_items (title);

create index if not exists event_library_items_public_created_idx
on public.event_library_items (is_public, created_at desc);

create index if not exists event_library_items_category_idx
on public.event_library_items (category);

drop trigger if exists event_library_items_set_updated_at on public.event_library_items;
create trigger event_library_items_set_updated_at
before update on public.event_library_items
for each row
execute function public.handle_updated_at();

alter table public.event_library_items enable row level security;

drop policy if exists event_library_select_public_or_owner on public.event_library_items;
create policy event_library_select_public_or_owner
on public.event_library_items
for select
to authenticated
using (is_public = true or auth.uid() = created_by);

drop policy if exists event_library_insert_owner on public.event_library_items;
create policy event_library_insert_owner
on public.event_library_items
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists event_library_update_owner on public.event_library_items;
create policy event_library_update_owner
on public.event_library_items
for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists event_library_delete_owner on public.event_library_items;
create policy event_library_delete_owner
on public.event_library_items
for delete
to authenticated
using (auth.uid() = created_by);
