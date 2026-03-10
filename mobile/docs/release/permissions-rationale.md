# Android Permissions And Rationale (Phase 6A)

Date: 2026-03-08

## 1) Kept Permissions

1. `android.permission.POST_NOTIFICATIONS`
- Used for reminder and invite push notifications.
- Prompt is contextual (reminder actions), not auth-gate forced.

2. `android.permission.INTERNET`
- Required for Supabase APIs, real-time data, and push registration.

3. `android.permission.VIBRATE`
- Notification haptics/alert behavior.

4. `android.permission.MODIFY_AUDIO_SETTINGS`
- Audio playback session behavior in solo/live room playback surfaces.

5. `android.permission.FOREGROUND_SERVICE`
- Required by transitive Android components used for runtime playback/service behavior.

6. `android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK`
- Required by `expo-audio` playback service declarations.

7. `android.permission.ACCESS_NETWORK_STATE`
- Transitive network reachability checks used by Android framework/library internals.

8. `android.permission.ACCESS_WIFI_STATE`
- Transitive connectivity state checks used by Android framework/library internals.

## 2) Explicitly Removed/Blocked

1. `android.permission.RECORD_AUDIO`
- Removed and blocked.
- App does not require microphone capture in current product scope.

2. Android location permissions are not used in current product scope:
- `android.permission.ACCESS_COARSE_LOCATION`
- `android.permission.ACCESS_FINE_LOCATION`
- Live globe markers are generated from canonical room/occurrence metadata and region/timezone-safe approximations, not device geolocation.

3. `android.permission.SYSTEM_ALERT_WINDOW`
- Removed and blocked.
- No overlay/chat-head style behavior is implemented.

4. Legacy storage/media read permissions removed/blocked:
- `android.permission.READ_EXTERNAL_STORAGE`
- `android.permission.WRITE_EXTERNAL_STORAGE`
- `android.permission.READ_MEDIA_AUDIO`
- `android.permission.READ_MEDIA_IMAGES`
- `android.permission.READ_MEDIA_VIDEO`
- `android.permission.READ_MEDIA_VISUAL_USER_SELECTED`

5. `android.permission.FOREGROUND_SERVICE_MICROPHONE`
- Blocked.
- No foreground microphone capture flow in current scope.

6. Merged-manifest strip hardening:
- `mobile/plugins/withPhase6aAndroidHardening.js` strips sensitive transitive permissions from merged manifests during Android prebuild output:
  - `RECORD_AUDIO`
  - `SYSTEM_ALERT_WINDOW`
  - legacy storage/media permissions
  - `FOREGROUND_SERVICE_MICROPHONE`
- This prevents dependency-level reintroduction in release artifacts.

## 3) Config Sources

1. Source of truth (Expo config): `mobile/app.json`
- `android.permissions`
- `android.blockedPermissions`
- `expo-audio` plugin configured with recording disabled.
- plugin registration: `./plugins/withPhase6aAndroidHardening`

2. Source-controlled Android hardening logic: `mobile/plugins/withPhase6aAndroidHardening.js`

3. Final merged-manifest hardening:
- generated `mobile/android/app/build.gradle` (via plugin) strips blocked sensitive permissions from:
  - `app/build/intermediates/merged_manifest/debug/processDebugMainManifest/AndroidManifest.xml`
  - `app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml`
  - legacy AGP fallback paths under `merged_manifests/*` are also handled
- generated `mobile/android/app/build.gradle` also ensures `android.permission.POST_NOTIFICATIONS` remains declared.
- `mobile/scripts/verify-android-merged-manifest.mjs` validates merged manifest output against blocked/required permissions.

## 4) UX Alignment

1. Notification permission prompts occur on reminder opt-in surfaces (Event Details, Event Room, Profile notification panel).
2. No auth-gate permission prompt for notifications.
3. No location prompt should appear in current Android release path.
4. No microphone prompt should appear in current Android release path.

## 5) Store Review Notes

1. Permission footprint is intentionally minimized for beta/store-readiness.
2. Any re-introduction of sensitive permissions must include:
- product-level rationale
- updated policy disclosures
- updated QA and release docs.
