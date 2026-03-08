create or replace function public.ensure_personal_circle(
  p_name text,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_circle_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'Circle name is required';
  end if;

  select c.id
  into v_circle_id
  from public.circles c
  where c.created_by = v_user_id
    and lower(c.name) = lower(btrim(p_name))
  order by c.created_at asc
  limit 1;

  if v_circle_id is null then
    insert into public.circles (name, description, created_by, visibility)
    values (
      btrim(p_name),
      nullif(btrim(coalesce(p_description, '')), ''),
      v_user_id,
      'private'
    )
    returning id into v_circle_id;
  end if;

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
    v_user_id,
    timezone('utc', now()),
    'owner'::public.circle_membership_role,
    'active'::public.circle_membership_status,
    null
  )
  on conflict (circle_id, user_id) do update
  set role = 'owner'::public.circle_membership_role,
      status = 'active'::public.circle_membership_status,
      left_at = null,
      updated_at = timezone('utc', now());

  return v_circle_id;
end;
$$;

create or replace function public.ensure_prayer_circle()
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.ensure_personal_circle('Prayer Circle', 'People praying with you.');
$$;

create or replace function public.ensure_events_circle()
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.ensure_personal_circle('Events Circle', 'People joining events with you.');
$$;

create or replace function public.list_my_circles()
returns table (
  circle_id uuid,
  name text,
  description text,
  created_by uuid,
  created_at timestamptz,
  visibility text,
  membership_role text,
  membership_status text,
  joined_at timestamptz,
  is_shared_with_me boolean,
  is_owner boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id as circle_id,
    c.name,
    c.description,
    c.created_by,
    c.created_at,
    c.visibility,
    cm.role::text as membership_role,
    cm.status::text as membership_status,
    cm.joined_at,
    (c.created_by <> auth.uid()) as is_shared_with_me,
    (cm.role = 'owner'::public.circle_membership_role) as is_owner
  from public.circle_members cm
  join public.circles c
    on c.id = cm.circle_id
  where cm.user_id = auth.uid()
    and cm.status = 'active'::public.circle_membership_status
  order by cm.joined_at desc;
$$;

create or replace function public.list_shared_with_me()
returns table (
  circle_id uuid,
  name text,
  description text,
  created_by uuid,
  created_at timestamptz,
  visibility text,
  membership_role text,
  membership_status text,
  joined_at timestamptz,
  is_shared_with_me boolean,
  is_owner boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id as circle_id,
    c.name,
    c.description,
    c.created_by,
    c.created_at,
    c.visibility,
    cm.role::text as membership_role,
    cm.status::text as membership_status,
    cm.joined_at,
    true as is_shared_with_me,
    (cm.role = 'owner'::public.circle_membership_role) as is_owner
  from public.circle_members cm
  join public.circles c
    on c.id = cm.circle_id
  where cm.user_id = auth.uid()
    and cm.status = 'active'::public.circle_membership_status
    and c.created_by <> auth.uid()
  order by cm.joined_at desc;
$$;

create or replace function public.list_pending_circle_invites()
returns table (
  invitation_id uuid,
  circle_id uuid,
  circle_name text,
  circle_description text,
  inviter_user_id uuid,
  inviter_display_name text,
  target_user_id uuid,
  target_contact_label text,
  invite_token text,
  channel text,
  status text,
  role_to_grant text,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.circle_invitations ci
  set status = 'expired'::public.circle_invitation_status
  where ci.status = 'pending'::public.circle_invitation_status
    and ci.target_user_id = auth.uid()
    and ci.expires_at <= timezone('utc', now());

  return query
  select
    ci.id as invitation_id,
    c.id as circle_id,
    c.name as circle_name,
    c.description as circle_description,
    ci.inviter_user_id,
    coalesce(nullif(btrim(inviter.display_name), ''), 'Member') as inviter_display_name,
    ci.target_user_id,
    ci.target_contact_label,
    ci.invite_token,
    ci.channel::text as channel,
    ci.status::text as status,
    ci.role_to_grant::text as role_to_grant,
    ci.expires_at,
    ci.created_at
  from public.circle_invitations ci
  join public.circles c
    on c.id = ci.circle_id
  left join public.profiles inviter
    on inviter.id = ci.inviter_user_id
  where ci.target_user_id = auth.uid()
    and ci.status = 'pending'::public.circle_invitation_status
    and ci.expires_at > timezone('utc', now())
  order by ci.created_at desc;
end;
$$;

create or replace function public.search_invitable_users(
  p_circle_id uuid,
  p_query text default null,
  p_limit integer default 20
)
returns table (
  user_id uuid,
  display_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_query text := nullif(btrim(coalesce(p_query, '')), '');
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_circle_id is null then
    raise exception 'Circle is required';
  end if;

  if not public.is_circle_manager(p_circle_id, auth.uid()) then
    raise exception 'Only circle managers can search invitable users';
  end if;

  return query
  select
    p.id as user_id,
    coalesce(nullif(btrim(p.display_name), ''), 'Member') as display_name
  from public.profiles p
  where p.id <> auth.uid()
    and (
      v_query is null
      or coalesce(p.display_name, '') ilike ('%' || v_query || '%')
    )
    and not exists (
      select 1
      from public.circle_members cm
      where cm.circle_id = p_circle_id
        and cm.user_id = p.id
        and cm.status = 'active'::public.circle_membership_status
    )
    and not exists (
      select 1
      from public.circle_invitations ci
      where ci.circle_id = p_circle_id
        and ci.target_user_id = p.id
        and ci.status = 'pending'::public.circle_invitation_status
        and ci.expires_at > timezone('utc', now())
    )
  order by coalesce(nullif(btrim(p.display_name), ''), 'Member') asc
  limit v_limit;
end;
$$;

create or replace function public.create_circle_invite(
  p_circle_id uuid,
  p_target_user_id uuid default null,
  p_target_contact text default null,
  p_channel public.circle_invitation_channel default 'in_app',
  p_role_to_grant public.circle_membership_role default 'member',
  p_expires_at timestamptz default null
)
returns table (
  invitation_id uuid,
  circle_id uuid,
  inviter_user_id uuid,
  target_user_id uuid,
  target_contact_label text,
  invite_token text,
  channel text,
  status text,
  role_to_grant text,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_expires_at timestamptz := coalesce(p_expires_at, timezone('utc', now()) + interval '7 days');
  v_target_contact_hash text := public.hash_external_contact(p_target_contact);
  v_target_contact_label text := public.mask_external_contact(p_target_contact);
  v_invitation public.circle_invitations%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_circle_id is null then
    raise exception 'Circle is required';
  end if;

  if not public.is_circle_manager(p_circle_id, v_user_id) then
    raise exception 'Only circle managers can send invites';
  end if;

  if p_target_user_id is null and v_target_contact_hash is null then
    raise exception 'Provide an existing user target or external contact';
  end if;

  if p_target_user_id = v_user_id then
    raise exception 'You cannot invite yourself';
  end if;

  if v_expires_at <= timezone('utc', now()) then
    raise exception 'Invite expiry must be in the future';
  end if;

  if p_target_user_id is not null and exists (
    select 1
    from public.circle_members cm
    where cm.circle_id = p_circle_id
      and cm.user_id = p_target_user_id
      and cm.status = 'active'::public.circle_membership_status
  ) then
    raise exception 'Target user is already an active member';
  end if;

  begin
    insert into public.circle_invitations (
      circle_id,
      inviter_user_id,
      target_user_id,
      target_contact_hash,
      target_contact_label,
      channel,
      status,
      role_to_grant,
      expires_at
    )
    values (
      p_circle_id,
      v_user_id,
      p_target_user_id,
      v_target_contact_hash,
      v_target_contact_label,
      p_channel,
      'pending'::public.circle_invitation_status,
      p_role_to_grant,
      v_expires_at
    )
    returning * into v_invitation;
  exception
    when unique_violation then
      if p_target_user_id is not null then
        select *
        into v_invitation
        from public.circle_invitations ci
        where ci.circle_id = p_circle_id
          and ci.target_user_id = p_target_user_id
          and ci.status = 'pending'::public.circle_invitation_status
        order by ci.created_at desc
        limit 1;
      else
        select *
        into v_invitation
        from public.circle_invitations ci
        where ci.circle_id = p_circle_id
          and ci.target_user_id is null
          and ci.target_contact_hash = v_target_contact_hash
          and ci.status = 'pending'::public.circle_invitation_status
        order by ci.created_at desc
        limit 1;
      end if;

      if v_invitation.id is null then
        raise;
      end if;
  end;

  return query
  select
    v_invitation.id as invitation_id,
    v_invitation.circle_id,
    v_invitation.inviter_user_id,
    v_invitation.target_user_id,
    v_invitation.target_contact_label,
    v_invitation.invite_token,
    v_invitation.channel::text as channel,
    v_invitation.status::text as status,
    v_invitation.role_to_grant::text as role_to_grant,
    v_invitation.expires_at,
    v_invitation.created_at;
end;
$$;

create or replace function public.accept_circle_invite(
  p_invitation_id uuid default null,
  p_invite_token text default null
)
returns table (
  invitation_id uuid,
  circle_id uuid,
  membership_role text,
  membership_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invitation public.circle_invitations%rowtype;
  v_membership public.circle_members%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_invitation_id is null and (p_invite_token is null or btrim(p_invite_token) = '') then
    raise exception 'Invitation id or token is required';
  end if;

  if p_invitation_id is not null then
    select *
    into v_invitation
    from public.circle_invitations ci
    where ci.id = p_invitation_id
    for update;
  else
    select *
    into v_invitation
    from public.circle_invitations ci
    where ci.invite_token = btrim(p_invite_token)
    for update;
  end if;

  if v_invitation.id is null then
    raise exception 'Invitation not found';
  end if;

  if v_invitation.status <> 'pending'::public.circle_invitation_status then
    raise exception 'Invitation is not pending';
  end if;

  if v_invitation.expires_at <= timezone('utc', now()) then
    update public.circle_invitations
    set status = 'expired'::public.circle_invitation_status
    where id = v_invitation.id
      and status = 'pending'::public.circle_invitation_status;

    raise exception 'Invitation has expired';
  end if;

  if v_invitation.target_user_id is not null and v_invitation.target_user_id <> v_user_id then
    raise exception 'This invitation is not assigned to the current user';
  end if;

  if v_invitation.target_user_id is null then
    update public.circle_invitations
    set target_user_id = v_user_id
    where id = v_invitation.id;
  end if;

  insert into public.circle_members (
    circle_id,
    user_id,
    joined_at,
    role,
    status,
    source_invitation_id,
    left_at
  )
  values (
    v_invitation.circle_id,
    v_user_id,
    timezone('utc', now()),
    v_invitation.role_to_grant,
    'active'::public.circle_membership_status,
    v_invitation.id,
    null
  )
  on conflict on constraint circle_members_pkey do update
  set status = 'active'::public.circle_membership_status,
      left_at = null,
      source_invitation_id = excluded.source_invitation_id,
      role = case
        when circle_members.role = 'owner'::public.circle_membership_role
          then circle_members.role
        else excluded.role
      end,
      updated_at = timezone('utc', now());

  update public.circle_invitations
  set status = 'accepted'::public.circle_invitation_status,
      target_user_id = v_user_id
  where id = v_invitation.id;

  select *
  into v_membership
  from public.circle_members cm
  where cm.circle_id = v_invitation.circle_id
    and cm.user_id = v_user_id
  limit 1;

  return query
  select
    v_invitation.id as invitation_id,
    v_invitation.circle_id,
    v_membership.role::text as membership_role,
    v_membership.status::text as membership_status;
end;
$$;

create or replace function public.decline_circle_invite(
  p_invitation_id uuid default null,
  p_invite_token text default null,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invitation public.circle_invitations%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_invitation_id is null and (p_invite_token is null or btrim(p_invite_token) = '') then
    raise exception 'Invitation id or token is required';
  end if;

  if p_invitation_id is not null then
    select *
    into v_invitation
    from public.circle_invitations ci
    where ci.id = p_invitation_id
    for update;
  else
    select *
    into v_invitation
    from public.circle_invitations ci
    where ci.invite_token = btrim(p_invite_token)
    for update;
  end if;

  if v_invitation.id is null then
    raise exception 'Invitation not found';
  end if;

  if v_invitation.status <> 'pending'::public.circle_invitation_status then
    raise exception 'Invitation is not pending';
  end if;

  if v_invitation.expires_at <= timezone('utc', now()) then
    update public.circle_invitations
    set status = 'expired'::public.circle_invitation_status,
        status_reason = coalesce(nullif(btrim(p_reason), ''), status_reason)
    where id = v_invitation.id
      and status = 'pending'::public.circle_invitation_status;

    raise exception 'Invitation has expired';
  end if;

  if v_invitation.target_user_id is not null and v_invitation.target_user_id <> v_user_id then
    raise exception 'This invitation is not assigned to the current user';
  end if;

  update public.circle_invitations
  set status = 'declined'::public.circle_invitation_status,
      target_user_id = coalesce(v_invitation.target_user_id, v_user_id),
      status_reason = nullif(btrim(p_reason), '')
  where id = v_invitation.id;
end;
$$;

create or replace function public.revoke_circle_invite(
  p_invitation_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invitation public.circle_invitations%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_invitation_id is null then
    raise exception 'Invitation id is required';
  end if;

  select *
  into v_invitation
  from public.circle_invitations ci
  where ci.id = p_invitation_id
  for update;

  if v_invitation.id is null then
    raise exception 'Invitation not found';
  end if;

  if v_invitation.status <> 'pending'::public.circle_invitation_status then
    raise exception 'Only pending invitations can be revoked';
  end if;

  if v_invitation.inviter_user_id <> v_user_id
    and not public.is_circle_manager(v_invitation.circle_id, v_user_id)
  then
    raise exception 'Only the inviter or a circle manager can revoke this invite';
  end if;

  update public.circle_invitations
  set status = 'revoked'::public.circle_invitation_status,
      status_reason = nullif(btrim(p_reason), '')
  where id = v_invitation.id;
end;
$$;

create or replace function public.list_circle_members(p_circle_id uuid)
returns table (
  user_id uuid,
  display_name text,
  joined_at timestamptz,
  is_owner boolean,
  role text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_circle_id is null then
    raise exception 'Circle is required';
  end if;

  if not public.is_circle_active_member(p_circle_id, auth.uid()) then
    raise exception 'Not authorized to view members for this circle';
  end if;

  return query
  select
    cm.user_id,
    coalesce(nullif(btrim(p.display_name), ''), 'Member') as display_name,
    cm.joined_at,
    (cm.role = 'owner'::public.circle_membership_role) as is_owner,
    cm.role::text as role,
    cm.status::text as status
  from public.circle_members cm
  left join public.profiles p
    on p.id = cm.user_id
  where cm.circle_id = p_circle_id
    and cm.status = 'active'::public.circle_membership_status
  order by
    public.circle_membership_role_rank(cm.role) desc,
    cm.joined_at asc;
end;
$$;

create or replace function public.update_circle_member_role(
  p_circle_id uuid,
  p_target_user_id uuid,
  p_role public.circle_membership_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_actor_role public.circle_membership_role;
  v_target_role public.circle_membership_role;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_circle_id is null or p_target_user_id is null then
    raise exception 'Circle and target user are required';
  end if;

  select cm.role
  into v_actor_role
  from public.circle_members cm
  where cm.circle_id = p_circle_id
    and cm.user_id = v_user_id
    and cm.status = 'active'::public.circle_membership_status;

  if v_actor_role is null then
    raise exception 'Only active members can manage roles';
  end if;

  if v_actor_role not in (
    'owner'::public.circle_membership_role,
    'steward'::public.circle_membership_role
  ) then
    raise exception 'Only circle managers can update roles';
  end if;

  select cm.role
  into v_target_role
  from public.circle_members cm
  where cm.circle_id = p_circle_id
    and cm.user_id = p_target_user_id
    and cm.status = 'active'::public.circle_membership_status;

  if v_target_role is null then
    raise exception 'Target user is not an active member';
  end if;

  if v_actor_role = 'steward'::public.circle_membership_role then
    if p_role <> 'member'::public.circle_membership_role then
      raise exception 'Stewards can only set member role';
    end if;

    if v_target_role <> 'member'::public.circle_membership_role then
      raise exception 'Stewards cannot modify owner or steward roles';
    end if;
  end if;

  if p_role = 'owner'::public.circle_membership_role
    and v_actor_role <> 'owner'::public.circle_membership_role
  then
    raise exception 'Only owners can grant owner role';
  end if;

  if v_target_role = 'owner'::public.circle_membership_role
    and v_actor_role <> 'owner'::public.circle_membership_role
  then
    raise exception 'Only owners can modify owner roles';
  end if;

  update public.circle_members cm
  set role = p_role,
      updated_at = timezone('utc', now())
  where cm.circle_id = p_circle_id
    and cm.user_id = p_target_user_id
    and cm.status = 'active'::public.circle_membership_status;
end;
$$;

create or replace function public.remove_circle_member(
  p_circle_id uuid,
  p_target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_actor_role public.circle_membership_role;
  v_target_role public.circle_membership_role;
  v_other_owners integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_circle_id is null or p_target_user_id is null then
    raise exception 'Circle and target user are required';
  end if;

  select cm.role
  into v_target_role
  from public.circle_members cm
  where cm.circle_id = p_circle_id
    and cm.user_id = p_target_user_id
    and cm.status = 'active'::public.circle_membership_status;

  if v_target_role is null then
    return;
  end if;

  if p_target_user_id = v_user_id then
    select cm.role
    into v_actor_role
    from public.circle_members cm
    where cm.circle_id = p_circle_id
      and cm.user_id = v_user_id
      and cm.status = 'active'::public.circle_membership_status;

    if v_actor_role is null then
      raise exception 'Not an active circle member';
    end if;

    if v_actor_role = 'owner'::public.circle_membership_role then
      select count(*)
      into v_other_owners
      from public.circle_members cm
      where cm.circle_id = p_circle_id
        and cm.status = 'active'::public.circle_membership_status
        and cm.role = 'owner'::public.circle_membership_role
        and cm.user_id <> v_user_id;

      if coalesce(v_other_owners, 0) = 0 then
        raise exception 'Cannot remove the last owner from a circle';
      end if;
    end if;

    update public.circle_members cm
    set status = 'removed'::public.circle_membership_status,
        left_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
    where cm.circle_id = p_circle_id
      and cm.user_id = p_target_user_id;

    return;
  end if;

  select cm.role
  into v_actor_role
  from public.circle_members cm
  where cm.circle_id = p_circle_id
    and cm.user_id = v_user_id
    and cm.status = 'active'::public.circle_membership_status;

  if v_actor_role not in (
    'owner'::public.circle_membership_role,
    'steward'::public.circle_membership_role
  ) then
    raise exception 'Only circle managers can remove other members';
  end if;

  if v_target_role = 'owner'::public.circle_membership_role then
    if v_actor_role <> 'owner'::public.circle_membership_role then
      raise exception 'Only owners can remove an owner';
    end if;

    select count(*)
    into v_other_owners
    from public.circle_members cm
    where cm.circle_id = p_circle_id
      and cm.status = 'active'::public.circle_membership_status
      and cm.role = 'owner'::public.circle_membership_role
      and cm.user_id <> p_target_user_id;

    if coalesce(v_other_owners, 0) = 0 then
      raise exception 'Cannot remove the last owner from a circle';
    end if;
  end if;

  if v_actor_role = 'steward'::public.circle_membership_role
    and v_target_role <> 'member'::public.circle_membership_role
  then
    raise exception 'Stewards can only remove members';
  end if;

  update public.circle_members cm
  set status = 'removed'::public.circle_membership_status,
      left_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where cm.circle_id = p_circle_id
    and cm.user_id = p_target_user_id;
end;
$$;
