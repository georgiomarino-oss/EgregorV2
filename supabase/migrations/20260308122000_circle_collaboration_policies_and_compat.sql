-- Legacy compatibility wrappers: retained during UX migration.

create or replace function public.get_prayer_circle_members()
returns table (
  user_id uuid,
  display_name text,
  joined_at timestamptz,
  is_owner boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_circle_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_circle_id := public.ensure_prayer_circle();

  return query
  select
    m.user_id,
    m.display_name,
    m.joined_at,
    m.is_owner
  from public.list_circle_members(v_circle_id) m
  order by m.is_owner desc, m.joined_at asc;
end;
$$;

create or replace function public.get_events_circle_members()
returns table (
  user_id uuid,
  display_name text,
  joined_at timestamptz,
  is_owner boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_circle_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_circle_id := public.ensure_events_circle();

  return query
  select
    m.user_id,
    m.display_name,
    m.joined_at,
    m.is_owner
  from public.list_circle_members(v_circle_id) m
  order by m.is_owner desc, m.joined_at asc;
end;
$$;

create or replace function public.search_app_users_for_circle(
  p_query text default null,
  p_limit integer default 20
)
returns table (
  user_id uuid,
  display_name text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id as user_id,
    coalesce(nullif(trim(p.display_name), ''), 'Member') as display_name
  from public.profiles p
  where p.id <> auth.uid()
    and (
      p_query is null
      or btrim(p_query) = ''
      or coalesce(p.display_name, '') ilike ('%' || btrim(p_query) || '%')
    )
  order by coalesce(nullif(trim(p.display_name), ''), 'Member') asc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

create or replace function public.add_user_to_prayer_circle(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_circle_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_target_user_id is null then
    raise exception 'Target user is required';
  end if;

  if p_target_user_id = auth.uid() then
    return;
  end if;

  v_circle_id := public.ensure_prayer_circle();

  insert into public.circle_members (
    circle_id,
    user_id,
    joined_at,
    role,
    status,
    left_at
  )
  values (
    v_circle_id,
    p_target_user_id,
    timezone('utc', now()),
    'member'::public.circle_membership_role,
    'active'::public.circle_membership_status,
    null
  )
  on conflict (circle_id, user_id) do update
  set status = 'active'::public.circle_membership_status,
      left_at = null,
      updated_at = timezone('utc', now());
end;
$$;

create or replace function public.add_user_to_events_circle(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_circle_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_target_user_id is null then
    raise exception 'Target user is required';
  end if;

  if p_target_user_id = auth.uid() then
    return;
  end if;

  v_circle_id := public.ensure_events_circle();

  insert into public.circle_members (
    circle_id,
    user_id,
    joined_at,
    role,
    status,
    left_at
  )
  values (
    v_circle_id,
    p_target_user_id,
    timezone('utc', now()),
    'member'::public.circle_membership_role,
    'active'::public.circle_membership_status,
    null
  )
  on conflict (circle_id, user_id) do update
  set status = 'active'::public.circle_membership_status,
      left_at = null,
      updated_at = timezone('utc', now());
end;
$$;

create or replace function public.remove_user_from_prayer_circle(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_circle_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_target_user_id is null then
    raise exception 'Target user is required';
  end if;

  v_circle_id := public.ensure_prayer_circle();

  perform public.remove_circle_member(v_circle_id, p_target_user_id);
end;
$$;

create or replace function public.remove_user_from_events_circle(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_circle_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_target_user_id is null then
    raise exception 'Target user is required';
  end if;

  v_circle_id := public.ensure_events_circle();

  perform public.remove_circle_member(v_circle_id, p_target_user_id);
end;
$$;

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
            and member.status = 'active'::public.circle_membership_status
        )
      )
  );
$$;

alter table public.circle_invitations enable row level security;
alter table public.circle_invitation_events enable row level security;

drop policy if exists circles_select_authenticated on public.circles;
drop policy if exists circles_insert_authenticated on public.circles;
drop policy if exists circles_update_owner on public.circles;
drop policy if exists circles_delete_owner on public.circles;

create policy circles_select_member_or_invited
on public.circles
for select
to authenticated
using (
  created_by = auth.uid()
  or public.is_circle_active_member(id, auth.uid())
  or exists (
    select 1
    from public.circle_invitations ci
    where ci.circle_id = circles.id
      and ci.target_user_id = auth.uid()
      and ci.status = 'pending'::public.circle_invitation_status
      and ci.expires_at > timezone('utc', now())
  )
);

create policy circles_insert_owner
on public.circles
for insert
to authenticated
with check (auth.uid() = created_by);

create policy circles_update_manager
on public.circles
for update
to authenticated
using (public.is_circle_manager(id, auth.uid()))
with check (public.is_circle_manager(id, auth.uid()));

create policy circles_delete_owner_only
on public.circles
for delete
to authenticated
using (public.is_circle_owner(id, auth.uid()));

drop policy if exists circle_members_select_authenticated on public.circle_members;
drop policy if exists circle_members_insert_self on public.circle_members;
drop policy if exists circle_members_delete_self_or_owner on public.circle_members;
drop policy if exists circle_members_select_active_members on public.circle_members;
drop policy if exists circle_members_insert_none on public.circle_members;
drop policy if exists circle_members_update_none on public.circle_members;
drop policy if exists circle_members_delete_none on public.circle_members;

create policy circle_members_select_active_members
on public.circle_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_circle_active_member(circle_id, auth.uid())
);

create policy circle_members_insert_none
on public.circle_members
for insert
to authenticated
with check (false);

create policy circle_members_update_none
on public.circle_members
for update
to authenticated
using (false)
with check (false);

create policy circle_members_delete_none
on public.circle_members
for delete
to authenticated
using (false);

drop policy if exists circle_invitations_select_relevant on public.circle_invitations;
drop policy if exists circle_invitations_insert_none on public.circle_invitations;
drop policy if exists circle_invitations_update_none on public.circle_invitations;
drop policy if exists circle_invitations_delete_none on public.circle_invitations;

create policy circle_invitations_select_relevant
on public.circle_invitations
for select
to authenticated
using (
  inviter_user_id = auth.uid()
  or target_user_id = auth.uid()
  or public.is_circle_manager(circle_id, auth.uid())
);

create policy circle_invitations_insert_none
on public.circle_invitations
for insert
to authenticated
with check (false);

create policy circle_invitations_update_none
on public.circle_invitations
for update
to authenticated
using (false)
with check (false);

create policy circle_invitations_delete_none
on public.circle_invitations
for delete
to authenticated
using (false);

drop policy if exists circle_invitation_events_select_relevant on public.circle_invitation_events;
drop policy if exists circle_invitation_events_write_none on public.circle_invitation_events;

create policy circle_invitation_events_select_relevant
on public.circle_invitation_events
for select
to authenticated
using (
  exists (
    select 1
    from public.circle_invitations ci
    where ci.id = circle_invitation_events.invitation_id
      and (
        ci.inviter_user_id = auth.uid()
        or ci.target_user_id = auth.uid()
        or public.is_circle_manager(ci.circle_id, auth.uid())
      )
  )
);

create policy circle_invitation_events_write_none
on public.circle_invitation_events
for all
to authenticated
using (false)
with check (false);

revoke all on function public.is_circle_active_member(uuid, uuid) from public;
revoke all on function public.is_circle_manager(uuid, uuid) from public;
revoke all on function public.is_circle_owner(uuid, uuid) from public;
revoke all on function public.normalize_external_contact(text) from public;
revoke all on function public.hash_external_contact(text) from public;
revoke all on function public.mask_external_contact(text) from public;
revoke all on function public.list_my_circles() from public;
revoke all on function public.list_shared_with_me() from public;
revoke all on function public.list_pending_circle_invites() from public;
revoke all on function public.search_invitable_users(uuid, text, integer) from public;
revoke all on function public.create_circle_invite(
  uuid,
  uuid,
  text,
  public.circle_invitation_channel,
  public.circle_membership_role,
  timestamptz
) from public;
revoke all on function public.accept_circle_invite(uuid, text) from public;
revoke all on function public.decline_circle_invite(uuid, text, text) from public;
revoke all on function public.revoke_circle_invite(uuid, text) from public;
revoke all on function public.list_circle_members(uuid) from public;
revoke all on function public.update_circle_member_role(uuid, uuid, public.circle_membership_role) from public;
revoke all on function public.remove_circle_member(uuid, uuid) from public;
revoke all on function public.circle_membership_role_rank(public.circle_membership_role) from public;

grant execute on function public.is_circle_active_member(uuid, uuid) to authenticated;
grant execute on function public.is_circle_manager(uuid, uuid) to authenticated;
grant execute on function public.is_circle_owner(uuid, uuid) to authenticated;
grant execute on function public.list_my_circles() to authenticated;
grant execute on function public.list_shared_with_me() to authenticated;
grant execute on function public.list_pending_circle_invites() to authenticated;
grant execute on function public.search_invitable_users(uuid, text, integer) to authenticated;
grant execute on function public.create_circle_invite(
  uuid,
  uuid,
  text,
  public.circle_invitation_channel,
  public.circle_membership_role,
  timestamptz
) to authenticated;
grant execute on function public.accept_circle_invite(uuid, text) to authenticated;
grant execute on function public.decline_circle_invite(uuid, text, text) to authenticated;
grant execute on function public.revoke_circle_invite(uuid, text) to authenticated;
grant execute on function public.list_circle_members(uuid) to authenticated;
grant execute on function public.update_circle_member_role(uuid, uuid, public.circle_membership_role) to authenticated;
grant execute on function public.remove_circle_member(uuid, uuid) to authenticated;

revoke all on function public.ensure_personal_circle(text, text) from public;
revoke all on function public.ensure_prayer_circle() from public;
revoke all on function public.ensure_events_circle() from public;
revoke all on function public.get_prayer_circle_members() from public;
revoke all on function public.get_events_circle_members() from public;
revoke all on function public.search_app_users_for_circle(text, integer) from public;
revoke all on function public.add_user_to_prayer_circle(uuid) from public;
revoke all on function public.add_user_to_events_circle(uuid) from public;
revoke all on function public.remove_user_from_prayer_circle(uuid) from public;
revoke all on function public.remove_user_from_events_circle(uuid) from public;
revoke all on function public.is_shared_solo_circle_member(uuid) from public;

grant execute on function public.ensure_personal_circle(text, text) to authenticated;
grant execute on function public.ensure_prayer_circle() to authenticated;
grant execute on function public.ensure_events_circle() to authenticated;
grant execute on function public.get_prayer_circle_members() to authenticated;
grant execute on function public.get_events_circle_members() to authenticated;
grant execute on function public.search_app_users_for_circle(text, integer) to authenticated;
grant execute on function public.add_user_to_prayer_circle(uuid) to authenticated;
grant execute on function public.add_user_to_events_circle(uuid) to authenticated;
grant execute on function public.remove_user_from_prayer_circle(uuid) to authenticated;
grant execute on function public.remove_user_from_events_circle(uuid) to authenticated;
grant execute on function public.is_shared_solo_circle_member(uuid) to authenticated;
