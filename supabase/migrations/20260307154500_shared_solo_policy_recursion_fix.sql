-- Fix shared solo RLS recursion by replacing self-referential policy subqueries
-- with a SECURITY DEFINER membership predicate.

create or replace function public.is_active_shared_solo_member(p_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.shared_solo_session_participants participant
    where participant.session_id = p_session_id
      and participant.user_id = auth.uid()
      and participant.is_active = true
  );
$$;

revoke all on function public.is_active_shared_solo_member(uuid) from public;
grant execute on function public.is_active_shared_solo_member(uuid) to authenticated;

drop policy if exists shared_solo_sessions_select_member_or_active on public.shared_solo_sessions;
create policy shared_solo_sessions_select_member_or_active
on public.shared_solo_sessions
for select
to authenticated
using (
  host_user_id = auth.uid()
  or public.is_active_shared_solo_member(id)
);

drop policy if exists shared_solo_participants_select_members on public.shared_solo_session_participants;
create policy shared_solo_participants_select_members
on public.shared_solo_session_participants
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_active_shared_solo_member(session_id)
);
