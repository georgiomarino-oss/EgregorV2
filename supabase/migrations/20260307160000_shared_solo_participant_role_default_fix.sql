-- Allow participant self-join/update paths to rely on default role assignment.
-- This keeps host-role protection intact while permitting app upserts that omit `role`.

drop policy if exists shared_solo_participants_insert_self on public.shared_solo_session_participants;
create policy shared_solo_participants_insert_self
on public.shared_solo_session_participants
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    coalesce(role, 'participant') = 'participant'
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
    coalesce(role, 'participant') = 'participant'
    or exists (
      select 1
      from public.shared_solo_sessions session_row
      where session_row.id = shared_solo_session_participants.session_id
        and session_row.host_user_id = auth.uid()
        and shared_solo_session_participants.user_id = auth.uid()
    )
  )
);
