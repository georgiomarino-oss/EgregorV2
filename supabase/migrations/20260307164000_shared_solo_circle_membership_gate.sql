-- Enforce prayer-circle membership for shared solo participant join/update paths.
-- Host remains always allowed for their own session.

create or replace function public.is_shared_solo_circle_member(p_session_id uuid)
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
      and (
        session_row.host_user_id = auth.uid()
        or exists (
          select 1
          from public.circles host_circle
          join public.circle_members member
            on member.circle_id = host_circle.id
          where host_circle.created_by = session_row.host_user_id
            and member.user_id = auth.uid()
        )
      )
  );
$$;

revoke all on function public.is_shared_solo_circle_member(uuid) from public;
grant execute on function public.is_shared_solo_circle_member(uuid) to authenticated;

drop policy if exists shared_solo_participants_insert_self on public.shared_solo_session_participants;
create policy shared_solo_participants_insert_self
on public.shared_solo_session_participants
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_shared_solo_circle_member(session_id)
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
  and public.is_shared_solo_circle_member(session_id)
  and (
    coalesce(role, 'participant') = 'participant'
    or public.is_shared_solo_session_host(session_id)
  )
  and (
    is_active = false
    or public.is_shared_solo_session_active(session_id)
  )
);
