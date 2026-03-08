# Android Native Source Of Truth (Phase 6A Durability)

Date: 2026-03-08

## 1) Repository Strategy

`mobile/android` is intentionally generated and untracked in this repository (`mobile/.gitignore` contains `/android`).

Durable Android hardening must live in tracked config/plugin sources, not in local-only native files.

## 2) Where Hardening Lives Now

1. Expo app config: `mobile/app.json`
- `expo.android.permissions`
- `expo.android.blockedPermissions`
- plugin registration for Android hardening

2. Tracked config plugin: `mobile/plugins/withPhase6aAndroidHardening.js`
- Enforces release-signing secret checks for release tasks
- Fails fast when signing env is missing
- Prevents silent debug-signing fallback for release task execution
- Strips blocked sensitive permissions from merged manifests
- Ensures `android.permission.POST_NOTIFICATIONS` remains declared after merge hardening

3. Verification helper: `mobile/scripts/verify-android-merged-manifest.mjs`
- Checks merged release manifest for required and blocked permissions

## 3) Clean Checkout Reproduction

From repo root:

```powershell
npm --prefix mobile ci
npm --prefix mobile run prebuild:android:clean
```

Android SDK prerequisite for local Gradle commands (choose one):

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
```

or create `mobile/android/local.properties` with `sdk.dir=...`.

Optional sanity check that plugin injection occurred:

```powershell
rg "@egregor-phase6a-hardening-start" mobile/android/app/build.gradle
```

## 4) Verification Commands

### A) Verify release does not silently use debug signing

From `mobile/android` with no signing env vars configured:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
./gradlew assembleRelease
```

Expected: build fails with a hard error instructing signing env setup (no debug fallback path).

### B) Verify merged manifest permissions after clean regenerate

For manifest processing only, use a placeholder keystore path that exists locally:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:EGREGOR_UPLOAD_STORE_FILE = (Resolve-Path "mobile/android/app/debug.keystore")
$env:EGREGOR_UPLOAD_STORE_PASSWORD = "android"
$env:EGREGOR_UPLOAD_KEY_ALIAS = "androiddebugkey"
$env:EGREGOR_UPLOAD_KEY_PASSWORD = "android"
$env:NODE_ENV = "production"
cd mobile/android
./gradlew :app:processReleaseMainManifest --rerun-tasks
cd ../..
npm --prefix mobile run verify:android-hardening:manifest
```

Expected: script prints `PASS`, confirming blocked sensitive permissions are absent and `POST_NOTIFICATIONS` is present.

### C) Verify release failure behavior when signing env is missing

Clear signing env and rerun:

```powershell
Remove-Item Env:EGREGOR_UPLOAD_STORE_FILE -ErrorAction SilentlyContinue
Remove-Item Env:EGREGOR_UPLOAD_STORE_PASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:EGREGOR_UPLOAD_KEY_ALIAS -ErrorAction SilentlyContinue
Remove-Item Env:EGREGOR_UPLOAD_KEY_PASSWORD -ErrorAction SilentlyContinue
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
cd mobile/android
./gradlew assembleRelease
```

Expected: hard failure citing required signing env and release setup doc.

## 5) Notes

1. Placeholder credentials above are only for local manifest verification, not for signed release artifacts.
2. Real release artifacts must use secure upload keystore credentials from secret storage/EAS credentials.
