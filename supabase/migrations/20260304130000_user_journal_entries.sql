create table if not exists public.user_journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists user_journal_entries_user_created_idx
on public.user_journal_entries(user_id, created_at desc);

drop trigger if exists user_journal_entries_set_updated_at on public.user_journal_entries;
create trigger user_journal_entries_set_updated_at
before update on public.user_journal_entries
for each row
execute function public.handle_updated_at();

alter table public.user_journal_entries enable row level security;

drop policy if exists user_journal_entries_select_own on public.user_journal_entries;
create policy user_journal_entries_select_own
on public.user_journal_entries
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists user_journal_entries_insert_own on public.user_journal_entries;
create policy user_journal_entries_insert_own
on public.user_journal_entries
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists user_journal_entries_update_own on public.user_journal_entries;
create policy user_journal_entries_update_own
on public.user_journal_entries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists user_journal_entries_delete_own on public.user_journal_entries;
create policy user_journal_entries_delete_own
on public.user_journal_entries
for delete
to authenticated
using (auth.uid() = user_id);
