do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'notification_channel'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.notification_channel as enum ('push', 'email', 'in_app');
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'notification_target_type'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.notification_target_type as enum (
      'global',
      'event_occurrence',
      'room',
      'circle',
      'circle_invite'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'notification_category'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.notification_category as enum (
      'daily_rhythm',
      'global_moment',
      'circle_event',
      'emergency',
      'invite',
      'circle_social',
      'occurrence_reminder',
      'room_reminder'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'notification_queue_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.notification_queue_status as enum (
      'pending',
      'processing',
      'sent',
      'failed',
      'cancelled'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'privacy_visibility'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.privacy_visibility as enum ('public', 'circles_only', 'hidden');
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'moderation_target_type'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.moderation_target_type as enum (
      'user',
      'circle',
      'event_occurrence',
      'room',
      'invite'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'moderation_reason_code'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.moderation_reason_code as enum (
      'abuse',
      'harassment',
      'spam',
      'self_harm_concern',
      'other'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'moderation_report_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.moderation_report_status as enum (
      'open',
      'triaged',
      'resolved',
      'dismissed'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'moderation_action_type'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.moderation_action_type as enum (
      'note',
      'warn',
      'remove',
      'suspend',
      'block',
      'escalate'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'account_deletion_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.account_deletion_status as enum (
      'requested',
      'acknowledged',
      'in_review',
      'completed',
      'rejected',
      'cancelled'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'profile_account_state'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.profile_account_state as enum (
      'active',
      'deletion_requested',
      'deleted',
      'suspended'
    );
  end if;
end
$$;

alter table public.profiles
  add column if not exists username text,
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists locale text,
  add column if not exists presence_visibility public.privacy_visibility not null default 'circles_only',
  add column if not exists account_state public.profile_account_state not null default 'active',
  add column if not exists deleted_at timestamptz;

create unique index if not exists profiles_username_unique_idx
on public.profiles(lower(username))
where username is not null and btrim(username) <> '';

create table if not exists public.user_privacy_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  member_list_visibility public.privacy_visibility not null default 'circles_only',
  live_presence_visibility public.privacy_visibility not null default 'circles_only',
  allow_direct_invites boolean not null default true,
  allow_circle_invites boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists user_privacy_settings_set_updated_at on public.user_privacy_settings;
create trigger user_privacy_settings_set_updated_at
before update on public.user_privacy_settings
for each row
execute function public.handle_updated_at();

create table if not exists public.user_blocks (
  blocker_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_user_id, blocked_user_id),
  constraint user_blocks_no_self_block check (blocker_user_id <> blocked_user_id)
);

create index if not exists user_blocks_blocked_lookup_idx
on public.user_blocks(blocked_user_id, created_at desc);

drop trigger if exists user_blocks_set_updated_at on public.user_blocks;
create trigger user_blocks_set_updated_at
before update on public.user_blocks
for each row
execute function public.handle_updated_at();

create or replace function public.ensure_user_privacy_settings(
  p_user_id uuid default auth.uid()
)
returns public.user_privacy_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := coalesce(p_user_id, auth.uid());
  v_settings public.user_privacy_settings%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  insert into public.user_privacy_settings (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select *
  into v_settings
  from public.user_privacy_settings ups
  where ups.user_id = v_user_id;

  return v_settings;
end;
$$;

insert into public.user_privacy_settings (user_id)
select p.id
from public.profiles p
on conflict (user_id) do nothing;

create or replace function public.share_active_circle_membership(
  p_left_user_id uuid,
  p_right_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.circle_members left_member
    join public.circle_members right_member
      on right_member.circle_id = left_member.circle_id
    where left_member.user_id = p_left_user_id
      and right_member.user_id = p_right_user_id
      and left_member.status = 'active'::public.circle_membership_status
      and right_member.status = 'active'::public.circle_membership_status
  );
$$;

create or replace function public.is_user_blocked(
  p_left_user_id uuid,
  p_right_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_blocks ub
    where (ub.blocker_user_id = p_left_user_id and ub.blocked_user_id = p_right_user_id)
       or (ub.blocker_user_id = p_right_user_id and ub.blocked_user_id = p_left_user_id)
  );
$$;

create or replace function public.can_user_see_member_in_circle(
  p_viewer_user_id uuid,
  p_subject_user_id uuid,
  p_circle_id uuid default null
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  with visibility as (
    select coalesce(ups.member_list_visibility, 'circles_only'::public.privacy_visibility) as value
    from public.user_privacy_settings ups
    where ups.user_id = p_subject_user_id
    limit 1
  )
  select case
    when p_viewer_user_id is null or p_subject_user_id is null then false
    when p_viewer_user_id = p_subject_user_id then true
    when public.is_user_blocked(p_viewer_user_id, p_subject_user_id) then false
    when coalesce((select value from visibility), 'circles_only'::public.privacy_visibility)
      = 'public'::public.privacy_visibility
      then true
    when coalesce((select value from visibility), 'circles_only'::public.privacy_visibility)
      = 'circles_only'::public.privacy_visibility
      then public.share_active_circle_membership(p_viewer_user_id, p_subject_user_id)
    else false
  end;
$$;

create or replace function public.can_user_see_presence(
  p_viewer_user_id uuid,
  p_subject_user_id uuid,
  p_circle_id uuid default null
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  with visibility as (
    select coalesce(ups.live_presence_visibility, 'circles_only'::public.privacy_visibility) as value
    from public.user_privacy_settings ups
    where ups.user_id = p_subject_user_id
    limit 1
  )
  select case
    when p_viewer_user_id is null or p_subject_user_id is null then false
    when p_viewer_user_id = p_subject_user_id then true
    when public.is_user_blocked(p_viewer_user_id, p_subject_user_id) then false
    when coalesce((select value from visibility), 'circles_only'::public.privacy_visibility)
      = 'public'::public.privacy_visibility
      then true
    when coalesce((select value from visibility), 'circles_only'::public.privacy_visibility)
      = 'circles_only'::public.privacy_visibility
      then public.share_active_circle_membership(p_viewer_user_id, p_subject_user_id)
    else false
  end;
$$;

create or replace function public.can_receive_circle_invite(
  p_target_user_id uuid,
  p_inviter_user_id uuid,
  p_circle_id uuid default null
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  with settings as (
    select
      coalesce(ups.allow_direct_invites, true) as allow_direct_invites,
      coalesce(ups.allow_circle_invites, true) as allow_circle_invites
    from public.user_privacy_settings ups
    where ups.user_id = p_target_user_id
    limit 1
  )
  select
    p_target_user_id is not null
    and p_inviter_user_id is not null
    and p_target_user_id <> p_inviter_user_id
    and not public.is_user_blocked(p_target_user_id, p_inviter_user_id)
    and (
      coalesce((select allow_circle_invites from settings), true)
      or p_circle_id is null
    )
    and (
      coalesce((select allow_direct_invites from settings), true)
      or public.share_active_circle_membership(p_target_user_id, p_inviter_user_id)
    );
$$;

create table if not exists public.notification_device_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  installation_id text not null,
  platform text not null,
  push_provider text not null default 'expo',
  device_token text not null,
  locale text,
  timezone text,
  app_version text,
  build_number text,
  device_name text,
  token_last_verified_at timestamptz not null default timezone('utc', now()),
  disabled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint notification_device_targets_platform_check check (
    platform in ('ios', 'android', 'web')
  ),
  constraint notification_device_targets_provider_check check (
    push_provider in ('expo', 'fcm', 'apns', 'webpush')
  ),
  unique (user_id, installation_id)
);

create index if not exists notification_device_targets_user_active_idx
on public.notification_device_targets(user_id, disabled_at, updated_at desc);

create index if not exists notification_device_targets_provider_token_idx
on public.notification_device_targets(push_provider, device_token);

drop trigger if exists notification_device_targets_set_updated_at on public.notification_device_targets;
create trigger notification_device_targets_set_updated_at
before update on public.notification_device_targets
for each row
execute function public.handle_updated_at();

create table if not exists public.notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category public.notification_category not null,
  target_type public.notification_target_type not null default 'global',
  target_id uuid,
  channel public.notification_channel not null default 'push',
  enabled boolean not null default true,
  lead_minutes integer not null default 15 check (lead_minutes >= 0 and lead_minutes <= 1440),
  quiet_hours jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint notification_subscriptions_target_match check (
    (target_type = 'global'::public.notification_target_type and target_id is null)
    or (target_type <> 'global'::public.notification_target_type and target_id is not null)
  )
);

create unique index if not exists notification_subscriptions_uniqueness_idx
on public.notification_subscriptions(
  user_id,
  category,
  target_type,
  target_id,
  channel
) nulls not distinct;

create index if not exists notification_subscriptions_user_idx
on public.notification_subscriptions(user_id, category, updated_at desc);

drop trigger if exists notification_subscriptions_set_updated_at on public.notification_subscriptions;
create trigger notification_subscriptions_set_updated_at
before update on public.notification_subscriptions
for each row
execute function public.handle_updated_at();

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
select
  erp.user_id,
  case
    when erp.target_type = 'occurrence'::public.event_reminder_target_type
      then 'occurrence_reminder'::public.notification_category
    when erp.target_type = 'room'::public.event_reminder_target_type
      then 'room_reminder'::public.notification_category
    else 'circle_social'::public.notification_category
  end as category,
  case
    when erp.target_type = 'occurrence'::public.event_reminder_target_type
      then 'event_occurrence'::public.notification_target_type
    when erp.target_type = 'room'::public.event_reminder_target_type
      then 'room'::public.notification_target_type
    else 'global'::public.notification_target_type
  end as target_type,
  case
    when erp.target_type = 'occurrence'::public.event_reminder_target_type then erp.occurrence_id
    when erp.target_type = 'room'::public.event_reminder_target_type then erp.room_id
    else null
  end as target_id,
  case erp.channel
    when 'email' then 'email'::public.notification_channel
    when 'in_app' then 'in_app'::public.notification_channel
    else 'push'::public.notification_channel
  end as channel,
  erp.enabled,
  erp.lead_minutes,
  erp.quiet_hours,
  jsonb_build_object(
    'source', 'event_reminder_preferences',
    'series_id', erp.series_id
  ) as metadata
from public.event_reminder_preferences erp
on conflict (
  user_id,
  category,
  target_type,
  target_id,
  channel
) do update
set
  enabled = excluded.enabled,
  lead_minutes = excluded.lead_minutes,
  quiet_hours = excluded.quiet_hours,
  metadata = coalesce(public.notification_subscriptions.metadata, '{}'::jsonb)
    || excluded.metadata,
  updated_at = timezone('utc', now());

create table if not exists public.notification_queue (
  id bigint generated by default as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.notification_subscriptions(id) on delete set null,
  category public.notification_category not null,
  target_type public.notification_target_type not null default 'global',
  target_id uuid,
  channel public.notification_channel not null default 'push',
  status public.notification_queue_status not null default 'pending',
  scheduled_for timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists notification_queue_status_schedule_idx
on public.notification_queue(status, scheduled_for, created_at);

create index if not exists notification_queue_user_idx
on public.notification_queue(user_id, created_at desc);

drop trigger if exists notification_queue_set_updated_at on public.notification_queue;
create trigger notification_queue_set_updated_at
before update on public.notification_queue
for each row
execute function public.handle_updated_at();

create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references auth.users(id) on delete set null,
  target_type public.moderation_target_type not null,
  target_id uuid not null,
  reason_code public.moderation_reason_code not null,
  details text,
  evidence jsonb not null default '{}'::jsonb,
  status public.moderation_report_status not null default 'open',
  support_route text,
  support_metadata jsonb not null default '{}'::jsonb,
  assigned_operator_user_id uuid references auth.users(id) on delete set null,
  triaged_at timestamptz,
  resolved_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists moderation_reports_reporter_idx
on public.moderation_reports(reporter_user_id, created_at desc);

create index if not exists moderation_reports_status_idx
on public.moderation_reports(status, created_at desc);

drop trigger if exists moderation_reports_set_updated_at on public.moderation_reports;
create trigger moderation_reports_set_updated_at
before update on public.moderation_reports
for each row
execute function public.handle_updated_at();

create table if not exists public.moderation_actions (
  id bigint generated by default as identity primary key,
  report_id uuid not null references public.moderation_reports(id) on delete cascade,
  action_type public.moderation_action_type not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists moderation_actions_report_idx
on public.moderation_actions(report_id, created_at desc);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.account_deletion_status not null default 'requested',
  reason text,
  details text,
  support_route text,
  support_metadata jsonb not null default '{}'::jsonb,
  requested_at timestamptz not null default timezone('utc', now()),
  acknowledged_at timestamptz,
  in_review_at timestamptz,
  processed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists account_deletion_requests_active_unique_idx
on public.account_deletion_requests(user_id)
where status in (
  'requested'::public.account_deletion_status,
  'acknowledged'::public.account_deletion_status,
  'in_review'::public.account_deletion_status
);

create index if not exists account_deletion_requests_user_created_idx
on public.account_deletion_requests(user_id, created_at desc);

drop trigger if exists account_deletion_requests_set_updated_at on public.account_deletion_requests;
create trigger account_deletion_requests_set_updated_at
before update on public.account_deletion_requests
for each row
execute function public.handle_updated_at();

create or replace function public.has_operator_privileges()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin')
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('moderator', 'admin', 'support');
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
  on conflict (user_id, installation_id) do update
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
  on conflict (
    user_id,
    category,
    target_type,
    target_id,
    channel
  ) do update
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

create or replace function public.list_my_notification_preferences()
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
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
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
    ns.created_at,
    ns.updated_at
  from public.notification_subscriptions ns
  where ns.user_id = auth.uid()
  order by ns.updated_at desc, ns.created_at desc;
$$;

create or replace function public.enqueue_invite_notification(
  p_invitation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.circle_invitations%rowtype;
begin
  if p_invitation_id is null then
    return;
  end if;

  select *
  into v_invitation
  from public.circle_invitations ci
  where ci.id = p_invitation_id
  limit 1;

  if v_invitation.id is null
    or v_invitation.target_user_id is null
    or v_invitation.status <> 'pending'::public.circle_invitation_status
  then
    return;
  end if;

  if public.is_user_blocked(v_invitation.inviter_user_id, v_invitation.target_user_id) then
    return;
  end if;

  if exists (
    select 1
    from public.notification_subscriptions ns
    where ns.user_id = v_invitation.target_user_id
      and ns.category = 'invite'::public.notification_category
      and ns.target_type = 'global'::public.notification_target_type
      and ns.channel = 'push'::public.notification_channel
      and ns.enabled = false
  ) then
    return;
  end if;

  insert into public.notification_queue (
    user_id,
    category,
    target_type,
    target_id,
    channel,
    status,
    scheduled_for,
    payload
  )
  values (
    v_invitation.target_user_id,
    'invite'::public.notification_category,
    'circle_invite'::public.notification_target_type,
    v_invitation.id,
    'push'::public.notification_channel,
    'pending'::public.notification_queue_status,
    timezone('utc', now()),
    jsonb_build_object(
      'invitation_id', v_invitation.id,
      'circle_id', v_invitation.circle_id,
      'inviter_user_id', v_invitation.inviter_user_id
    )
  );
end;
$$;

create or replace function public.get_my_privacy_settings()
returns table (
  user_id uuid,
  member_list_visibility text,
  live_presence_visibility text,
  allow_direct_invites boolean,
  allow_circle_invites boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.user_privacy_settings%rowtype;
begin
  v_settings := public.ensure_user_privacy_settings(auth.uid());

  return query
  select
    v_settings.user_id,
    v_settings.member_list_visibility::text as member_list_visibility,
    v_settings.live_presence_visibility::text as live_presence_visibility,
    v_settings.allow_direct_invites,
    v_settings.allow_circle_invites,
    v_settings.updated_at;
end;
$$;

create or replace function public.update_my_privacy_settings(
  p_member_list_visibility public.privacy_visibility default null,
  p_live_presence_visibility public.privacy_visibility default null,
  p_allow_direct_invites boolean default null,
  p_allow_circle_invites boolean default null
)
returns table (
  user_id uuid,
  member_list_visibility text,
  live_presence_visibility text,
  allow_direct_invites boolean,
  allow_circle_invites boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_settings public.user_privacy_settings%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  perform public.ensure_user_privacy_settings(v_user_id);

  update public.user_privacy_settings ups
  set
    member_list_visibility = coalesce(p_member_list_visibility, ups.member_list_visibility),
    live_presence_visibility = coalesce(p_live_presence_visibility, ups.live_presence_visibility),
    allow_direct_invites = coalesce(p_allow_direct_invites, ups.allow_direct_invites),
    allow_circle_invites = coalesce(p_allow_circle_invites, ups.allow_circle_invites),
    updated_at = timezone('utc', now())
  where ups.user_id = v_user_id
  returning * into v_settings;

  update public.profiles p
  set
    presence_visibility = v_settings.live_presence_visibility,
    updated_at = timezone('utc', now())
  where p.id = v_user_id;

  return query
  select
    v_settings.user_id,
    v_settings.member_list_visibility::text as member_list_visibility,
    v_settings.live_presence_visibility::text as live_presence_visibility,
    v_settings.allow_direct_invites,
    v_settings.allow_circle_invites,
    v_settings.updated_at;
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
  on conflict (blocker_user_id, blocked_user_id) do update
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

create or replace function public.unblock_user(
  p_blocked_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.';
  end if;

  delete from public.user_blocks ub
  where ub.blocker_user_id = auth.uid()
    and ub.blocked_user_id = p_blocked_user_id;
end;
$$;

create or replace function public.list_my_blocks()
returns table (
  blocked_user_id uuid,
  blocked_display_name text,
  reason text,
  blocked_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    ub.blocked_user_id,
    coalesce(nullif(btrim(p.display_name), ''), 'Member') as blocked_display_name,
    ub.reason,
    ub.created_at as blocked_at
  from public.user_blocks ub
  left join public.profiles p
    on p.id = ub.blocked_user_id
  where ub.blocker_user_id = auth.uid()
  order by ub.created_at desc;
$$;

create or replace function public.submit_moderation_report(
  p_target_type public.moderation_target_type,
  p_target_id uuid,
  p_reason_code public.moderation_reason_code,
  p_details text default null,
  p_evidence jsonb default '{}'::jsonb,
  p_support_route text default null,
  p_support_metadata jsonb default '{}'::jsonb
)
returns table (
  report_id uuid,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_report public.moderation_reports%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  if p_target_type is null or p_target_id is null then
    raise exception 'Target type and target id are required.';
  end if;

  if p_reason_code is null then
    raise exception 'Reason code is required.';
  end if;

  if p_target_type = 'user'::public.moderation_target_type and not exists (
    select 1
    from auth.users u
    where u.id = p_target_id
  ) then
    raise exception 'Report target user was not found.';
  end if;

  if p_target_type = 'circle'::public.moderation_target_type and not exists (
    select 1
    from public.circles c
    where c.id = p_target_id
  ) then
    raise exception 'Report target circle was not found.';
  end if;

  if p_target_type = 'event_occurrence'::public.moderation_target_type
    and not public.can_access_event_occurrence(p_target_id, v_user_id)
  then
    raise exception 'You do not have access to this occurrence report target.';
  end if;

  if p_target_type = 'room'::public.moderation_target_type
    and not public.can_access_room(p_target_id, v_user_id)
  then
    raise exception 'You do not have access to this room report target.';
  end if;

  if p_target_type = 'invite'::public.moderation_target_type and not exists (
    select 1
    from public.circle_invitations ci
    where ci.id = p_target_id
      and (
        ci.inviter_user_id = v_user_id
        or ci.target_user_id = v_user_id
        or public.is_circle_manager(ci.circle_id, v_user_id)
      )
  ) then
    raise exception 'You do not have access to this invite report target.';
  end if;

  insert into public.moderation_reports (
    reporter_user_id,
    target_type,
    target_id,
    reason_code,
    details,
    evidence,
    status,
    support_route,
    support_metadata
  )
  values (
    v_user_id,
    p_target_type,
    p_target_id,
    p_reason_code,
    nullif(btrim(p_details), ''),
    coalesce(p_evidence, '{}'::jsonb),
    'open'::public.moderation_report_status,
    nullif(btrim(p_support_route), ''),
    coalesce(p_support_metadata, '{}'::jsonb)
  )
  returning * into v_report;

  insert into public.moderation_actions (
    report_id,
    action_type,
    actor_user_id,
    notes,
    metadata
  )
  values (
    v_report.id,
    'note'::public.moderation_action_type,
    v_user_id,
    'Report submitted by reporter.',
    jsonb_build_object('status', v_report.status::text)
  );

  return query
  select
    v_report.id as report_id,
    v_report.status::text as status,
    v_report.created_at;
end;
$$;

create or replace function public.set_moderation_report_status(
  p_report_id uuid,
  p_status public.moderation_report_status,
  p_action_type public.moderation_action_type default 'note',
  p_notes text default null
)
returns table (
  report_id uuid,
  status text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_report public.moderation_reports%rowtype;
begin
  if p_report_id is null or p_status is null then
    raise exception 'Report id and status are required.';
  end if;

  if not public.has_operator_privileges() then
    raise exception 'Only operators can update moderation reports.';
  end if;

  update public.moderation_reports report_row
  set
    status = p_status,
    assigned_operator_user_id = coalesce(v_actor_user_id, report_row.assigned_operator_user_id),
    triaged_at = case
      when p_status = 'triaged'::public.moderation_report_status then coalesce(report_row.triaged_at, timezone('utc', now()))
      else report_row.triaged_at
    end,
    resolved_at = case
      when p_status = 'resolved'::public.moderation_report_status then timezone('utc', now())
      else report_row.resolved_at
    end,
    dismissed_at = case
      when p_status = 'dismissed'::public.moderation_report_status then timezone('utc', now())
      else report_row.dismissed_at
    end,
    updated_at = timezone('utc', now())
  where report_row.id = p_report_id
  returning * into v_report;

  if v_report.id is null then
    raise exception 'Moderation report not found.';
  end if;

  insert into public.moderation_actions (
    report_id,
    action_type,
    actor_user_id,
    notes,
    metadata
  )
  values (
    v_report.id,
    coalesce(p_action_type, 'note'::public.moderation_action_type),
    v_actor_user_id,
    nullif(btrim(p_notes), ''),
    jsonb_build_object('status', p_status::text)
  );

  return query
  select
    v_report.id as report_id,
    v_report.status::text as status,
    v_report.updated_at;
end;
$$;

create or replace function public.create_account_deletion_request(
  p_reason text default null,
  p_details text default null,
  p_support_route text default null,
  p_support_metadata jsonb default '{}'::jsonb
)
returns table (
  request_id uuid,
  status text,
  requested_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.account_deletion_requests%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  select *
  into v_request
  from public.account_deletion_requests adr
  where adr.user_id = v_user_id
    and adr.status in (
      'requested'::public.account_deletion_status,
      'acknowledged'::public.account_deletion_status,
      'in_review'::public.account_deletion_status
    )
  order by adr.created_at desc
  limit 1;

  if v_request.id is null then
    insert into public.account_deletion_requests (
      user_id,
      status,
      reason,
      details,
      support_route,
      support_metadata,
      requested_at
    )
    values (
      v_user_id,
      'requested'::public.account_deletion_status,
      nullif(btrim(p_reason), ''),
      nullif(btrim(p_details), ''),
      nullif(btrim(p_support_route), ''),
      coalesce(p_support_metadata, '{}'::jsonb),
      timezone('utc', now())
    )
    returning * into v_request;
  end if;

  update public.profiles p
  set
    account_state = 'deletion_requested'::public.profile_account_state,
    updated_at = timezone('utc', now())
  where p.id = v_user_id;

  update public.notification_device_targets target
  set
    disabled_at = coalesce(target.disabled_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where target.user_id = v_user_id
    and target.disabled_at is null;

  return query
  select
    v_request.id as request_id,
    v_request.status::text as status,
    v_request.requested_at,
    v_request.updated_at;
end;
$$;

create or replace function public.get_account_deletion_status()
returns table (
  request_id uuid,
  status text,
  reason text,
  details text,
  support_route text,
  support_metadata jsonb,
  requested_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    adr.id as request_id,
    adr.status::text as status,
    adr.reason,
    adr.details,
    adr.support_route,
    adr.support_metadata,
    adr.requested_at,
    adr.updated_at
  from public.account_deletion_requests adr
  where adr.user_id = auth.uid()
  order by adr.created_at desc
  limit 1;
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
      or coalesce(p.username, '') ilike ('%' || v_query || '%')
    )
    and public.can_receive_circle_invite(p.id, auth.uid(), p_circle_id)
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
  v_created_new boolean := false;
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

  if p_target_user_id is not null and not public.can_receive_circle_invite(
    p_target_user_id,
    v_user_id,
    p_circle_id
  ) then
    raise exception 'Target user is not eligible to receive this invite.';
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

    v_created_new := true;
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

  if v_created_new and v_invitation.target_user_id is not null then
    perform public.enqueue_invite_notification(v_invitation.id);
  end if;

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

  if public.is_user_blocked(v_invitation.inviter_user_id, v_user_id) then
    update public.circle_invitations
    set
      status = 'revoked'::public.circle_invitation_status,
      status_reason = 'invite blocked by user',
      responded_at = coalesce(responded_at, timezone('utc', now())),
      revoked_at = coalesce(revoked_at, timezone('utc', now())),
      updated_at = timezone('utc', now())
    where id = v_invitation.id;

    raise exception 'Cannot accept invite from a blocked user.';
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
  set
    status = 'accepted'::public.circle_invitation_status,
    target_user_id = v_user_id,
    responded_at = coalesce(responded_at, timezone('utc', now())),
    accepted_at = coalesce(accepted_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
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
    and (
      cm.user_id = auth.uid()
      or public.can_user_see_member_in_circle(auth.uid(), cm.user_id, p_circle_id)
    )
  order by
    public.circle_membership_role_rank(cm.role) desc,
    cm.joined_at asc;
end;
$$;

create or replace function public.can_join_room(
  p_room_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.rooms r
    where r.id = p_room_id
      and r.status = 'open'::public.room_status
      and public.can_access_room(r.id, coalesce(p_user_id, auth.uid()))
      and (
        (r.access_mode = 'open'::public.event_access_mode and r.circle_id is null)
        or not exists (
          select 1
          from public.room_participants rp
          where rp.room_id = r.id
            and rp.user_id <> coalesce(p_user_id, auth.uid())
            and rp.presence_state in (
              'active'::public.room_presence_state,
              'idle'::public.room_presence_state
            )
            and public.is_user_blocked(rp.user_id, coalesce(p_user_id, auth.uid()))
        )
      )
  );
$$;

create or replace function public.join_event_room(
  p_occurrence_id uuid default null,
  p_room_id uuid default null,
  p_occurrence_key text default null,
  p_legacy_event_id uuid default null
)
returns table (
  room_id uuid,
  occurrence_id uuid,
  participant_count integer,
  active_participant_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_room_id uuid;
  v_occurrence_id uuid;
  v_now timestamptz := timezone('utc', now());
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  select ensured.room_id, ensured.occurrence_id
  into v_room_id, v_occurrence_id
  from public.ensure_joinable_occurrence_room(
    p_occurrence_id => p_occurrence_id,
    p_room_id => p_room_id,
    p_occurrence_key => p_occurrence_key,
    p_legacy_event_id => p_legacy_event_id
  ) ensured
  limit 1;

  if not public.can_join_room(v_room_id, v_user_id) then
    raise exception 'You cannot join this room due to privacy or block settings.';
  end if;

  insert into public.room_participants (
    room_id,
    user_id,
    role,
    presence_state,
    joined_at,
    last_seen_at,
    left_at,
    metadata
  )
  values (
    v_room_id,
    v_user_id,
    'participant'::public.room_participant_role,
    'active'::public.room_presence_state,
    v_now,
    v_now,
    null,
    jsonb_build_object('joined_via', 'join_event_room')
  )
  on conflict on constraint room_participants_pkey do update
  set
    presence_state = 'active'::public.room_presence_state,
    last_seen_at = excluded.last_seen_at,
    left_at = null,
    metadata = coalesce(public.room_participants.metadata, '{}'::jsonb) || excluded.metadata;

  return query
  select
    summary.room_id,
    summary.occurrence_id,
    summary.participant_count,
    summary.active_participant_count
  from public.get_room_presence_summary(v_room_id) summary;
end;
$$;

create or replace function public.list_room_participants(
  p_room_id uuid,
  p_active_only boolean default false
)
returns table (
  room_id uuid,
  user_id uuid,
  display_name text,
  role text,
  presence_state text,
  joined_at timestamptz,
  last_seen_at timestamptz,
  left_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_room_id is null then
    raise exception 'Room id is required.';
  end if;

  if not public.can_access_room(p_room_id, auth.uid()) then
    raise exception 'You do not have access to this room.';
  end if;

  return query
  select
    rp.room_id,
    rp.user_id,
    coalesce(nullif(btrim(p.display_name), ''), 'Member') as display_name,
    rp.role::text as role,
    rp.presence_state::text as presence_state,
    rp.joined_at,
    rp.last_seen_at,
    rp.left_at
  from public.room_participants rp
  join public.rooms r
    on r.id = rp.room_id
  left join public.profiles p
    on p.id = rp.user_id
  where rp.room_id = p_room_id
    and (
      not p_active_only
      or rp.presence_state in (
        'active'::public.room_presence_state,
        'idle'::public.room_presence_state
      )
    )
    and (
      rp.user_id = auth.uid()
      or public.can_user_see_presence(auth.uid(), rp.user_id, r.circle_id)
    )
  order by
    case rp.role
      when 'host'::public.room_participant_role then 0
      when 'moderator'::public.room_participant_role then 1
      else 2
    end,
    rp.joined_at asc;
end;
$$;

create or replace function public.list_active_occurrence_presence(
  p_active_window_minutes integer default 15
)
returns table (
  occurrence_id uuid,
  room_id uuid,
  user_id uuid,
  last_seen_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    r.occurrence_id,
    rp.room_id,
    rp.user_id,
    rp.last_seen_at
  from public.room_participants rp
  join public.rooms r
    on r.id = rp.room_id
  where r.room_kind = 'event_occurrence'::public.room_kind
    and r.occurrence_id is not null
    and rp.presence_state in (
      'active'::public.room_presence_state,
      'idle'::public.room_presence_state
    )
    and rp.last_seen_at >= timezone('utc', now()) - make_interval(mins => greatest(1, least(coalesce(p_active_window_minutes, 15), 240)))
    and public.can_access_room(r.id, auth.uid())
    and public.can_user_see_presence(auth.uid(), rp.user_id, r.circle_id);
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
      or coalesce(p.username, '') ilike ('%' || btrim(p_query) || '%')
    )
    and public.can_receive_circle_invite(p.id, auth.uid(), null)
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

  if not public.can_receive_circle_invite(p_target_user_id, auth.uid(), v_circle_id) then
    raise exception 'Target user is not eligible for this circle add.';
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

  if not public.can_receive_circle_invite(p_target_user_id, auth.uid(), v_circle_id) then
    raise exception 'Target user is not eligible for this circle add.';
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

alter table public.user_privacy_settings enable row level security;
alter table public.notification_device_targets enable row level security;
alter table public.notification_subscriptions enable row level security;
alter table public.notification_queue enable row level security;
alter table public.user_blocks enable row level security;
alter table public.moderation_reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.account_deletion_requests enable row level security;

drop policy if exists user_privacy_settings_select_own on public.user_privacy_settings;
create policy user_privacy_settings_select_own
on public.user_privacy_settings
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists user_privacy_settings_insert_own on public.user_privacy_settings;
create policy user_privacy_settings_insert_own
on public.user_privacy_settings
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists user_privacy_settings_update_own on public.user_privacy_settings;
create policy user_privacy_settings_update_own
on public.user_privacy_settings
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists user_privacy_settings_delete_own on public.user_privacy_settings;
create policy user_privacy_settings_delete_own
on public.user_privacy_settings
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists notification_device_targets_select_own on public.notification_device_targets;
create policy notification_device_targets_select_own
on public.notification_device_targets
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists notification_device_targets_insert_own on public.notification_device_targets;
create policy notification_device_targets_insert_own
on public.notification_device_targets
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists notification_device_targets_update_own on public.notification_device_targets;
create policy notification_device_targets_update_own
on public.notification_device_targets
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists notification_device_targets_delete_own on public.notification_device_targets;
create policy notification_device_targets_delete_own
on public.notification_device_targets
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists notification_subscriptions_select_own on public.notification_subscriptions;
create policy notification_subscriptions_select_own
on public.notification_subscriptions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists notification_subscriptions_insert_own on public.notification_subscriptions;
create policy notification_subscriptions_insert_own
on public.notification_subscriptions
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists notification_subscriptions_update_own on public.notification_subscriptions;
create policy notification_subscriptions_update_own
on public.notification_subscriptions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists notification_subscriptions_delete_own on public.notification_subscriptions;
create policy notification_subscriptions_delete_own
on public.notification_subscriptions
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists notification_queue_select_own on public.notification_queue;
create policy notification_queue_select_own
on public.notification_queue
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists notification_queue_insert_none on public.notification_queue;
create policy notification_queue_insert_none
on public.notification_queue
for insert
to authenticated
with check (false);

drop policy if exists notification_queue_update_none on public.notification_queue;
create policy notification_queue_update_none
on public.notification_queue
for update
to authenticated
using (false)
with check (false);

drop policy if exists notification_queue_delete_none on public.notification_queue;
create policy notification_queue_delete_none
on public.notification_queue
for delete
to authenticated
using (false);

drop policy if exists user_blocks_select_own on public.user_blocks;
create policy user_blocks_select_own
on public.user_blocks
for select
to authenticated
using (blocker_user_id = auth.uid());

drop policy if exists user_blocks_insert_own on public.user_blocks;
create policy user_blocks_insert_own
on public.user_blocks
for insert
to authenticated
with check (
  blocker_user_id = auth.uid()
  and blocked_user_id <> auth.uid()
);

drop policy if exists user_blocks_update_own on public.user_blocks;
create policy user_blocks_update_own
on public.user_blocks
for update
to authenticated
using (blocker_user_id = auth.uid())
with check (
  blocker_user_id = auth.uid()
  and blocked_user_id <> auth.uid()
);

drop policy if exists user_blocks_delete_own on public.user_blocks;
create policy user_blocks_delete_own
on public.user_blocks
for delete
to authenticated
using (blocker_user_id = auth.uid());

drop policy if exists moderation_reports_select_authorized on public.moderation_reports;
create policy moderation_reports_select_authorized
on public.moderation_reports
for select
to authenticated
using (
  reporter_user_id = auth.uid()
  or public.has_operator_privileges()
);

drop policy if exists moderation_reports_insert_reporter on public.moderation_reports;
create policy moderation_reports_insert_reporter
on public.moderation_reports
for insert
to authenticated
with check (reporter_user_id = auth.uid());

drop policy if exists moderation_reports_update_operator on public.moderation_reports;
create policy moderation_reports_update_operator
on public.moderation_reports
for update
to authenticated
using (public.has_operator_privileges())
with check (public.has_operator_privileges());

drop policy if exists moderation_reports_delete_none on public.moderation_reports;
create policy moderation_reports_delete_none
on public.moderation_reports
for delete
to authenticated
using (false);

drop policy if exists moderation_actions_select_authorized on public.moderation_actions;
create policy moderation_actions_select_authorized
on public.moderation_actions
for select
to authenticated
using (
  public.has_operator_privileges()
  or exists (
    select 1
    from public.moderation_reports mr
    where mr.id = moderation_actions.report_id
      and mr.reporter_user_id = auth.uid()
  )
);

drop policy if exists moderation_actions_write_none on public.moderation_actions;
create policy moderation_actions_write_none
on public.moderation_actions
for all
to authenticated
using (false)
with check (false);

drop policy if exists account_deletion_requests_select_authorized on public.account_deletion_requests;
create policy account_deletion_requests_select_authorized
on public.account_deletion_requests
for select
to authenticated
using (
  user_id = auth.uid()
  or public.has_operator_privileges()
);

drop policy if exists account_deletion_requests_insert_own on public.account_deletion_requests;
create policy account_deletion_requests_insert_own
on public.account_deletion_requests
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists account_deletion_requests_update_operator on public.account_deletion_requests;
create policy account_deletion_requests_update_operator
on public.account_deletion_requests
for update
to authenticated
using (public.has_operator_privileges())
with check (public.has_operator_privileges());

drop policy if exists account_deletion_requests_delete_none on public.account_deletion_requests;
create policy account_deletion_requests_delete_none
on public.account_deletion_requests
for delete
to authenticated
using (false);

drop policy if exists circle_members_select_active_members on public.circle_members;
create policy circle_members_select_active_members
on public.circle_members
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    public.is_circle_active_member(circle_id, auth.uid())
    and public.can_user_see_member_in_circle(auth.uid(), user_id, circle_id)
  )
);

drop policy if exists room_participants_select_visible on public.room_participants;
create policy room_participants_select_visible
on public.room_participants
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    public.can_access_room(room_id, auth.uid())
    and exists (
      select 1
      from public.rooms r
      where r.id = room_participants.room_id
        and public.can_user_see_presence(auth.uid(), room_participants.user_id, r.circle_id)
    )
  )
);

drop policy if exists app_user_presence_select_authenticated on public.app_user_presence;
create policy app_user_presence_select_authenticated
on public.app_user_presence
for select
to authenticated
using (
  user_id = auth.uid()
  or public.can_user_see_presence(auth.uid(), user_id, null)
);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.prevent_profile_sensitive_updates()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'authenticated'
    and (
      new.account_state is distinct from old.account_state
      or new.deleted_at is distinct from old.deleted_at
    )
  then
    raise exception 'Profile account state fields are managed by trusted server workflows.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_sensitive_updates on public.profiles;
create trigger profiles_prevent_sensitive_updates
before update on public.profiles
for each row
execute function public.prevent_profile_sensitive_updates();

revoke all on function public.ensure_user_privacy_settings(uuid) from public;
revoke all on function public.share_active_circle_membership(uuid, uuid) from public;
revoke all on function public.is_user_blocked(uuid, uuid) from public;
revoke all on function public.can_user_see_member_in_circle(uuid, uuid, uuid) from public;
revoke all on function public.can_user_see_presence(uuid, uuid, uuid) from public;
revoke all on function public.can_receive_circle_invite(uuid, uuid, uuid) from public;
revoke all on function public.has_operator_privileges() from public;
revoke all on function public.register_device_push_target(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) from public;
revoke all on function public.update_notification_subscription(
  public.notification_category,
  public.notification_target_type,
  uuid,
  public.notification_channel,
  boolean,
  integer,
  jsonb,
  jsonb
) from public;
revoke all on function public.list_my_notification_preferences() from public;
revoke all on function public.enqueue_invite_notification(uuid) from public;
revoke all on function public.get_my_privacy_settings() from public;
revoke all on function public.update_my_privacy_settings(
  public.privacy_visibility,
  public.privacy_visibility,
  boolean,
  boolean
) from public;
revoke all on function public.block_user(uuid, text) from public;
revoke all on function public.unblock_user(uuid) from public;
revoke all on function public.list_my_blocks() from public;
revoke all on function public.submit_moderation_report(
  public.moderation_target_type,
  uuid,
  public.moderation_reason_code,
  text,
  jsonb,
  text,
  jsonb
) from public;
revoke all on function public.set_moderation_report_status(
  uuid,
  public.moderation_report_status,
  public.moderation_action_type,
  text
) from public;
revoke all on function public.create_account_deletion_request(text, text, text, jsonb) from public;
revoke all on function public.get_account_deletion_status() from public;

revoke execute on function public.register_device_push_target(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) from anon;
revoke execute on function public.update_notification_subscription(
  public.notification_category,
  public.notification_target_type,
  uuid,
  public.notification_channel,
  boolean,
  integer,
  jsonb,
  jsonb
) from anon;
revoke execute on function public.list_my_notification_preferences() from anon;
revoke execute on function public.get_my_privacy_settings() from anon;
revoke execute on function public.update_my_privacy_settings(
  public.privacy_visibility,
  public.privacy_visibility,
  boolean,
  boolean
) from anon;
revoke execute on function public.block_user(uuid, text) from anon;
revoke execute on function public.unblock_user(uuid) from anon;
revoke execute on function public.list_my_blocks() from anon;
revoke execute on function public.submit_moderation_report(
  public.moderation_target_type,
  uuid,
  public.moderation_reason_code,
  text,
  jsonb,
  text,
  jsonb
) from anon;
revoke execute on function public.set_moderation_report_status(
  uuid,
  public.moderation_report_status,
  public.moderation_action_type,
  text
) from anon;
revoke execute on function public.create_account_deletion_request(text, text, text, jsonb) from anon;
revoke execute on function public.get_account_deletion_status() from anon;

grant execute on function public.ensure_user_privacy_settings(uuid) to authenticated;
grant execute on function public.share_active_circle_membership(uuid, uuid) to authenticated;
grant execute on function public.is_user_blocked(uuid, uuid) to authenticated;
grant execute on function public.can_user_see_member_in_circle(uuid, uuid, uuid) to authenticated;
grant execute on function public.can_user_see_presence(uuid, uuid, uuid) to authenticated;
grant execute on function public.can_receive_circle_invite(uuid, uuid, uuid) to authenticated;
grant execute on function public.has_operator_privileges() to authenticated;
grant execute on function public.register_device_push_target(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to authenticated;
grant execute on function public.update_notification_subscription(
  public.notification_category,
  public.notification_target_type,
  uuid,
  public.notification_channel,
  boolean,
  integer,
  jsonb,
  jsonb
) to authenticated;
grant execute on function public.list_my_notification_preferences() to authenticated;
grant execute on function public.get_my_privacy_settings() to authenticated;
grant execute on function public.update_my_privacy_settings(
  public.privacy_visibility,
  public.privacy_visibility,
  boolean,
  boolean
) to authenticated;
grant execute on function public.block_user(uuid, text) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.list_my_blocks() to authenticated;
grant execute on function public.submit_moderation_report(
  public.moderation_target_type,
  uuid,
  public.moderation_reason_code,
  text,
  jsonb,
  text,
  jsonb
) to authenticated;
grant execute on function public.set_moderation_report_status(
  uuid,
  public.moderation_report_status,
  public.moderation_action_type,
  text
) to authenticated;
grant execute on function public.create_account_deletion_request(text, text, text, jsonb) to authenticated;
grant execute on function public.get_account_deletion_status() to authenticated;
