-- stricter shared solo read scope: host + ACTIVE participants only

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
