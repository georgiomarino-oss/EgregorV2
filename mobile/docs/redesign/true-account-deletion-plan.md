# True Account Deletion Plan

Date: 2026-03-11  
Scope: Replace request-style account deletion with true in-app account deletion through a secure backend path.

## 1. Current Flow (Before This Pass)

1. In app (`Profile -> Settings -> Account deletion`), user submits a deletion request.
2. Mobile calls RPCs:
   - `create_account_deletion_request`
   - `get_account_deletion_status`
3. Backend stores workflow state in `public.account_deletion_requests`.
4. Deletion is support-reviewed/manual and not immediate.

## 2. Target True Deletion Flow

1. User opens `Profile -> Settings -> Account deletion`.
2. User confirms irreversible deletion in-app.
3. Mobile calls a secure edge function (server-side only service role): `delete-account`.
4. Edge function:
   - verifies authenticated user
   - writes an auditable deletion log row
   - performs relational cleanup for user-owned data
   - removes user-owned storage objects (where present)
   - hard-deletes auth user via Supabase Admin API
5. App signs user out immediately and exits authenticated UI.
6. Web `/account-deletion` remains available for Google Play compliance and aligns with this automated behavior.

## 3. Auth Deletion Path

- Use Supabase Admin delete from an Edge Function with `SUPABASE_SERVICE_ROLE_KEY` only on server.
- Client never receives or stores service role secrets.
- Deletion mode target: hard auth deletion (not mere deactivation).

## 4. User-Owned Data Inventory

## 4.1 Direct user-linked tables (auth FK cascade)

From migrations, key user-linked domains include:
- `profiles`
- `circle_members`
- `circles` (via `created_by`)
- legacy `events`, `event_participants`
- `prayer_library_items`
- `user_intentions`
- `solo_sessions`
- `user_journal_entries`
- `user_event_subscriptions`
- `app_user_presence`
- `shared_solo_sessions`, `shared_solo_session_participants`
- `room_participants`
- `event_reminder_preferences`
- `user_privacy_settings`
- `user_blocks`
- `notification_device_targets`
- `notification_subscriptions`
- `notification_queue`
- `account_deletion_requests`

## 4.2 User-linked tables with `SET NULL` retention behavior

These are intentionally retained with user references removed by FK behavior:
- `event_library_items.created_by`
- `event_series.created_by`
- `rooms.host_user_id`
- `circle_invitations.target_user_id`
- `circle_invitation_events.changed_by_user_id`
- `moderation_reports.reporter_user_id`
- `moderation_reports.assigned_operator_user_id`
- `moderation_actions.actor_user_id`
- `mobile_analytics_events.user_id`

## 4.3 Storage ownership audit

Repository scan found no active user-upload flow in mobile/web codepaths. Existing storage usage primarily covers generated shared artifacts (for example prayer/event audio artifacts), not user-owned uploads.

Deletion design will still perform owner-based storage cleanup against `storage.objects` for the deleting user to cover present/future user-owned assets safely.

## 5. Deletion Order

1. Authenticate user in edge function.
2. Create/update audit row (`started`).
3. Delete user-owned dependent relational data via server-only cleanup function.
4. Delete user-owned storage objects (by owner identity where available).
5. Hard-delete auth user via Supabase Admin API.
6. Mark audit row `completed` (or `failed` with reason).

## 6. Retained Data Policy Assumptions

Retain only minimally justified data:
1. Safety/compliance records where legal/security/fraud/audit interests require retention (with user link removed where possible).
2. Billing/compliance records required by law or payment platform obligations.
3. Aggregated/anonymized operational analytics where user identifier is removed (`SET NULL`).

No hidden retention of directly user-owned profile/account content beyond these justified categories.

## 7. Rollback / Failure Considerations

1. Edge function must be idempotent-safe for duplicate submissions (`in progress` / `already deleted` handling).
2. If a failure occurs before auth deletion completes, audit row is marked `failed` with detail for operator review.
3. Client receives clear error state and does not show false success.
4. On success, client always performs explicit sign-out and exits authenticated UI.

## 8. Client UX Changes Needed

1. Replace request-status UI with true deletion action language.
2. Keep entry point discoverable in canonical path (`Profile -> Settings -> Account deletion`).
3. Add irreversible confirmation copy for immediate automated deletion.
4. Show clear deleted/retained disclosures in plain language.
5. On success:
   - sign out immediately
   - return to unauthenticated app state
6. Preserve support/privacy/deletion web links for policy transparency.

## 9. Sign in With Apple Implications

Current repository scan shows no dedicated Sign in with Apple token-revocation implementation.

Planned handling:
1. Proceed with Supabase auth user hard deletion and local session sign-out.
2. Document that any provider-side revocation requirements beyond Supabase account deletion remain a separate operational/auth-provider concern if SIWA is enabled in production.
