# Post-Launch Cleanup Safe-to-Delete Report

## 1. Executive Summary
- Overall cleanup readiness: moderate. There are clear dead-code/dead-asset wins, but `mobile/src/lib/api/data.ts` still contains migration-era fallback logic that should not be removed blindly.
- Biggest safe wins:
  - Unreferenced UI components (`ActionPanel`, `CircleEmptyState`, `CircleHero`, `CircleInvitePanel`, `EventFilterBar`)
  - Unreferenced legacy icon/placeholder assets under `mobile/assets/icons/tab` and default Expo icon files under `mobile/assets/`
- Biggest risky areas:
  - Legacy room/feed fallback branches in `mobile/src/lib/api/data.ts`
  - Compatibility persistence fallback (`user_event_subscriptions`) still used as a safety net
  - Anything that could affect multi-environment Supabase migration compatibility
- Recommended cleanup order:
  1. Delete definitely dead components/assets
  2. Update stale current-state docs
  3. Remove low-risk adapters/fallbacks only after runtime validation in all environments
  4. Trim likely-unused dependencies with lockfile refresh and test pass

## 2. Definitely Safe to Delete
| Path | Category | Why it is safe | Evidence | Expected impact if removed |
|---|---|---|---|---|
| `mobile/src/components/ActionPanel.tsx` | Unused component | No inbound imports/usages found in app code/tests/scripts. | `rg -n "ActionPanel" mobile/src` returns only self-references in this file. | No runtime impact; lower component surface area. |
| `mobile/src/features/circles/components/CircleEmptyState.tsx` | Unused component | No inbound imports/usages. | `rg -n "CircleEmptyState" mobile/src` returns only self-references. | No runtime impact; reduces dead Circles UI variants. |
| `mobile/src/features/circles/components/CircleHero.tsx` | Unused component | No inbound imports/usages. | `rg -n "CircleHero" mobile/src` returns only self-references. | No runtime impact; removes legacy split-circle hero code. |
| `mobile/src/features/circles/components/CircleInvitePanel.tsx` | Unused component | No inbound imports/usages. | `rg -n "CircleInvitePanel" mobile/src` returns only self-references. | No runtime impact; reduces dead panel wrappers. |
| `mobile/src/features/events/components/EventFilterBar.tsx` | Unused component | No inbound imports/usages. | `rg -n "EventFilterBar" mobile/src` returns only self-references. | No runtime impact; removes dead filter UI branch. |
| `mobile/assets/icons/tab/hands-pray.svg` | Dead asset | Not referenced by app config, source, or scripts. | Fixed-string search over `mobile/src`, `mobile/app.json`, `mobile/scripts` returns no match. | No runtime impact; asset cleanup only. |
| `mobile/assets/icons/tab/earth.svg` | Dead asset | Not referenced by app config, source, or scripts. | Same as above. | No runtime impact. |
| `mobile/assets/icons/tab/arrow-left-right.svg` | Dead asset | Not referenced by app config, source, or scripts. | Same as above. | No runtime impact. |
| `mobile/assets/icons/tab/account-outline.svg` | Dead asset | Not referenced by app config, source, or scripts. | Same as above. | No runtime impact. |
| `mobile/assets/icons/tab/account-heart-outline.svg` | Dead asset | Not referenced by app config, source, or scripts. | Same as above. | No runtime impact. |
| `mobile/assets/android-icon-background.png` | Dead asset | Not referenced; Android icon paths are configured to brand assets in `app.json`. | `mobile/app.json` points to `assets/brand/app-icon-still-1024.png`; no references to this file in code/config/scripts. | No runtime impact. |
| `mobile/assets/android-icon-foreground.png` | Dead asset | Not referenced; superseded by brand adaptive icon config. | Same as above. | No runtime impact. |
| `mobile/assets/android-icon-monochrome.png` | Dead asset | Not referenced. | Same as above. | No runtime impact. |
| `mobile/assets/icon.png` | Dead asset | Not referenced; app icon configured to brand asset path. | `mobile/app.json` uses `./assets/brand/app-icon-still-1024.png`; no references to this file. | No runtime impact. |
| `mobile/assets/favicon.png` | Dead asset | Not referenced; web favicon configured to brand asset path. | `mobile/app.json` uses `./assets/brand/app-icon-still-48.png`; no references to this file. | No runtime impact. |

## 3. Likely Safe to Delete
| Path | Category | Why it appears removable | What still makes it non-certain | Recommended validation before deletion |
|---|---|---|---|---|
| `mobile/assets/generated/solo/solo-category-prayer-card.png` | Orphan generated asset | Generated and listed in prompts/manifest, but runtime art resolver maps Solo default card to `cards/solo-prayer-card-neutral.png` instead. | It may be intentionally kept as a future-ready asset in the generation set. | Remove only if also removing/updating `asset-prompts.json` + `asset-manifest.json` entry and rerunning `assets:generate:cinematic`. |
| `mobile/assets/generated/asset-prompts.json` entry `solo_category_prayer_card` | Generation config | Appears to generate an unused output asset. | Could be intentionally retained for design flexibility. | Confirm no planned screen uses it; then remove entry and regenerate manifest. |
| `mobile/assets/brand/logo-v1.png` | Legacy brand asset | No runtime references found in `mobile/src`, `mobile/app.json`, `mobile/scripts`. | Could be used externally (marketing/design handoff). | Confirm with design/brand owner before deletion. |
| `mobile/assets/brand/logo-V1.png.png` | Legacy brand asset | Same as above; appears duplicate/misnamed. | External/manual use unknown. | Confirm ownership, then remove duplicate first. |
| `mobile/assets/brand/egregor-v1-still-transparent.svg` | Legacy brand asset | No runtime references found. | External/manual use unknown. | Confirm with design/brand owner. |
| `mobile/assets/brand/Egregor Mobile Redesign v2 - Missing Screens.png` | Design artifact | No runtime references found. | Might be historical evidence intentionally retained. | Decide archive policy; move to archival folder or delete. |
| `mobile/assets/brand/Egregor Mobile Redesign v2 - Missing Screens-1.png` | Design artifact | No runtime references found. | Same as above. | Same as above. |
| `mobile/assets/brand/Egregor Mobile Redesign v2 - Cosmic Live System.png` | Design artifact | No runtime references found. | Same as above. | Same as above. |
| `mobile/assets/brand/app-icon-still-192.png` | Unused size variant | Runtime config references 1024 and 48, not 192. | Could be needed in external store/marketing workflows. | Confirm if any build/store pipeline consumes this file out-of-band. |
| `mobile/assets/brand/app-icon-still-512.png` | Unused size variant | Runtime config references 1024 and 48, not 512. | Same as above. | Same as above. |
| `mobile/src/screens/PrayerLibraryScreen.tsx` | Potential dead route/screen | No in-app navigation call to `navigate('PrayerLibrary')` found; Solo home currently surfaces library inline. | Route still registered and deep-link mapped (`solo/library`), so it may be intentionally retained for link compatibility. | Runtime-link test for `egregorv2://solo/library`; check analytics before deleting route/screen. |
| `supabase/functions/generate-news-driven-events/index.ts` | Likely retired function | Not in `supabase/config.toml`; mobile function client does not invoke it. | Could be triggered by external scheduler/operator scripts. | Verify no production scheduler calls it before deletion. |
| `mobile/docs/qa-redesign-checklist.md` | Stale doc | Still includes `Prayer Circle` and `Events Circle` sections despite route/screen removal. | Could be kept as historical snapshot. | Prefer replacing with current canonical QA checklist or archive explicitly. |
| `mobile/docs/redesign/launch-candidate-punch-list.md` | Stale doc | States compatibility routes still exist; now contradicted by current nav/deep-link code. | Could be intended as historical at-time snapshot. | Mark historical or update with post-removal status. |
| `mobile/docs/redesign/final-art-and-layout-pass.md` | Stale doc section | Contains statement that legacy compatibility screens were not reworked; those screens are now removed. | Could be historical narrative. | Add date-scoped note or archive section. |
| `mobile/docs/redesign/information-architecture-and-user-journeys.md` | Partial drift | Mapping table still references `PrayerCircleScreen.tsx` / `EventsCircleScreen.tsx`; also says legacy links remain supported. | Some sections are strategy/history, not current implementation state. | Update current-state mapping while preserving historical context as appendix. |

## 4. Keep For Now
| Path | Category | Why it should stay | Risk if removed | Revisit timing |
|---|---|---|---|---|
| `mobile/src/lib/api/data.ts` (legacy event-room/feed fallback branches) | Migration/runtime safety | Still contains explicit fallback logic for missing canonical tables/RPCs (`listEventFeedFromLegacyTables`, `fetchLegacyEventRoomSnapshot`, `join/leave/refreshLegacyEventRoom`, `shouldFallbackToLegacyEventRoom`). | High risk of room/feed breakage in lagging or partially migrated environments. | Revisit after telemetry confirms zero fallback hits across environments. |
| `mobile/src/lib/api/data.ts` (`user_event_subscriptions` compatibility fallback) | Compatibility persistence | Notification preference reads/writes still gracefully handle missing canonical tables by fallback logic. | Could regress reminder preference continuity in partially migrated backends. | Revisit after confirmed full canonical rollout and data migration completion. |
| `mobile/src/types/assets.d.ts` | TS runtime typing support | Ambient declarations are consumed by TypeScript automatically (not import-based). | Type errors for image/svg module imports if removed. | Keep until tsconfig/module typing strategy changes. |
| `mobile/plugins/withPhase6aAndroidHardening.js` | Release hardening source-of-truth | Required durable source for generated-native Android hardening (`/android` ignored). | Could reintroduce release-signing and permission hardening drift. | Keep through launch; only refactor with full replacement plugin strategy. |
| `mobile/scripts/verify-android-merged-manifest.mjs` | Release verification | Enforces blocked/required permission expectations for generated Android manifests. | Loss of reproducible hardening verification in CI/manual release flow. | Keep at least through first launch-candidate stabilization cycle. |
| `supabase/functions/dispatch-notification-queue/index.ts` | Canonical release-critical path | Active notification queue dispatch implementation for invite/reminder categories. | Removes actual dispatch path; major release regression. | Keep. Optimize after post-launch metrics. |
| `supabase/functions/_shared/notificationDispatchPolicy.ts` | Shared dispatch correctness | Used by dispatch function and phase 6A tests for retry/permanent-failure policy. | Dispatch behavior drift and reduced test confidence. | Keep. |
| `mobile/scripts/run-phase3b-live-tests.mjs` + `mobile/tests/phase3b-live-model.test.cts` | Regression guardrail | Verifies deep-link precedence and deprecated route rejection. | Legacy links/routes could accidentally reappear. | Keep through post-launch cleanup phases. |

## 5. Unknown / Needs Runtime Confirmation
| Path | Category | Why it is ambiguous | What evidence is missing | How to confirm safely |
|---|---|---|---|---|
| `mobile/src/screens/PrayerLibraryScreen.tsx` + `RootNavigator`/`AppRoot` `PrayerLibrary` route/path | Route/screen | No obvious in-app entry, but route still registered and deep-link path exists. | Production deep-link usage stats and product intent for `solo/library`. | Instrument/deploy link hit telemetry; run manual deep-link QA before removal. |
| `supabase/functions/generate-news-driven-events/index.ts` | Backend function | Appears unconfigured in repo, but external scheduler usage is unknown. | Production scheduler/job inventory. | Check deployed functions/schedulers and logs; deprecate with staged disablement first. |
| `mobile/assets/brand/*` non-runtime files | Asset library | Runtime-unreferenced, but external docs/design workflows may depend on them. | Confirmation from design/marketing usage. | Move to an explicit archive folder first; delete after owner sign-off. |
| `react-dom`, `react-native-web` in `mobile/package.json` | Dependency | No source imports, but Expo web toolchain may require them. | Web build/run verification after temporary removal. | Test `npm --prefix mobile run web` in CI and local before removing. |
| Legacy fallback branches in `mobile/src/lib/api/data.ts` | Runtime compatibility | Current local/canonical environments may not trigger fallbacks, but non-local environments might. | Runtime fallback hit-rate telemetry across staging/prod. | Add temporary fallback-hit logging/metrics; remove only after sustained zero-hit window. |

## 6. Legacy Fallback Deep Dive

### `mobile/src/lib/api/data.ts`
- Current fallback surfaces (evidence):
  - Canonical feed fallback to legacy tables: `listEventFeedFromLegacyTables` and fallback branch in `listEventFeed` (around lines reported by `rg`: 1280, 1371-1374).
  - Room lifecycle fallback functions: `fetchLegacyEventRoomSnapshot`, `joinLegacyEventRoom`, `leaveLegacyEventRoom`, `refreshLegacyEventPresence`, plus `shouldFallbackToLegacyEventRoom` (`rg` hits around 2923-3219).
  - Notification compatibility fallback to legacy subscription table: `user_event_subscriptions` read/write branches (`rg` hits around 2034, 2106, 2130, 2189, 2216).
- What looks removable now:
  - Nothing in this file is high-confidence removable without cross-environment runtime confirmation.
- What should wait:
  - All event-room and feed fallback branches should wait for a measured zero-fallback period.
  - `user_event_subscriptions` fallback should wait until canonical notification persistence is fully validated in all environments.

### Old event-room fallback logic
- Still present only in data layer, not as primary route semantics.
- `EventRoomScreen` now routes canonical IDs (`occurrenceId`, `roomId`) and does not expose old `events/room` params in nav types or linking config.

### Invite/deep-link compatibility shims
- `mobile/src/lib/invite.ts` now parses only:
  - `invite/:token`
  - `solo/live`
  - `live/occurrence/:id`
  - `room/:id`
- No parser branch exists for `community/events-circle`, `community/prayer-circle`, or `events/room` in current file.
- Phase 3B live tests now explicitly assert deprecated links are rejected.

## 7. Dead Route / Screen Audit
- Routes/screens no longer registered (current evidence):
  - Community stack in `RootNavigator` includes only `CommunityHome`, `CircleDetails`, `CircleInviteComposer`, `InviteDecision`.
  - `AppRoot` linking config contains canonical paths (`circles/:circleId`, `circles/:circleId/invite`, `live/occurrence/:occurrenceId`, `room/:roomId`) and no `community/events-circle` / `community/prayer-circle` / `events/room`.
- Screens still present but likely no longer reachable from primary UX:
  - `PrayerLibraryScreen` (route exists, but no in-app navigation call to `navigate('PrayerLibrary')` found).
- Route params/types that look obsolete:
  - Legacy deep-link room params (`eventId`, `eventTemplateId`, `eventSource`) are absent from `EventsStackParamList`.
  - `EventJoinTarget.legacyEventId` remains in data layer as compatibility surface (not user-facing route param).
- Deep-link patterns that appear stale:
  - Deprecated paths persist mainly in historical docs and in test cases that intentionally verify rejection.

## 8. Asset Audit
- Orphaned generated assets:
  - `solo/solo-category-prayer-card.png` is produced by generation manifest/prompts but not used by runtime art slot resolver (`cinematicArt.ts` maps Solo default to `cards/solo-prayer-card-neutral.png`).
- Manifest-referenced assets:
  - Most generated assets are wired through `mobile/src/lib/art/cinematicArt.ts`.
- Stale placeholder/legacy assets:
  - `mobile/assets/icons/tab/*.svg` are unreferenced (tab icons are now inline SVG in `BottomTabs.tsx`).
  - Default Expo assets (`mobile/assets/icon.png`, `mobile/assets/favicon.png`, `mobile/assets/android-icon-*.png`) are unreferenced by current app config.
- Safe candidate deletions:
  - Items listed in Section 2 under dead assets.
- Tooling gaps:
  - No automated check currently compares `asset-prompts.json`/generated outputs against actual slot usage in code; this allows orphan generated images to accumulate.

## 9. Dependency Audit
| Package | Why it may be unused | Evidence | Confidence level | Recommended action |
|---|---|---|---|---|
| `@expo-google-fonts/cormorant-garamond` | No imports detected in app/source/scripts. | Present in `package.json`; no matches in `mobile/src`, `mobile/scripts`, `mobile/tests`, `mobile/app.json`. | High | Remove in dedicated dependency cleanup pass; run typecheck + full test baseline. |
| `@expo-google-fonts/space-grotesk` | No imports detected. | Same evidence pattern as above. | High | Remove in dependency cleanup pass with lockfile update. |
| `@lottiefiles/dotlottie-react` | No imports detected; current app uses `lottie-react-native`. | Present in `package.json`; import scan shows only `lottie-react-native` in `EmbeddedGlobeCard`. | High | Remove unless there is a near-term web DotLottie plan. |
| `mapbox-gl` | No direct imports detected. | Present in `package.json`; no import references in source/scripts/tests. | Medium-High | Remove together with `@lottiefiles/dotlottie-react` after verifying no hidden web dependency. |
| `react-dom` | No direct source imports, but typically required for Expo web runtime. | Present in `package.json`; import scan has no direct usage. | Medium | Keep for now; only remove after passing `npm --prefix mobile run web` checks. |
| `react-native-web` | Same as above. | Present in `package.json`; no direct source imports. | Medium | Keep for now; validate web workflow before any removal. |

## 10. Test / Script Audit
- Stale tests:
  - No definitely stale tests found in `mobile/tests`.
  - Phase-labeled tests remain relevant and are wired via npm scripts.
- Stale helper scripts:
  - No definitely stale scripts found in `mobile/scripts`.
- Fragile runners:
  - Phase test runners compile explicit file lists into temporary dirs (for example `.tmp-phase3b-tests`). This is operationally fine but somewhat brittle if file paths move.
- Scripts referencing removed flows:
  - None found in active script runner files.
  - Deprecated route references are in tests intentionally to assert rejection behavior.
- Scripts worth preserving:
  - `verify-android-merged-manifest.mjs`
  - phase test runners (`run-phase3b-live-tests`, `run-phase4b-visual-tests`, `run-phase5b-account-trust-tests`, `run-phase6a-notification-dispatch-tests`)
  - `generate-cinematic-assets.mjs`
  - `sync-lottie-assets.mjs`

## 11. Documentation Audit
- Docs that still mention removed legacy behavior and should be updated/archived:
  - `mobile/docs/qa-redesign-checklist.md` (still includes Prayer Circle/Events Circle sections)
  - `mobile/docs/redesign/launch-candidate-punch-list.md` (claims compatibility routes still exist)
  - `mobile/docs/redesign/final-art-and-layout-pass.md` (states legacy compatibility screens remained)
  - `mobile/docs/redesign/information-architecture-and-user-journeys.md` (screen mapping still includes removed split-circle screens; states legacy links remain supported)
  - Root `README.md` (Milestone 0 framing is stale relative to current phase state)
- Docs likely duplicated but still useful:
  - Multiple phase verification/manual QA docs overlap by design; treat as historical record, not active runbook duplication.
- Docs that should be kept as historical design record:
  - Phase reports/manual QA docs (`phase-2a` through `phase-6a`)
  - `legacy-removal-inventory.md` and `legacy-removal-pass.md` as change history

## 12. Recommended Cleanup Sequence
- Phase A: obvious dead files/assets
  - Delete all Section 2 items.
  - Run `npm --prefix mobile run typecheck` and `npm --prefix mobile run test:release-baseline`.
- Phase B: stale docs and archival hygiene
  - Update current-state docs listed in Section 11.
  - Move historical-only media/docs to a clear archive path or delete with owner approval.
- Phase C: low-risk adapter cleanup after validation
  - Evaluate `PrayerLibrary` route/screen retention.
  - Evaluate generated orphan asset entry (`solo_category_prayer_card`) and prune generation config if not needed.
- Phase D: dependency cleanup and fallback retirement
  - Remove high-confidence unused packages.
  - Only then retire `data.ts` legacy fallback paths after runtime telemetry confirms safety.

## 13. Exact Codex Follow-Up Prompt
```text
You are doing a destructive cleanup pass that must delete ONLY high-confidence dead items already validated in the audit.

Delete exactly these paths and nothing else:
- mobile/src/components/ActionPanel.tsx
- mobile/src/features/circles/components/CircleEmptyState.tsx
- mobile/src/features/circles/components/CircleHero.tsx
- mobile/src/features/circles/components/CircleInvitePanel.tsx
- mobile/src/features/events/components/EventFilterBar.tsx
- mobile/assets/icons/tab/hands-pray.svg
- mobile/assets/icons/tab/earth.svg
- mobile/assets/icons/tab/arrow-left-right.svg
- mobile/assets/icons/tab/account-outline.svg
- mobile/assets/icons/tab/account-heart-outline.svg
- mobile/assets/android-icon-background.png
- mobile/assets/android-icon-foreground.png
- mobile/assets/android-icon-monochrome.png
- mobile/assets/icon.png
- mobile/assets/favicon.png

Guardrails:
- Do not delete anything not listed above.
- Do not change product logic, routes, or fallback behavior in this pass.
- Do not touch `mobile/src/lib/api/data.ts` fallback logic.
- Do not modify Android generated-native hardening source-of-truth files.

After deletion:
1. Run `npm --prefix mobile run typecheck`
2. Run `npm --prefix mobile run test:release-baseline`
3. Provide a changed-files summary and report any failures.
```
