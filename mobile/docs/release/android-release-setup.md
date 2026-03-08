# Android Release Setup (Phase 6A)

Date: 2026-03-08

## 1) Durable Source Of Truth

`mobile/android` is generated/untracked in this repo.  
Android hardening is source-controlled via:

1. `mobile/app.json` (`android.permissions`, `android.blockedPermissions`, plugin registration)
2. `mobile/plugins/withPhase6aAndroidHardening.js` (release-signing hard fail + merged-manifest permission hardening)
3. `mobile/docs/release/android-native-source-of-truth.md` (clean-checkout reproduction and verification flow)

## 2) Signing Hardening Status

Release tasks fail fast when signing secrets are missing.  
Release task execution does not silently fall back to debug signing.

## 3) Required Signing Inputs

Provide one full set of signing inputs at build time:

1. Preferred explicit variables:
- `EGREGOR_UPLOAD_STORE_FILE`
- `EGREGOR_UPLOAD_STORE_PASSWORD`
- `EGREGOR_UPLOAD_KEY_ALIAS`
- `EGREGOR_UPLOAD_KEY_PASSWORD`

2. Supported equivalents (already recognized by Gradle script):
- `ANDROID_SIGNING_STORE_FILE`
- `ANDROID_SIGNING_STORE_PASSWORD`
- `ANDROID_SIGNING_KEY_ALIAS`
- `ANDROID_SIGNING_KEY_PASSWORD`
- `EAS_BUILD_ANDROID_KEYSTORE_PATH`
- `EAS_BUILD_ANDROID_KEYSTORE_PASSWORD`
- `EAS_BUILD_ANDROID_KEY_ALIAS`
- `EAS_BUILD_ANDROID_KEY_PASSWORD`
- `android.injected.signing.*` Gradle properties

If release tasks run without valid inputs, build fails with a hard error and a link to this doc.

## 4) Clean Checkout Reproduction

From repo root:

```bash
npm --prefix mobile ci
npm --prefix mobile run prebuild:android:clean
```

## 5) Local Release Build Example

From repo root:

```bash
cd mobile/android
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set EGREGOR_UPLOAD_STORE_FILE=C:\secure\egregor-upload.jks
set EGREGOR_UPLOAD_STORE_PASSWORD=***
set EGREGOR_UPLOAD_KEY_ALIAS=egregor-upload
set EGREGOR_UPLOAD_KEY_PASSWORD=***
set NODE_ENV=production
./gradlew assembleRelease
```

## 6) EAS Build Notes

1. Use EAS managed Android credentials or project secrets to provide keystore values.
2. Do not commit keystores or passwords in git.
3. Keep keystore files in secure secret storage (CI secret manager or EAS credentials store).

`mobile/eas.json` now sets `EXPO_PUBLIC_RELEASE_ENV` by profile for release-tracking context.

## 7) Observability Vars For Release Builds

Recommended EAS/project env vars:

- `EXPO_PUBLIC_SENTRY_DSN`
- `EXPO_PUBLIC_RELEASE_ENV` (already profile-scoped in `eas.json`)

## 8) Verification

1. `./gradlew assembleRelease` without signing env should fail.
2. `./gradlew assembleRelease` with signing env should pass.
3. Validate merged manifest permission output excludes blocked sensitive permissions:
- `app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml`
  (AGP path can vary; verifier script checks supported paths)
4. Run `npm --prefix mobile run verify:android-hardening:manifest` after `:app:processReleaseMainManifest`.
5. Confirm `android.permission.POST_NOTIFICATIONS` is still present.
6. Validate signature in generated artifact before submission.
