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
    insert into public.circles (name, description, created_by)
    values (btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''), v_user_id)
    returning id into v_circle_id;
  end if;

  insert into public.circle_members (circle_id, user_id)
  values (v_circle_id, v_user_id)
  on conflict (circle_id, user_id) do nothing;

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
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_circle_id := public.ensure_events_circle();

  return query
  select
    cm.user_id,
    coalesce(nullif(trim(p.display_name), ''), 'Member') as display_name,
    cm.joined_at,
    (cm.user_id = c.created_by) as is_owner
  from public.circle_members cm
  join public.circles c
    on c.id = cm.circle_id
  left join public.profiles p
    on p.id = cm.user_id
  where cm.circle_id = v_circle_id
  order by (cm.user_id = c.created_by) desc, cm.joined_at asc;
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
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_target_user_id is null then
    raise exception 'Target user is required';
  end if;

  if p_target_user_id = v_user_id then
    return;
  end if;

  v_circle_id := public.ensure_events_circle();

  insert into public.circle_members (circle_id, user_id)
  values (v_circle_id, p_target_user_id)
  on conflict (circle_id, user_id) do nothing;
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
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_target_user_id is null then
    raise exception 'Target user is required';
  end if;

  if p_target_user_id = v_user_id then
    raise exception 'Owner cannot be removed from own events circle';
  end if;

  select c.id
  into v_circle_id
  from public.circles c
  where c.created_by = v_user_id
    and lower(c.name) = lower('Events Circle')
  order by c.created_at asc
  limit 1;

  if v_circle_id is null then
    return;
  end if;

  delete from public.circle_members cm
  where cm.circle_id = v_circle_id
    and cm.user_id = p_target_user_id;
end;
$$;

revoke all on function public.ensure_personal_circle(text, text) from public;
revoke all on function public.ensure_events_circle() from public;
revoke all on function public.get_events_circle_members() from public;
revoke all on function public.add_user_to_events_circle(uuid) from public;
revoke all on function public.remove_user_from_events_circle(uuid) from public;

grant execute on function public.ensure_personal_circle(text, text) to authenticated;
grant execute on function public.ensure_events_circle() to authenticated;
grant execute on function public.get_events_circle_members() to authenticated;
grant execute on function public.add_user_to_events_circle(uuid) to authenticated;
grant execute on function public.remove_user_from_events_circle(uuid) to authenticated;
