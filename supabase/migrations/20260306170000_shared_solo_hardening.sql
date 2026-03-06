-- Shared solo session hardening delta
-- Applies policy tightening, host-role integrity, end-session participant cleanup,
-- and explicit realtime publication registration.

-- 1) Tighten shared session read scope to host + members only.
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
  )
);

-- 2) Tighten participant read scope to self + session members only.
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
  )
);

-- 3) Enforce host-role integrity at SQL layer.
create or replace function public.shared_solo_participants_enforce_host_role()
returns trigger
language plpgsql
as $$
declare
  session_host uuid;
begin
  select host_user_id
  into session_host
  from public.shared_solo_sessions
  where id = new.session_id;

  if session_host is null then
    return new;
  end if;

  if new.user_id = session_host then
    new.role := 'host';
  else
    new.role := 'participant';
  end if;

  return new;
end;
$$;

drop trigger if exists shared_solo_participants_enforce_host_role_tg on public.shared_solo_session_participants;
create trigger shared_solo_participants_enforce_host_role_tg
before insert or update of role, user_id, session_id
on public.shared_solo_session_participants
for each row
execute function public.shared_solo_participants_enforce_host_role();

-- Keep self-service joins/updates, but explicitly block non-host users from writing host role.
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

-- Allow host to deactivate/maintain participant rows for their own session.
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

-- 4) SQL-layer cleanup when host ends a session.
create or replace function public.shared_solo_sessions_cleanup_participants_on_end()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'ended' and (old.status is distinct from 'ended') then
    update public.shared_solo_session_participants
    set is_active = false,
        last_seen_at = timezone('utc', now())
    where session_id = new.id
      and is_active = true;
  end if;

  return new;
end;
$$;

drop trigger if exists shared_solo_sessions_cleanup_participants_on_end_tg on public.shared_solo_sessions;
create trigger shared_solo_sessions_cleanup_participants_on_end_tg
after update of status
on public.shared_solo_sessions
for each row
execute function public.shared_solo_sessions_cleanup_participants_on_end();

-- 5) Ensure shared solo tables are in supabase_realtime publication.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'shared_solo_sessions'
    ) then
      execute 'alter publication supabase_realtime add table public.shared_solo_sessions';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'shared_solo_session_participants'
    ) then
      execute 'alter publication supabase_realtime add table public.shared_solo_session_participants';
    end if;
  end if;
end
$$;
