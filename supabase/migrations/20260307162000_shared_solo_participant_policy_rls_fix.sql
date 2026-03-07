-- Fix participant join/update policies to avoid hidden RLS dependency on sessions table.
-- Also prevent participant self-reactivation after a session has ended.

create or replace function public.is_shared_solo_session_active(p_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.shared_solo_sessions session_row
    where session_row.id = p_session_id
      and session_row.status = 'active'
  );
$$;

create or replace function public.is_shared_solo_session_host(p_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.shared_solo_sessions session_row
    where session_row.id = p_session_id
      and session_row.host_user_id = auth.uid()
  );
$$;

revoke all on function public.is_shared_solo_session_active(uuid) from public;
revoke all on function public.is_shared_solo_session_host(uuid) from public;
grant execute on function public.is_shared_solo_session_active(uuid) to authenticated;
grant execute on function public.is_shared_solo_session_host(uuid) to authenticated;

drop policy if exists shared_solo_participants_insert_self on public.shared_solo_session_participants;
create policy shared_solo_participants_insert_self
on public.shared_solo_session_participants
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    coalesce(role, 'participant') = 'participant'
    or public.is_shared_solo_session_host(session_id)
  )
  and public.is_shared_solo_session_active(session_id)
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
    coalesce(role, 'participant') = 'participant'
    or public.is_shared_solo_session_host(session_id)
  )
  and (
    is_active = false
    or public.is_shared_solo_session_active(session_id)
  )
);
