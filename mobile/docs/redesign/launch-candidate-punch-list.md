# Launch-Candidate Punch List

Date: 2026-03-08

Scope: Final integration pass after Phases 2A-6A.
Evidence basis: phase verification reports, release runbooks, and current mobile/supabase implementation.

## 1) Current Reality Snapshot

1. `npm --prefix mobile run typecheck` passes.
2. `npm --prefix mobile run test:release-baseline` passes (Phase 3B, 4B, 5B, 6A targeted suites).
3. Android hardening is durable through generated-native source of truth (`app.json` + `plugins/withPhase6aAndroidHardening.js`), not `mobile/android`.
4. Push is queue + dispatch capable for current categories, but still requires credentialed environment and device/provider validation.

## 2) Remaining Punch List

### Blocker

1. Android signed-release proof with real upload keystore is not yet captured.
- Type: runtime/operational gap
- Why blocker: serious beta/store submission requires a real signed artifact and signature verification, not only static build-hardening checks.
- Required close: run release build with real signing secrets and archive evidence (artifact signature + build logs).

2. iOS release readiness is still unknown from repo state.
- Type: repo-visibility + runtime gap
- Why blocker: `mobile/ios` is absent in this snapshot, so signing entitlements, APNs capability, and production push behavior are unverified.
- Required close: generate/verify iOS native project and run physical-device checks listed in `mobile/docs/release/ios-release-manual-checks.md`.

3. Push dispatch path is implemented but not yet production-validated end-to-end in a scheduled environment.
- Type: runtime/operational gap
- Why blocker: no launch-grade confidence without real secret-backed worker invocation cadence and device delivery validation.
- Required close: deploy `dispatch-notification-queue`, configure secrets + scheduler, validate queue transitions and delivered notifications on real devices.

### High

1. Moderation operations are still minimal.
- Type: product/runtime gap
- Reality: report/block flows and moderation records exist, but operator tooling remains thin and support fallback is still part of the plan.
- Required close: define operational triage ownership/SLA and capture first-run moderation runbook evidence.

2. Cross-device cinematic/performance sanity still needs explicit evidence capture.
- Type: runtime QA gap
- Reality: logic tests pass, but heavy visual surfaces still need final low-end Android + iOS runtime validation evidence.
- Required close: complete final device QA sweep and archive videos/screenshots for room/feed/profile critical paths.

3. Store metadata and policy form completion are still manual.
- Type: operational gap
- Reality: privacy/support/deletion pages exist and app links are wired, but Play/App Store submission metadata questionnaires remain incomplete by definition.
- Required close: complete store listing forms and align claims with current behavior.

### Medium

1. Legacy compatibility paths are still active.
- Type: intentional technical debt
- Reality: legacy deep-link and event fallback code remains in `mobile/src/lib/invite.ts` and `mobile/src/lib/api/data.ts`; compatibility routes (`PrayerCircle`, `EventsCircle`) still exist.
- Required close: keep for initial stabilization, then remove with telemetry-backed safety window.

2. Analytics baseline exists but product decision dashboards are not part of this repo pass.
- Type: operational analytics gap
- Reality: event capture/RPC storage and crash breadcrumbs exist; dashboarding and alert thresholds are still manual ops work.
- Required close: define launch dashboards/alerts for auth, invite, room join failure, reminder opt-in, and trust actions.

3. Notification delivery observability is baseline-only.
- Type: scope-limited implementation
- Reality: retry/backoff/invalid-token handling exists; receipt polling/open-rate instrumentation is still not implemented.
- Required close: add post-launch observability enhancements after initial beta stability.

### Polish

1. Continue copy/terminology cleanup as issues surface.
- Type: UX polish
- Reality: major terminology drift is largely resolved; occasional wording harmonization may still appear in edge states.

2. Improve consistency of empty/loading/error microcopy across long-tail states.
- Type: UX polish
- Reality: core paths are coherent; edge-path tone consistency can still be tightened.

## 3) What Is Genuinely Commercial-Grade Now

1. Canonical circles/invite lifecycle with role-aware membership boundaries.
2. Canonical occurrence/room routing with deep-link precedence coverage.
3. Trust foundations in product surfaces (report/block/unblock + account deletion initiation).
4. Android hardening baseline (release-signing guardrails + narrowed permission footprint + generated-native durability strategy).
5. Push foundation upgraded from persistence-only to queue + dispatch worker with retry/failure handling.
6. Observability baseline present (Sentry crash/release wiring + mobile analytics event pipeline).
7. Practical automated regression baseline for high-risk logic introduced across redesign phases.

## 4) What Is Still Not Commercial-Grade

1. iOS native release capability/signing/device validation from committed sources.
2. Proven production notification operations (scheduled worker, credential rotation evidence, real multi-device validation).
3. Mature moderation operator tooling and staffing/triage maturity.
4. Full store submission execution evidence (metadata questionnaires, signed binaries, final review assets).

## 5) What Should Not Be Attempted Before First Serious Release

1. Do not rewrite navigation architecture or deep-link model again.
2. Do not remove compatibility fallbacks before launch-stability telemetry window.
3. Do not add new push providers or a larger notification platform before validating current Expo dispatch path in production-like ops.
4. Do not attempt a broad visual redesign pass; focus on reliability, compliance, and operational readiness.

## 6) Legacy Compatibility Paths To Remove After Launch Stabilization

1. Legacy `events/room` fallback params (`eventId`, `eventTemplateId`, `eventSource`) when canonical room/occurrence links are fully dominant.
2. Legacy event-room fallback behavior in `mobile/src/lib/api/data.ts` (legacy event snapshot/join/leave presence fallbacks).
3. Compatibility community routes/screens (`PrayerCircle`, `EventsCircle`) once no inbound dependency remains.
4. Deprecated legacy-member helper wrappers in `mobile/src/lib/api/data.ts` once canonical service migration is complete.

## 7) Mandatory Manual Device/Store Checks Still Required

1. Android: real signed release build and artifact signature validation.
2. Android/iOS: physical-device reminder permission behavior and push delivery confirmation.
3. iOS: APNs capability, entitlements, signing, and TestFlight path validation.
4. Trust/safety: live report/block/unblock and account deletion request lifecycle on release candidate builds.
5. Policy links: privacy/support/account deletion route verification in release builds.

## 8) Repo/Documentation Gaps vs Runtime/Product Gaps

### Repo/Documentation Gaps

1. No committed iOS native project snapshot in this workspace.
2. No store-console evidence artifacts (submission metadata, screenshots, questionnaire answers) in repo.

### Runtime/Product Gaps

1. Secret-backed release and push operations still need execution evidence.
2. Moderation operator capability remains operationally minimal.
3. Device-level performance and push reliability still need final launch candidate evidence capture.
