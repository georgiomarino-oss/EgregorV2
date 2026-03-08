-- Phase 5A verification pass fixes:
-- 1) resolve PL/pgSQL ON CONFLICT column ambiguity in RETURNS TABLE functions
-- 2) ensure notification subscription upsert targets a named uniqueness constraint

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notification_subscriptions_uniqueness_key'
      and connamespace = 'public'::regnamespace
  ) then
    if exists (
      select 1
      from pg_class idx
      join pg_namespace nsp
        on nsp.oid = idx.relnamespace
      where nsp.nspname = 'public'
        and idx.relname = 'notification_subscriptions_uniqueness_idx'
        and idx.relkind = 'i'
    ) then
      alter table public.notification_subscriptions
        add constraint notification_subscriptions_uniqueness_key
        unique using index notification_subscriptions_uniqueness_idx;
    else
      alter table public.notification_subscriptions
        add constraint notification_subscriptions_uniqueness_key
        unique nulls not distinct (
          user_id,
          category,
          target_type,
          target_id,
          channel
        );
    end if;
  end if;
end
$$;

create or replace function public.has_operator_privileges()
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_jwt jsonb := auth.jwt();
  v_role_claim text := coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), '');
  v_app_metadata_claim text :=
    coalesce(nullif(current_setting('request.jwt.claim.app_metadata', true), ''), '');
  v_app_metadata jsonb := '{}'::jsonb;
begin
  if v_app_metadata_claim <> '' then
    begin
      v_app_metadata := v_app_metadata_claim::jsonb;
    exception
      when others then
        v_app_metadata := '{}'::jsonb;
    end;
  end if;

  return
    coalesce(v_role_claim, '') in ('service_role', 'supabase_admin')
    or coalesce(v_jwt ->> 'role', '') in ('service_role', 'supabase_admin')
    or coalesce(v_jwt -> 'app_metadata' ->> 'role', '') in ('moderator', 'admin', 'support')
    or coalesce(v_app_metadata ->> 'role', '') in ('moderator', 'admin', 'support');
end;
$$;

create or replace function public.register_device_push_target(
  p_installation_id text,
  p_device_token text,
  p_platform text,
  p_push_provider text default 'expo',
  p_locale text default null,
  p_timezone text default null,
  p_app_version text default null,
  p_build_number text default null,
  p_device_name text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  device_target_id uuid,
  user_id uuid,
  installation_id text,
  platform text,
  push_provider text,
  device_token text,
  disabled_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_installation_id text := nullif(btrim(coalesce(p_installation_id, '')), '');
  v_device_token text := nullif(btrim(coalesce(p_device_token, '')), '');
  v_platform text := lower(nullif(btrim(coalesce(p_platform, '')), ''));
  v_push_provider text := lower(coalesce(nullif(btrim(p_push_provider), ''), 'expo'));
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  if v_installation_id is null or v_device_token is null then
    raise exception 'Installation id and device token are required.';
  end if;

  if v_platform not in ('ios', 'android', 'web') then
    raise exception 'Unsupported platform.';
  end if;

  if v_push_provider not in ('expo', 'fcm', 'apns', 'webpush') then
    raise exception 'Unsupported push provider.';
  end if;

  update public.notification_device_targets target
  set
    disabled_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where target.push_provider = v_push_provider
    and target.device_token = v_device_token
    and target.user_id <> v_user_id;

  insert into public.notification_device_targets (
    user_id,
    installation_id,
    platform,
    push_provider,
    device_token,
    locale,
    timezone,
    app_version,
    build_number,
    device_name,
    token_last_verified_at,
    disabled_at,
    metadata
  )
  values (
    v_user_id,
    v_installation_id,
    v_platform,
    v_push_provider,
    v_device_token,
    nullif(btrim(p_locale), ''),
    nullif(btrim(p_timezone), ''),
    nullif(btrim(p_app_version), ''),
    nullif(btrim(p_build_number), ''),
    nullif(btrim(p_device_name), ''),
    timezone('utc', now()),
    null,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict on constraint notification_device_targets_user_id_installation_id_key do update
  set
    platform = excluded.platform,
    push_provider = excluded.push_provider,
    device_token = excluded.device_token,
    locale = excluded.locale,
    timezone = excluded.timezone,
    app_version = excluded.app_version,
    build_number = excluded.build_number,
    device_name = excluded.device_name,
    token_last_verified_at = timezone('utc', now()),
    disabled_at = null,
    metadata = coalesce(public.notification_device_targets.metadata, '{}'::jsonb)
      || coalesce(excluded.metadata, '{}'::jsonb),
    updated_at = timezone('utc', now());

  return query
  select
    target.id as device_target_id,
    target.user_id,
    target.installation_id,
    target.platform,
    target.push_provider,
    target.device_token,
    target.disabled_at,
    target.created_at,
    target.updated_at
  from public.notification_device_targets target
  where target.user_id = v_user_id
    and target.installation_id = v_installation_id
  limit 1;
end;
$$;

create or replace function public.update_notification_subscription(
  p_category public.notification_category,
  p_target_type public.notification_target_type default 'global',
  p_target_id uuid default null,
  p_channel public.notification_channel default 'push',
  p_enabled boolean default true,
  p_lead_minutes integer default 15,
  p_quiet_hours jsonb default '{}'::jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  subscription_id uuid,
  user_id uuid,
  category text,
  target_type text,
  target_id uuid,
  channel text,
  enabled boolean,
  lead_minutes integer,
  quiet_hours jsonb,
  metadata jsonb,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_subscription_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  if p_category is null then
    raise exception 'Notification category is required.';
  end if;

  if p_target_type = 'global'::public.notification_target_type and p_target_id is not null then
    raise exception 'Global notification subscriptions cannot specify target_id.';
  end if;

  if p_target_type <> 'global'::public.notification_target_type and p_target_id is null then
    raise exception 'Target id is required for non-global subscriptions.';
  end if;

  if p_target_type = 'event_occurrence'::public.notification_target_type
    and not public.can_access_event_occurrence(p_target_id, v_user_id)
  then
    raise exception 'You do not have access to this occurrence.';
  end if;

  if p_target_type = 'room'::public.notification_target_type
    and not public.can_access_room(p_target_id, v_user_id)
  then
    raise exception 'You do not have access to this room.';
  end if;

  if p_target_type = 'circle'::public.notification_target_type
    and not public.is_circle_active_member(p_target_id, v_user_id)
  then
    raise exception 'You do not have access to this circle.';
  end if;

  if p_target_type = 'circle_invite'::public.notification_target_type and not exists (
    select 1
    from public.circle_invitations ci
    where ci.id = p_target_id
      and (
        ci.inviter_user_id = v_user_id
        or ci.target_user_id = v_user_id
        or public.is_circle_manager(ci.circle_id, v_user_id)
      )
  ) then
    raise exception 'You do not have access to this invite notification target.';
  end if;

  insert into public.notification_subscriptions (
    user_id,
    category,
    target_type,
    target_id,
    channel,
    enabled,
    lead_minutes,
    quiet_hours,
    metadata
  )
  values (
    v_user_id,
    p_category,
    p_target_type,
    p_target_id,
    p_channel,
    coalesce(p_enabled, true),
    greatest(0, least(coalesce(p_lead_minutes, 15), 1440)),
    coalesce(p_quiet_hours, '{}'::jsonb),
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict on constraint notification_subscriptions_uniqueness_key do update
  set
    enabled = excluded.enabled,
    lead_minutes = excluded.lead_minutes,
    quiet_hours = excluded.quiet_hours,
    metadata = coalesce(public.notification_subscriptions.metadata, '{}'::jsonb)
      || coalesce(excluded.metadata, '{}'::jsonb),
    updated_at = timezone('utc', now())
  returning id into v_subscription_id;

  if p_category = 'occurrence_reminder'::public.notification_category
    and p_target_type = 'event_occurrence'::public.notification_target_type
  then
    perform *
    from public.save_event_reminder_preference(
      p_target_type => 'occurrence'::public.event_reminder_target_type,
      p_occurrence_id => p_target_id,
      p_enabled => coalesce(p_enabled, true),
      p_channel => p_channel::text,
      p_lead_minutes => greatest(0, least(coalesce(p_lead_minutes, 15), 1440))
    );
  elsif p_category = 'room_reminder'::public.notification_category
    and p_target_type = 'room'::public.notification_target_type
  then
    perform *
    from public.save_event_reminder_preference(
      p_target_type => 'room'::public.event_reminder_target_type,
      p_room_id => p_target_id,
      p_enabled => coalesce(p_enabled, true),
      p_channel => p_channel::text,
      p_lead_minutes => greatest(0, least(coalesce(p_lead_minutes, 15), 1440))
    );
  end if;

  return query
  select
    ns.id as subscription_id,
    ns.user_id,
    ns.category::text as category,
    ns.target_type::text as target_type,
    ns.target_id,
    ns.channel::text as channel,
    ns.enabled,
    ns.lead_minutes,
    ns.quiet_hours,
    ns.metadata,
    ns.updated_at
  from public.notification_subscriptions ns
  where ns.id = v_subscription_id
  limit 1;
end;
$$;

create or replace function public.block_user(
  p_blocked_user_id uuid,
  p_reason text default null
)
returns table (
  blocker_user_id uuid,
  blocked_user_id uuid,
  reason text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  if p_blocked_user_id is null then
    raise exception 'Blocked user id is required.';
  end if;

  if p_blocked_user_id = v_user_id then
    raise exception 'You cannot block yourself.';
  end if;

  insert into public.user_blocks (
    blocker_user_id,
    blocked_user_id,
    reason
  )
  values (
    v_user_id,
    p_blocked_user_id,
    nullif(btrim(p_reason), '')
  )
  on conflict on constraint user_blocks_pkey do update
  set
    reason = coalesce(nullif(btrim(excluded.reason), ''), public.user_blocks.reason),
    updated_at = timezone('utc', now());

  update public.circle_invitations ci
  set
    status = 'revoked'::public.circle_invitation_status,
    status_reason = 'invite blocked by user',
    responded_at = coalesce(ci.responded_at, timezone('utc', now())),
    revoked_at = coalesce(ci.revoked_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where ci.status = 'pending'::public.circle_invitation_status
    and (
      (ci.inviter_user_id = v_user_id and ci.target_user_id = p_blocked_user_id)
      or (ci.inviter_user_id = p_blocked_user_id and ci.target_user_id = v_user_id)
    );

  return query
  select
    ub.blocker_user_id,
    ub.blocked_user_id,
    ub.reason,
    ub.created_at,
    ub.updated_at
  from public.user_blocks ub
  where ub.blocker_user_id = v_user_id
    and ub.blocked_user_id = p_blocked_user_id
  limit 1;
end;
$$;
