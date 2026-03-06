create table if not exists public.shared_solo_sessions (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  intention text not null,
  prayer_library_item_id uuid references public.prayer_library_items(id) on delete set null,
  script_text text not null,
  voice_id text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  playback_state text not null default 'idle' check (playback_state in ('idle', 'playing', 'paused', 'ended')),
  playback_position_ms integer not null default 0 check (playback_position_ms >= 0),
  status text not null default 'active' check (status in ('active', 'ended')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists shared_solo_sessions_set_updated_at on public.shared_solo_sessions;
create trigger shared_solo_sessions_set_updated_at
before update on public.shared_solo_sessions
for each row
execute function public.handle_updated_at();

create table if not exists public.shared_solo_session_participants (
  session_id uuid not null references public.shared_solo_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'participant' check (role in ('host', 'participant')),
  is_active boolean not null default true,
  joined_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  primary key (session_id, user_id)
);

create index if not exists shared_solo_sessions_status_updated_idx
on public.shared_solo_sessions(status, updated_at desc);

create index if not exists shared_solo_sessions_host_idx
on public.shared_solo_sessions(host_user_id, created_at desc);

create index if not exists shared_solo_participants_session_active_idx
on public.shared_solo_session_participants(session_id, is_active, last_seen_at desc);

create index if not exists shared_solo_participants_user_idx
on public.shared_solo_session_participants(user_id, joined_at desc);

alter table public.shared_solo_sessions enable row level security;
alter table public.shared_solo_session_participants enable row level security;

drop policy if exists shared_solo_sessions_select_member_or_active on public.shared_solo_sessions;
create policy shared_solo_sessions_select_member_or_active
on public.shared_solo_sessions
for select
to authenticated
using (
  host_user_id = auth.uid()
  or exists (
    select 1
    from public.shared_solo_session_participants participant
    where participant.session_id = shared_solo_sessions.id
      and participant.user_id = auth.uid()
      and participant.is_active = true
  )
);

drop policy if exists shared_solo_sessions_insert_host on public.shared_solo_sessions;
create policy shared_solo_sessions_insert_host
on public.shared_solo_sessions
for insert
to authenticated
with check (host_user_id = auth.uid());

drop policy if exists shared_solo_sessions_update_host on public.shared_solo_sessions;
create policy shared_solo_sessions_update_host
on public.shared_solo_sessions
for update
to authenticated
using (host_user_id = auth.uid())
with check (host_user_id = auth.uid());

drop policy if exists shared_solo_sessions_delete_host on public.shared_solo_sessions;
create policy shared_solo_sessions_delete_host
on public.shared_solo_sessions
for delete
to authenticated
using (host_user_id = auth.uid());

drop policy if exists shared_solo_participants_select_members on public.shared_solo_session_participants;
create policy shared_solo_participants_select_members
on public.shared_solo_session_participants
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.shared_solo_session_participants viewer
    where viewer.session_id = shared_solo_session_participants.session_id
      and viewer.user_id = auth.uid()
      and viewer.is_active = true
  )
);

drop policy if exists shared_solo_participants_insert_self on public.shared_solo_session_participants;
create policy shared_solo_participants_insert_self
on public.shared_solo_session_participants
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    role = 'participant'
    or exists (
      select 1
      from public.shared_solo_sessions session_row
      where session_row.id = shared_solo_session_participants.session_id
        and session_row.host_user_id = auth.uid()
        and shared_solo_session_participants.user_id = auth.uid()
    )
  )
  and exists (
    select 1
    from public.shared_solo_sessions session_row
    where session_row.id = shared_solo_session_participants.session_id
      and session_row.status = 'active'
  )
);

drop policy if exists shared_solo_participants_update_self on public.shared_solo_session_participants;
create policy shared_solo_participants_update_self
on public.shared_solo_session_participants
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    role = 'participant'
    or exists (
      select 1
      from public.shared_solo_sessions session_row
      where session_row.id = shared_solo_session_participants.session_id
        and session_row.host_user_id = auth.uid()
        and shared_solo_session_participants.user_id = auth.uid()
    )
  )
);

drop policy if exists shared_solo_participants_update_host_session on public.shared_solo_session_participants;
create policy shared_solo_participants_update_host_session
on public.shared_solo_session_participants
for update
to authenticated
using (
  exists (
    select 1
    from public.shared_solo_sessions session_row
    where session_row.id = shared_solo_session_participants.session_id
      and session_row.host_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.shared_solo_sessions session_row
    where session_row.id = shared_solo_session_participants.session_id
      and session_row.host_user_id = auth.uid()
  )
  and (
    role = 'participant'
    or shared_solo_session_participants.user_id = auth.uid()
  )
);

drop policy if exists shared_solo_participants_delete_self on public.shared_solo_session_participants;
create policy shared_solo_participants_delete_self
on public.shared_solo_session_participants
for delete
to authenticated
using (user_id = auth.uid());

alter publication supabase_realtime add table public.shared_solo_sessions;
alter publication supabase_realtime add table public.shared_solo_session_participants;
