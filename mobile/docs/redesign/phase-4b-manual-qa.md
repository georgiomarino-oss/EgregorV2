# Phase 4B Manual QA

Date: 2026-03-08  
Scope: Applying the Phase 4A cinematic system to production user journeys (Solo, Live, Circles, rooms, Profile).

## 1) Build And Canonical Regression Gate

1. Run `npm --prefix mobile run typecheck`.
2. Run `npm --prefix mobile run test:phase3b-live`.
3. Launch app and verify tab navigation + auth handoff still work.

## 2) Solo Visual Coherence

## 2.1 Solo Home

1. Open `SoloScreen`.
2. Confirm hero, filter chips, and prayer rails feel section-coherent (luminous solo palette, no mismatched flat purple blocks).
3. Confirm prayer cards use premium composition with readable title/body/CTA over fallback media treatment.
4. Confirm empty/loading/error states still read clearly over cinematic surfaces.

## 2.2 Solo Setup

1. Open `SoloSetupScreen` from normal flow.
2. Confirm setup hero, readiness panel, and start-action panel use cinematic solo styling and shared primitives.
3. Confirm spacing hierarchy and CTA placement feel intentional (not admin-like stacked blocks).
4. Confirm Start action still routes to `SoloLive` with unchanged params semantics.

## 3) Live Feed And Details Coherence

## 3.1 Live Feed

1. Open `EventsScreen`.
2. Confirm section cards and occurrence cards feel immersive (not list-row/basic cards).
3. Verify `11:11` section has elevated symbolic treatment.
4. Verify `Global Flagships` section has elevated premium treatment.
5. Verify reminder bell interaction remains clear in all states.

## 3.2 Live Details

1. Open `EventDetailsScreen` for each state: waiting-room, live, upcoming, ended.
2. Confirm hero + details + action strip share the live cinematic language.
3. Confirm join/reminder/refresh CTAs remain readable and obvious.
4. Confirm canonical target behavior is unchanged (join -> room, non-live context remains details-first).

## 4) Circles And Invite Flow Presentation

## 4.1 Circles Home

1. Open `CommunityScreen`.
2. Confirm segmented tabs are themed to Circles and remain readable/accessibly tappable.
3. Confirm My Circles / Shared With Me / Pending Invites remain obvious and unchanged semantically.

## 4.2 Circle Details

1. Open `CircleDetailsScreen` as owner/steward and as member.
2. Confirm members and invite sections feel premium/relational, not utility tables.
3. Confirm manage-member modal actions still work and preserve canonical role semantics.

## 4.3 Invite Composer

1. Open `CircleInviteComposerScreen`.
2. Confirm existing-user and link modes are visually premium and first-class.
3. Confirm role-selection tabs remain clear and backend-authoritative behavior unchanged.
4. Confirm invite link sheet (copy/share/status) is readable and polished.

## 4.4 Invite Decision

1. Open `InviteDecisionScreen` with pending, accepted, declined, revoked, expired, and invalid tokens.
2. Confirm ceremonial clarity of status + action area.
3. Confirm Accept/Decline/Open Circle flows still behave canonically.

## 5) Profile Journey Space

1. Open `ProfileScreen` with high-data and low-data accounts.
2. Confirm hero, trust metrics, journal panel, and account actions feel like one premium sanctuary.
3. Confirm profile low-data fallback state feels intentional (not sparse/unfinished).
4. Confirm journal interaction and autosave cues remain legible and stable.

## 6) Live Room Readability And Immersion

1. Open `SoloLiveScreen` and `EventRoomScreen`.
2. Confirm upgraded atmosphere backdrop adds depth/light without harming control/script readability.
3. Confirm header/status/script/transport controls remain readable across waiting/live/ended paths.
4. Confirm no room logic regressions in join/leave/share/reminder pathways.

## 7) State Coverage

Validate these presentational states across upgraded screens:

1. Empty: no circles, no invites, no users found, invalid invite.
2. Loading: solo setup, circle details/invites, live details, feed sections.
3. Error: retry panels and inline errors remain prominent and actionable.
4. Saved/reminder: journal save states and event reminder states remain understandable.
5. Ended/waiting room/live: labels and CTA states remain explicit.

## 8) Reduced Motion And Accessibility Sanity

1. Enable OS Reduce Motion.
2. Confirm room atmosphere degradation path reduces animated layers while preserving premium visual quality.
3. Increase text size to large/largest available.
4. Confirm shared state cards, tabs, and form fields remain readable and usable.
5. Confirm tap targets remain practical on segmented controls, card actions, and reminder toggles.

## 9) Performance Sanity Checks

1. On lower-end Android/emulator, verify no severe jank in Live feed scroll rails.
2. Enter/exit both room types repeatedly and verify no severe frame drops.
3. Verify atmosphere quality fallback path triggers gracefully on weaker devices.

## 10) Remaining Production Art Dependencies

Current fallback treatments are intentionally premium and safe, but final art can still improve these surfaces:

1. Solo prayer card cover art variants.
2. Live occurrence card cover art by category/signature moment.
3. SoloLive and EventRoom background loop assets (Lottie/video candidates).
4. Section hero media sets for Solo/Circles/Live/Profile.

Reference prompt-ready direction in `mobile/docs/redesign/asset-production-brief.md`.