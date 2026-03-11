create table if not exists public.account_deletion_audit_logs (
  id uuid primary key default gen_random_uuid(),
  deleted_user_id uuid not null,
  status text not null check (status in ('started', 'completed', 'failed')),
  request_source text not null default 'in_app_self_service',
  requested_reason text,
  failure_detail text,
  cleanup_summary jsonb not null default '{}'::jsonb,
  storage_summary jsonb not null default '{}'::jsonb,
  retained_data_summary text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint account_deletion_audit_logs_completed_at_check check (
    status <> 'completed'
    or completed_at is not null
  )
);

create index if not exists account_deletion_audit_logs_user_idx
on public.account_deletion_audit_logs(deleted_user_id, created_at desc);

create unique index if not exists account_deletion_audit_logs_active_or_completed_unique_idx
on public.account_deletion_audit_logs(deleted_user_id)
where status in ('started', 'completed');

drop trigger if exists account_deletion_audit_logs_set_updated_at on public.account_deletion_audit_logs;
create trigger account_deletion_audit_logs_set_updated_at
before update on public.account_deletion_audit_logs
for each row
execute function public.handle_updated_at();

alter table public.account_deletion_audit_logs enable row level security;

drop policy if exists account_deletion_audit_logs_select_operator on public.account_deletion_audit_logs;
create policy account_deletion_audit_logs_select_operator
on public.account_deletion_audit_logs
for select
to authenticated
using (public.has_operator_privileges());

drop policy if exists account_deletion_audit_logs_insert_none on public.account_deletion_audit_logs;
create policy account_deletion_audit_logs_insert_none
on public.account_deletion_audit_logs
for insert
to authenticated
with check (false);

drop policy if exists account_deletion_audit_logs_update_none on public.account_deletion_audit_logs;
create policy account_deletion_audit_logs_update_none
on public.account_deletion_audit_logs
for update
to authenticated
using (false)
with check (false);

drop policy if exists account_deletion_audit_logs_delete_none on public.account_deletion_audit_logs;
create policy account_deletion_audit_logs_delete_none
on public.account_deletion_audit_logs
for delete
to authenticated
using (false);

create or replace function public.run_account_deletion_cleanup(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_deletion_requests_deleted integer := 0;
  v_app_user_presence_deleted integer := 0;
  v_circle_invitations_deleted integer := 0;
  v_circle_members_deleted integer := 0;
  v_circles_deleted integer := 0;
  v_event_library_items_deleted integer := 0;
  v_event_participants_deleted integer := 0;
  v_event_reminder_preferences_deleted integer := 0;
  v_event_series_deleted integer := 0;
  v_events_deleted integer := 0;
  v_notification_device_targets_deleted integer := 0;
  v_notification_queue_deleted integer := 0;
  v_notification_subscriptions_deleted integer := 0;
  v_prayer_library_items_deleted integer := 0;
  v_profiles_deleted integer := 0;
  v_room_participants_deleted integer := 0;
  v_shared_solo_session_participants_deleted integer := 0;
  v_shared_solo_sessions_deleted integer := 0;
  v_solo_sessions_deleted integer := 0;
  v_user_blocks_deleted integer := 0;
  v_user_event_subscriptions_deleted integer := 0;
  v_user_intentions_deleted integer := 0;
  v_user_journal_entries_deleted integer := 0;
  v_user_privacy_settings_deleted integer := 0;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required for account deletion cleanup.';
  end if;

  delete from public.user_journal_entries
  where user_id = p_user_id;
  get diagnostics v_user_journal_entries_deleted = row_count;

  delete from public.event_reminder_preferences
  where user_id = p_user_id;
  get diagnostics v_event_reminder_preferences_deleted = row_count;

  delete from public.notification_subscriptions
  where user_id = p_user_id;
  get diagnostics v_notification_subscriptions_deleted = row_count;

  delete from public.notification_device_targets
  where user_id = p_user_id;
  get diagnostics v_notification_device_targets_deleted = row_count;

  delete from public.notification_queue
  where user_id = p_user_id;
  get diagnostics v_notification_queue_deleted = row_count;

  delete from public.user_privacy_settings
  where user_id = p_user_id;
  get diagnostics v_user_privacy_settings_deleted = row_count;

  delete from public.user_blocks
  where blocker_user_id = p_user_id
     or blocked_user_id = p_user_id;
  get diagnostics v_user_blocks_deleted = row_count;

  delete from public.room_participants
  where user_id = p_user_id;
  get diagnostics v_room_participants_deleted = row_count;

  delete from public.shared_solo_session_participants
  where user_id = p_user_id;
  get diagnostics v_shared_solo_session_participants_deleted = row_count;

  delete from public.shared_solo_sessions
  where host_user_id = p_user_id;
  get diagnostics v_shared_solo_sessions_deleted = row_count;

  delete from public.user_event_subscriptions
  where user_id = p_user_id;
  get diagnostics v_user_event_subscriptions_deleted = row_count;

  delete from public.app_user_presence
  where user_id = p_user_id;
  get diagnostics v_app_user_presence_deleted = row_count;

  delete from public.event_participants
  where user_id = p_user_id;
  get diagnostics v_event_participants_deleted = row_count;

  delete from public.circle_members
  where user_id = p_user_id;
  get diagnostics v_circle_members_deleted = row_count;

  delete from public.user_intentions
  where user_id = p_user_id;
  get diagnostics v_user_intentions_deleted = row_count;

  delete from public.solo_sessions
  where user_id = p_user_id;
  get diagnostics v_solo_sessions_deleted = row_count;

  delete from public.circle_invitations
  where inviter_user_id = p_user_id
     or target_user_id = p_user_id;
  get diagnostics v_circle_invitations_deleted = row_count;

  delete from public.event_library_items
  where created_by = p_user_id;
  get diagnostics v_event_library_items_deleted = row_count;

  delete from public.prayer_library_items
  where created_by = p_user_id;
  get diagnostics v_prayer_library_items_deleted = row_count;

  delete from public.events
  where created_by = p_user_id;
  get diagnostics v_events_deleted = row_count;

  delete from public.event_series
  where created_by = p_user_id;
  get diagnostics v_event_series_deleted = row_count;

  delete from public.circles
  where created_by = p_user_id;
  get diagnostics v_circles_deleted = row_count;

  delete from public.account_deletion_requests
  where user_id = p_user_id;
  get diagnostics v_account_deletion_requests_deleted = row_count;

  delete from public.profiles
  where id = p_user_id;
  get diagnostics v_profiles_deleted = row_count;

  return jsonb_build_object(
    'account_deletion_requests', v_account_deletion_requests_deleted,
    'app_user_presence', v_app_user_presence_deleted,
    'circle_invitations', v_circle_invitations_deleted,
    'circle_members', v_circle_members_deleted,
    'circles', v_circles_deleted,
    'event_library_items', v_event_library_items_deleted,
    'event_participants', v_event_participants_deleted,
    'event_reminder_preferences', v_event_reminder_preferences_deleted,
    'event_series', v_event_series_deleted,
    'events', v_events_deleted,
    'notification_device_targets', v_notification_device_targets_deleted,
    'notification_queue', v_notification_queue_deleted,
    'notification_subscriptions', v_notification_subscriptions_deleted,
    'prayer_library_items', v_prayer_library_items_deleted,
    'profiles', v_profiles_deleted,
    'room_participants', v_room_participants_deleted,
    'shared_solo_session_participants', v_shared_solo_session_participants_deleted,
    'shared_solo_sessions', v_shared_solo_sessions_deleted,
    'solo_sessions', v_solo_sessions_deleted,
    'user_blocks', v_user_blocks_deleted,
    'user_event_subscriptions', v_user_event_subscriptions_deleted,
    'user_intentions', v_user_intentions_deleted,
    'user_journal_entries', v_user_journal_entries_deleted,
    'user_privacy_settings', v_user_privacy_settings_deleted
  );
end;
$$;

revoke all on function public.run_account_deletion_cleanup(uuid) from public;
revoke execute on function public.run_account_deletion_cleanup(uuid) from anon;
revoke execute on function public.run_account_deletion_cleanup(uuid) from authenticated;
grant execute on function public.run_account_deletion_cleanup(uuid) to service_role;
