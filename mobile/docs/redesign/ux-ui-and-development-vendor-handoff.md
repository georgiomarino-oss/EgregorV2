# EgregorV2 UX/UI + Development Vendor Handoff

Date: 2026-03-12  
Prepared for: External UX/UI and development delivery partner  
Project repo: `EgregorV2`

## 1) Executive Summary

EgregorV2 is a production-oriented spiritual collaboration app with a canonical architecture centered on:

1. **Home**
2. **Circles**
3. **Live**
4. **Profile**

Core platform foundations are in place (auth, canonical event model, reminder queue/dispatch pipeline, trust/safety baseline, true in-app account deletion, legal/support web surfaces).  

Current launch blockers are mostly operational, not conceptual:

1. Event audio generation is blocked by ElevenLabs credits/quota.
2. iOS release capability/signing/device validation is still a manual gap.
3. Android signed-release evidence with production credentials must be finalized.
4. Push dispatch needs full production-like scheduler validation across devices.
5. Moderation operations and analytics dashboarding need stronger runbook maturity.

This document defines what exists now, what is missing, and what the vendor must preserve/improve to reach full commercial scale and store launch.

## 2) Product Scope and Canonical Architecture (Must Preserve)

Do not redesign core information architecture or reintroduce legacy flows. Preserve:

1. Bottom navigation: `Home / Circles / Live / Profile`
2. Canonical event chain: `event_series -> event_occurrences -> rooms`
3. Canonical deep-link targets (`invite`, `occurrence`, `room`, `circles`)
4. Canonical runtime source for event scripts/audio: `event_occurrence_content`
5. Server-side-only secret handling for AI/audio/admin operations

Primary references:

1. `mobile/docs/redesign/commercial-grade-master-plan.md`
2. `mobile/docs/redesign/canonical-domain-model.md`
3. `mobile/docs/redesign/information-architecture-and-user-journeys.md`

## 3) Technology Stack and Development Languages

### 3.1 Mobile App

1. **Language:** TypeScript
2. **Framework:** React Native + Expo (SDK 55)
3. **Navigation:** React Navigation (stack + tabs)
4. **State/data:** Supabase JS + custom API services
5. **Audio:** Expo Audio + cached artifact playback
6. **Maps/Globe visuals:** Mapbox tokenized integration + fallback behavior

Key manifest: `mobile/package.json`

### 3.2 Backend/Data

1. **Database:** Supabase Postgres
2. **Migrations/tests:** SQL migration files + SQL verification scripts
3. **Edge Functions runtime:** Deno/TypeScript
4. **Auth:** Supabase Auth
5. **Storage:** Supabase Storage (artifact buckets)

### 3.3 Web Surfaces

1. **Language:** TypeScript
2. **Framework:** Next.js (App Router)
3. **Primary role:** policy/support/compliance pages + support contact flow

Key manifest: `web/package.json`

### 3.4 Languages in Active Use

1. TypeScript (`mobile`, `web`, `supabase/functions`)
2. SQL (`supabase/migrations`, `supabase/tests`, reporting scripts)
3. JavaScript (`mobile/scripts`, `supabase/scripts` operational tooling)

## 4) Vendor and Service Inventory

### 4.1 Core Infrastructure

1. **Supabase** (DB/Auth/Storage/Edge Functions)
2. **Expo** (RN runtime/build toolchain, notifications integration path)

### 4.2 AI/Content and Audio

1. **OpenAI** (script/content generation pipeline)
2. **ElevenLabs** (speech/audio synthesis + timing/alignment artifacts)

### 4.3 Observability and Runtime Ops

1. **Sentry** (crash/release telemetry)
2. **Expo Push service** (dispatch worker sends push jobs through Expo API)

### 4.4 Visual/Media

1. **Mapbox** (live globe/map rendering)
2. **Lottie/LottieFiles workflow** (cinematic animation assets)

### 4.5 Distribution and Billing Surfaces

1. **Apple App Store** (distribution + subscription handling)
2. **Google Play** (distribution + deletion resource requirement)

## 5) Current Functional State (How the App Works Today)

### 5.1 Authentication and Navigation

1. Auth-gated app entry with Supabase.
2. Authenticated users route to canonical tabs.
3. Deep links are captured and routed into canonical targets.

Reference: `mobile/src/app/navigation/RootNavigator.tsx`

### 5.2 Circles and Collaboration

1. Circle membership/invite flows exist with trust controls.
2. Shared collaboration joins are tied to persisted room entities.
3. Block/report safety controls are available in profile/room-related flows.

### 5.3 Live Events and Rooms

1. Live feed uses canonical event occurrences, not legacy pseudo-events.
2. Room entry routes through canonical join target handling.
3. Event content is served from persisted `event_occurrence_content`.

References:

1. `mobile/src/screens/EventsScreen.tsx`
2. `mobile/src/screens/EventDetailsScreen.tsx`
3. `mobile/src/screens/EventRoomScreen.tsx`
4. `mobile/src/lib/api/data.ts`

### 5.4 Event Library Overhaul Status

Completed:

1. Legacy event rows archived/removed.
2. Canonical curated series seeded (peace/awakening/coherence/sunrise/evening/11:11/new moon/full moon/etc.).
3. Lunar phase scheduling uses authoritative references.
4. Script generation/persistence pipeline is implemented and idempotent.
5. Runtime reads canonical persisted event content.

Reference: `mobile/docs/redesign/event-library-overhaul-pass.md`

### 5.5 Event Audio and Sync Status

Implemented in code/pipeline:

1. Cached audio artifact model
2. Voice metadata linkage
3. Timing/alignment persistence model for synchronized reading

Current blocker:

1. ElevenLabs provider quota/credits exhausted in staging at latest verification, so no ready event audio artifacts were generated for launch horizon in that pass.

Reference: `mobile/docs/redesign/event-audio-backfill-verification-report.md`

### 5.6 Account Deletion Compliance

Now implemented as **true in-app deletion** (not request-only):

1. In-app path: `Profile -> Settings -> Account deletion`
2. Secure server-side Edge Function executes deletion workflow
3. Audit logs are persisted
4. App signs user out after successful deletion
5. Web deletion resource aligns with in-app behavior

References:

1. `mobile/docs/redesign/true-account-deletion-pass.md`
2. `supabase/functions/delete-account/index.ts`
3. `web/app/account-deletion/page.tsx`

## 6) Existing Gaps and Risks (Commercial Scale)

### 6.1 Release/Store Blockers

1. **Event audio readiness blocked** by ElevenLabs credits/quota.
2. **iOS native release verification incomplete** from repo evidence alone (signing/entitlements/APNs/device checks still required).
3. **Android signed release evidence** with real keystore secrets must be finalized and archived.
4. **Push scheduler production validation** needs full secret-backed cadence and multi-device confirmation.

### 6.2 Operational Maturity Gaps

1. Moderation operator tooling and SLA execution remain lightweight.
2. Analytics and alert dashboard maturity is below full commercial operations standard.
3. Push observability is baseline; receipt polling/open-rate lifecycle is not yet mature.

### 6.3 Technical Debt / Stabilization Work

1. `mobile/src/lib/api/data.ts` remains a large multi-domain service layer.
2. Legacy compatibility paths still exist intentionally in some areas and should be removed only after telemetry-backed stabilization.
3. Additional performance evidence should be captured on low-end Android and iOS hardware.

## 7) Suggested Improvements for Vendor Scope

### 7.1 UX/UI Improvements (No IA Rewrite)

1. Tighten consistency for empty/loading/error states across Home/Circles/Live/Profile.
2. Improve edge-state readability in event room/detail and notification flows.
3. Expand accessibility QA (voiceover/talkback labels, touch targets, contrast under cinematic backgrounds).
4. Convert handoff package into complete Figma component/variant library with explicit redline specs and motion annotations.

### 7.2 Engineering Improvements

1. Split `mobile/src/lib/api/data.ts` into domain modules:
   - circles
   - invites
   - events/occurrences
   - rooms
   - trust/safety
2. Add stricter CI gates for migration + SQL test execution against staging-like environments.
3. Expand runtime integration tests for:
   - canonical deep links
   - event script/audio artifact loading paths
   - account deletion end-to-end behavior
4. Harden operational scripts into one-command release runbooks (prewarm, validate, backfill, health-check).

### 7.3 Platform/Operations Improvements

1. Implement vendor-level release checklist enforcement for Apple/Google submission artifacts.
2. Establish incident/rotation runbooks for push delivery and content generation providers.
3. Finalize monitoring dashboards (crash, join failures, reminder delivery, deletion flow failures, moderation queue aging).

## 8) Store Deployment Readiness (Apple + Google)

### 8.1 Already in Place

1. In-app account deletion path and aligned web deletion resource.
2. Privacy/support/subscription/legal pages published in web app.
3. Android permission hardening strategy documented and enforced in build flow.
4. Baseline release/type/test suites are defined and currently pass in repo runs.

### 8.2 Still Required Before Submission

1. **Android**
   - Produce and archive signed release builds with real credentials.
   - Confirm signature validation and final manifest in release artifact.
2. **iOS**
   - Generate/validate native project signing.
   - Confirm APNs entitlements and device push behavior.
   - Complete TestFlight sanity pass.
3. **Policy Metadata**
   - Reconcile store privacy forms/nutrition declarations with actual runtime behavior.
4. **Push Ops**
   - Deploy and schedule dispatch worker with production secrets.
   - Capture evidence of queue transitions + real device delivery.
5. **Event Audio**
   - Restore ElevenLabs credits.
   - Re-run audio prewarm + strict artifact validation for launch horizon.

Primary references:

1. `mobile/docs/redesign/store-submission-readiness.md`
2. `mobile/docs/release/pre-submission-checklist.md`
3. `mobile/docs/redesign/launch-candidate-punch-list.md`

## 9) Environments, Secrets, and Access Required for Vendor

### 9.1 Mobile/Public Env (client-safe)

1. `EXPO_PUBLIC_SUPABASE_URL`
2. `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (optional but required for full globe experience)
4. `EXPO_PUBLIC_SENTRY_DSN`

### 9.2 Server-Side Secrets (must never be client-exposed)

1. `SUPABASE_SERVICE_ROLE_KEY`
2. `OPENAI_API_KEY`
3. `ELEVENLABS_API_KEY`
4. `NOTIFICATION_DISPATCH_SHARED_SECRET`
5. `EXPO_ACCESS_TOKEN` (optional for push auth)

### 9.3 Access Expectations

1. Supabase project access (staging + production) with migration/function deploy permissions
2. Apple App Store Connect access
3. Google Play Console access
4. Crash/analytics workspace access
5. Provider billing/admin access (OpenAI, ElevenLabs, Mapbox, Sentry, Expo)

## 10) Handoff Artifacts for UX/UI Team

Use the existing in-repo package as source of truth:

1. `mobile/docs/redesign/figma-export-handoff.md`
2. `mobile/docs/redesign/figma-handoff/README.md`
3. `mobile/docs/redesign/figma-handoff/architecture/*`
4. `mobile/docs/redesign/figma-handoff/content/*`
5. `mobile/docs/redesign/figma-handoff/motion/*`
6. `mobile/docs/redesign/figma-handoff/design/*`
7. `mobile/docs/DESIGN_SYSTEM.md`
8. `mobile/docs/redesign/ux-ui-creative-direction.md`

## 11) Recommended Delivery Plan for Vendor

### Phase 1: Stabilize and Launch-Close (highest priority)

1. Resolve ElevenLabs quota and complete event audio backfill/validation.
2. Complete Apple/Google release evidence and store metadata.
3. Finalize push scheduler production validation.
4. Produce release readiness sign-off pack (test + runtime + policy evidence).

### Phase 2: Scale Hardening

1. Refactor API surface modularly.
2. Expand observability, dashboards, and incident runbooks.
3. Improve moderation operations tooling and queue SLAs.

### Phase 3: Post-Launch Cleanup

1. Remove legacy compatibility paths once telemetry confirms no regressions.
2. Expand localization/accessibility/performance optimization.
3. Optimize long-horizon content prewarm and cost controls.

## 12) Acceptance Criteria for Successful Vendor Engagement

1. Canonical app architecture remains intact (no navigation/domain regressions).
2. App is fully store-compliant on deletion/privacy/support requirements.
3. Event content pipeline is fully operational with persisted scripts + ready audio/timings.
4. Push and reminder operations are proven in production-like cadence with evidence.
5. Android and iOS release artifacts are signed, tested, and submission-ready.
6. Operational dashboards and incident runbooks are in place.

## 13) Notes on Current Status Snapshot

This handoff reflects repository and verification artifacts up to 2026-03-12, including:

1. Canonical event-library overhaul and staging verification
2. Post-quota event-audio validation attempt (blocked by provider credits at that time)
3. True in-app account deletion implementation and Supabase deployment

If vendor onboarding starts later, re-run the latest verification scripts before final planning to refresh the readiness snapshot.
