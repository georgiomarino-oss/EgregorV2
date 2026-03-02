create table if not exists public.prayer_library_scripts (
  id uuid primary key default gen_random_uuid(),
  prayer_library_item_id uuid not null references public.prayer_library_items(id) on delete cascade,
  duration_minutes integer not null check (duration_minutes in (3, 5, 10)),
  language text not null default 'en',
  script_text text not null,
  tone text,
  model text,
  word_count integer not null default 0 check (word_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (prayer_library_item_id, duration_minutes, language)
);

create index if not exists prayer_library_scripts_item_idx
on public.prayer_library_scripts(prayer_library_item_id, duration_minutes);

drop trigger if exists prayer_library_scripts_set_updated_at on public.prayer_library_scripts;
create trigger prayer_library_scripts_set_updated_at
before update on public.prayer_library_scripts
for each row
execute function public.handle_updated_at();

alter table public.prayer_library_scripts enable row level security;

drop policy if exists prayer_scripts_select_public_or_owner on public.prayer_library_scripts;
create policy prayer_scripts_select_public_or_owner
on public.prayer_library_scripts
for select
to authenticated
using (
  exists (
    select 1
    from public.prayer_library_items pli
    where pli.id = prayer_library_scripts.prayer_library_item_id
      and (pli.is_public = true or pli.created_by = auth.uid())
  )
);

drop policy if exists prayer_scripts_insert_owner on public.prayer_library_scripts;
create policy prayer_scripts_insert_owner
on public.prayer_library_scripts
for insert
to authenticated
with check (
  exists (
    select 1
    from public.prayer_library_items pli
    where pli.id = prayer_library_scripts.prayer_library_item_id
      and pli.created_by = auth.uid()
  )
);

drop policy if exists prayer_scripts_update_owner on public.prayer_library_scripts;
create policy prayer_scripts_update_owner
on public.prayer_library_scripts
for update
to authenticated
using (
  exists (
    select 1
    from public.prayer_library_items pli
    where pli.id = prayer_library_scripts.prayer_library_item_id
      and pli.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.prayer_library_items pli
    where pli.id = prayer_library_scripts.prayer_library_item_id
      and pli.created_by = auth.uid()
  )
);

drop policy if exists prayer_scripts_delete_owner on public.prayer_library_scripts;
create policy prayer_scripts_delete_owner
on public.prayer_library_scripts
for delete
to authenticated
using (
  exists (
    select 1
    from public.prayer_library_items pli
    where pli.id = prayer_library_scripts.prayer_library_item_id
      and pli.created_by = auth.uid()
  )
);
