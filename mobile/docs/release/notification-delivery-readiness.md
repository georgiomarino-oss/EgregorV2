# Notification Delivery Readiness (Phase 6A)

Date: 2026-03-08

## 1) What Is Real After Phase 6A

1. Device registration is real:
- `register_device_push_target`
- mobile runtime registration in `registerCurrentDevicePushTarget`

2. Preference persistence is real:
- `notification_subscriptions`
- reminder preference adapters in mobile data layer

3. Queueing is real:
- invite queueing from invite creation flow
- due occurrence/room reminder enqueue via `enqueue_due_occurrence_reminders`

4. Dispatch is real:
- `dispatch-notification-queue` edge function
- claims queue rows via `claim_notification_queue_batch`
- sends push batches through Expo Push API
- updates queue status to `sent`, `pending` (retry), or `failed`
- records provider metadata (`provider_message_id`, `provider_response`, `last_error`)
- applies exponential backoff and max-attempt handling
- disables device targets on permanent token errors (`DeviceNotRegistered`, `InvalidProviderToken`)

## 2) Categories Currently Sent By Dispatch Path

1. `invite`
2. `occurrence_reminder`
3. `room_reminder`

No claim is made for guaranteed delivery outside those categories.

## 3) Credentials And Runtime Requirements

Required Supabase Edge Function secrets:

1. `SUPABASE_URL`
2. `SUPABASE_SERVICE_ROLE_KEY`
3. `NOTIFICATION_DISPATCH_SHARED_SECRET`

Optional but recommended:

1. `EXPO_ACCESS_TOKEN`
- Used as `Authorization: Bearer ...` for Expo push requests when provided.

## 4) Worker Invocation Model

`dispatch-notification-queue` expects a secret-protected POST request.

Headers:

- `x-egregor-dispatch-secret: <NOTIFICATION_DISPATCH_SHARED_SECRET>`

Body (optional tuning):

```json
{
  "batchSize": 25,
  "horizonMinutes": 30,
  "maxAttempts": 5
}
```

`supabase/config.toml` config:

- `[functions.dispatch-notification-queue]`
- `verify_jwt = false`

Authentication is enforced through the shared secret.

## 5) Suggested Scheduler Cadence

1. Run every 1 minute for beta.
2. Keep `batchSize` conservative at first (for example 25-50).
3. Monitor failed/retry rates before increasing throughput.

## 6) Still Incomplete / Manual Validation Needed

1. Receipt polling and downstream open-rate analytics are not implemented in this phase.
2. End-to-end iOS device delivery validation is still manual.
3. Credential rotation/incident runbooks are still operational tasks.
4. Non-Expo push providers (`fcm`, `apns`, `webpush`) are not implemented in dispatch worker.

## 7) Practical Verification Steps

1. Register a device token from mobile runtime.
2. Enable reminder preference for a near-term occurrence.
3. Invoke dispatch function with shared secret.
4. Confirm `notification_queue` row transitions and provider metadata.
5. Confirm push notification is received on target device.
