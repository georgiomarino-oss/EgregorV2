create or replace function public.hash_external_contact(p_contact text)
returns text
language sql
immutable
as $$
  select case
    when public.normalize_external_contact(p_contact) is null then null
    else encode(extensions.digest(public.normalize_external_contact(p_contact), 'sha256'), 'hex')
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