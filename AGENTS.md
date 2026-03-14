# Egregor Codex Guide

## Project Identity

Egregor is a premium spiritual, prayer, manifestation, and collective-intention product. The repository contains:

- `mobile/`: Expo + React Native + TypeScript app
- `web/`: Next.js marketing, support, privacy, subscription, and account-deletion surfaces
- `supabase/`: database migrations, SQL tests, scripts, and Edge Functions
- `tools/figma-importer/`: Figma staging/import tooling for canonical app handoff

The goal is commercial-grade product work without breaking the current canonical architecture, trust posture, or release path.

## Canonical Product Structure

Preserve the top-level product model:

- `Home`
- `Circles`
- `Live`
- `Profile`

Important implementation detail:

- The current bottom-tab route keys remain `SoloTab`, `CommunityTab`, `EventsTab`, and `ProfileTab` in `mobile/src/app/navigation/RootNavigator.tsx` even though the user-facing labels are `Home`, `Circles`, `Live`, and `Profile`.
- Do not rename route keys casually. Preserve deep-link compatibility and analytics continuity unless the task explicitly includes that migration.

Preserve the canonical collaboration model:

- `event_series -> event_occurrences -> rooms`
- Every real-time join flow must resolve to a persisted room identity.
- Deep links must resolve to canonical targets such as invite, occurrence, room, or circle.
- Auth-gated deep-link capture in `mobile/src/app/navigation/AuthGate.tsx` and linking config in `mobile/src/app/AppRoot.tsx` are critical infrastructure.

## Architecture To Preserve

Mobile:

- Reuse the existing screen responsibilities in `mobile/src/screens`.
- Preserve canonical section responsibilities:
  - `SoloScreen` is the current `Home / Solo` entry.
  - `CommunityScreen` is the canonical `Circles` surface.
  - `EventsScreen`, `EventDetailsScreen`, and `EventRoomScreen` are the canonical `Live` flow.
  - `ProfileScreen` and `ProfileSettingsScreen` are the canonical `Profile / Settings` flow.
- Reuse the token and theme system in `mobile/src/theme/tokens.ts` and the guardrails in `mobile/docs/DESIGN_SYSTEM.md`.

Backend:

- Reuse Supabase auth, tables, policies, and Edge Functions unless a task explicitly requires schema work.
- Prefer extending canonical tables and functions over reviving deprecated ones.
- Preserve deletion, safety, notification, and observability behavior already documented in `mobile/docs/release`.

Web:

- Treat `web/app/privacy/page.tsx`, `web/app/support/page.tsx`, `web/app/subscriptions/page.tsx`, and `web/app/account-deletion/page.tsx` as public compliance surfaces.
- Website claims must stay aligned with actual app/runtime behavior.

Android native:

- `mobile/android` is generated and gitignored.
- The Android source of truth is:
  - `mobile/app.json`
  - `mobile/plugins/withPhase6aAndroidHardening.js`
  - `mobile/scripts/verify-android-merged-manifest.mjs`
- Do not treat generated native files as the durable place for release hardening.

## UX And Design Expectations

Preserve the current direction:

- Premium, cinematic, spiritually resonant, calm, and precise.
- Editorial clarity over vague mysticism.
- Strong hierarchy, readable copy, and obvious primary actions.
- Motion should reinforce state and atmosphere, not decoration for its own sake.

Required guardrails:

- Use design tokens and shared primitives. Do not hardcode screen colors in `mobile/src/screens`.
- Respect safe areas, touch targets, contrast, and readability over atmospheric effects.
- Preserve the Global Pulse globe, room atmospheres, and background systems without letting them obscure controls or text.
- Respect reduced-motion behavior and low-end device constraints, especially on room and globe surfaces.

## Do Not Reintroduce Deleted Legacy Flows

Do not bring back removed or intentionally deprecated flows, screens, or links:

- `PrayerCircleScreen`
- `EventsCircleScreen`
- legacy `community/events-circle` deep links
- legacy `community/prayer-circle` deep links
- deprecated `events/room` deep-link shape
- non-canonical pseudo-room or fake shared-room entry paths

Use the canonical replacements already documented in:

- `mobile/docs/redesign/legacy-removal-inventory.md`
- `mobile/docs/redesign/legacy-removal-pass.md`

## Trust, Privacy, And Compliance Rules

Be truthful and privacy-safe at all times:

- Do not claim a feature is shipped, validated, or store-ready unless the repo and current evidence support that claim.
- Do not overstate push readiness, iOS readiness, social auth support, or event audio readiness.
- Keep privacy, support, subscriptions, and account-deletion messaging aligned across mobile and web.
- Never hide or downplay report/block, privacy, support, or account deletion pathways.
- Preserve the current account deletion path: `Profile -> Settings -> Account deletion`.
- Preserve the current support/deletion fallback posture on web for users who cannot access the app.

Current release/compliance constraints are documented in:

- `mobile/docs/redesign/store-submission-readiness.md`
- `mobile/docs/redesign/launch-candidate-punch-list.md`
- `mobile/docs/release/privacy-data-handling-map.md`
- `mobile/docs/redesign/true-account-deletion-pass.md`

## Social Auth, Identity, Push, And Store-Readiness Guidance

- The current repo snapshot clearly supports Supabase email/password auth in `mobile/src/screens/AuthScreen.tsx`.
- Social auth should be treated as additive work, not assumed current behavior.
- If adding Google or Apple sign-in, preserve:
  - auth-gated deep-link capture
  - session continuity
  - profile bootstrap
  - duplicate-profile avoidance
  - deletion/support/store-policy alignment
- Do not claim Sign in with Apple or Google support in product copy or store materials until runtime, callback, and reviewer paths are actually validated.

Push and reminders:

- Current real categories are `invite`, `occurrence_reminder`, and `room_reminder`.
- Do not claim more than the documented dispatch path actually supports.

Store readiness:

- Android hardening is durable in tracked config, but signed-release proof is still an operational gate.
- iOS readiness cannot be inferred from repo state alone when `mobile/ios` is absent.

## Figma And UXPilot Workflow Rules

Use canonical handoff artifacts when preparing design work:

- `mobile/docs/redesign/figma-export-handoff.md`
- `mobile/docs/redesign/figma-handoff/README.md`
- `mobile/docs/redesign/figma-handoff/staging/README.md`
- `tools/figma-importer/README.md`

Rules:

- Export or stage canonical screens only.
- Keep the required Figma page order intact.
- Use real content libraries, state libraries, and motion references from the repo.
- Do not export removed legacy routes or compatibility flows as active UX.
- If design work changes canonical copy, motion annotations, or asset mappings, update the handoff package as part of the same task.

## Validation Expectations

After code or config changes, run the smallest relevant validation set that still proves the work:

Mobile baseline:

- `npm --prefix mobile run typecheck`
- `npm --prefix mobile run test:release-baseline`
- `npm --prefix mobile run ci:design-system` when touching screen styling or visual surfaces

Web:

- `npm --prefix web run typecheck`
- `npm --prefix web run build` for meaningful web/content/metadata work

Supabase:

- Run targeted SQL tests from `supabase/tests/README.md` when touching migrations, RLS, canonical event data, invites, safety, or deletion logic.

Android release config:

- Follow `mobile/docs/release/android-native-source-of-truth.md` when changing Android config or permissions.

Figma handoff:

- `npm --prefix tools/figma-importer run validate` when changing staging handoff data
- `npm --prefix tools/figma-importer run bundle` when changing importer-facing staging content

Manual QA is expected for high-risk areas:

- room entry/playback/presence
- shared solo deep links and sync
- globe interactions
- reminders/push permission flows
- trust actions
- account deletion

Use `mobile/docs/qa-redesign-checklist.md` and relevant phase manual QA docs when a task touches those surfaces.

## Repo-Local Skills

This repo includes targeted skills under `.agents/skills/`.

- Use them when the task matches their trigger description.
- Prefer explicit invocation when a task spans design, compliance, release, SEO, ASO, motion, analytics, or Figma handoff work.
- Start with `docs/codex/skills-map.md` for the recommended skill map.
