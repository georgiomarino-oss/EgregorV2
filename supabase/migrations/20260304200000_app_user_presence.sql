create table if not exists public.app_user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_online boolean not null default true,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists app_user_presence_set_updated_at on public.app_user_presence;
create trigger app_user_presence_set_updated_at
before update on public.app_user_presence
for each row
execute function public.handle_updated_at();

create index if not exists app_user_presence_online_last_seen_idx
on public.app_user_presence(is_online, last_seen_at desc);

alter table public.app_user_presence enable row level security;

drop policy if exists app_user_presence_select_authenticated on public.app_user_presence;
create policy app_user_presence_select_authenticated
on public.app_user_presence
for select
to authenticated
using (true);

drop policy if exists app_user_presence_insert_self on public.app_user_presence;
create policy app_user_presence_insert_self
on public.app_user_presence
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists app_user_presence_update_self on public.app_user_presence;
create policy app_user_presence_update_self
on public.app_user_presence
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists app_user_presence_delete_self on public.app_user_presence;
create policy app_user_presence_delete_self
on public.app_user_presence
for delete
to authenticated
using (auth.uid() = user_id);
