create or replace function public.get_circle_invite_preview_by_token(
  p_invite_token text
)
returns table (
  invitation_id uuid,
  circle_id uuid,
  circle_name text,
  circle_description text,
  inviter_user_id uuid,
  inviter_display_name text,
  target_user_id uuid,
  target_contact_label text,
  channel text,
  status text,
  role_to_grant text,
  expires_at timestamptz,
  created_at timestamptz,
  responded_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_token text := nullif(btrim(p_invite_token), '');
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_token is null then
    raise exception 'Invite token is required';
  end if;

  update public.circle_invitations ci
  set status = 'expired'::public.circle_invitation_status
  where ci.invite_token = v_token
    and ci.status = 'pending'::public.circle_invitation_status
    and ci.expires_at <= timezone('utc', now());

  return query
  select
    ci.id as invitation_id,
    ci.circle_id,
    c.name as circle_name,
    c.description as circle_description,
    ci.inviter_user_id,
    coalesce(nullif(btrim(inviter.display_name), ''), 'Member') as inviter_display_name,
    ci.target_user_id,
    ci.target_contact_label,
    ci.channel::text as channel,
    ci.status::text as status,
    ci.role_to_grant::text as role_to_grant,
    ci.expires_at,
    ci.created_at,
    ci.responded_at
  from public.circle_invitations ci
  join public.circles c
    on c.id = ci.circle_id
  left join public.profiles inviter
    on inviter.id = ci.inviter_user_id
  where ci.invite_token = v_token
    and (
      ci.target_user_id is null
      or ci.target_user_id = v_user_id
      or ci.inviter_user_id = v_user_id
      or public.is_circle_manager(ci.circle_id, v_user_id)
    )
  limit 1;
end;
$$;

revoke all on function public.get_circle_invite_preview_by_token(text) from public;
grant execute on function public.get_circle_invite_preview_by_token(text) to authenticated;