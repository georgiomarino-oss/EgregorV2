# Egregor Mobile Redesign QA Checklist

Use this checklist for manual iOS + Android smoke QA before commit/release.

## Test setup
- Verify with `Reduce Motion` OFF and ON.
- Verify with network online, then briefly toggle offline/slow network for loading and retry states.
- Verify with at least one live event occurrence and one upcoming occurrence in seeded/test data.

## 1) Community / Global Pulse
- Verify:
  - Hero renders, live counters refresh, alerts list updates, and CTA links open Circle screens.
  - Loading/empty/error states are readable and retry works.
- Regression risks:
  - Hero/metric hierarchy updates obscuring real-time values.
  - Alert feed empty/error surface replacing actionable content incorrectly.
- Platform watch:
  - Android text clipping in hero metrics, iOS safe-area spacing at top.
- Highest-risk interaction:
  - Tap-through to Prayer Circle / Events Circle from community entry cards.

## 2) Solo Home / Prayer Library
- Verify:
  - Category chips filter as before, prayer cards open setup/live flows correctly.
  - Featured/favorites/recents sections render consistently.
  - Prayer Library route still accessible and visually aligned.
- Regression risks:
  - Chip selected state mismatched with actual filter state.
  - Card press feedback masking disabled/unavailable states.
- Platform watch:
  - Horizontal chip scroll/touch target behavior differences.
- Highest-risk interaction:
  - Fast-start prayer selection from Solo home.

## 3) Solo Setup
- Verify:
  - Selected prayer summary, options, and start CTA behavior unchanged.
  - Start enters Solo Live with correct params.
- Regression risks:
  - CTA hierarchy polish reducing clarity of primary start action.
- Platform watch:
  - Keyboard overlap (if any editable controls) and bottom safe-area CTA spacing.
- Highest-risk interaction:
  - Start prayer action from setup summary panel.

## 4) Solo Live room
- Verify:
  - Audio play/pause/seek/mute works, timed words highlight, completion still records session once.
  - Reduced-motion mode softens aura/entry motion without removing functional feedback.
- Regression risks:
  - Shared room-player extraction causing subtle timing regressions.
  - Mute toggle visual state diverging from actual audio output.
- Platform watch:
  - Android audio focus interruptions and resume behavior.
- Highest-risk interaction:
  - Enter -> play -> pause/seek -> complete -> exit flow.

## 5) Events list / embedded globe
- Verify:
  - Only live/upcoming occurrences appear; ended occurrences are excluded.
  - Live/Soon/Upcoming chips match previous semantics.
  - Embedded globe selection maps to the same occurrence details.
- Regression risks:
  - Presentation split changing list/globe selection synchronization.
  - Notification toggle UI drifting from occurrence key state.
- Platform watch:
  - Map touch accuracy/performance differences.
- Highest-risk interaction:
  - Select hotspot -> open occurrence card -> open details.

## 6) Full-screen globe
- Verify:
  - Enter/exit fullscreen works, close affordance reliable.
  - Hotspot selection opens preview sheet and route handoff works.
  - Mapbox fallback still works when native map unavailable.
- Regression risks:
  - Overlay controls intercepting map gestures.
  - Preview sheet not matching selected hotspot.
- Platform watch:
  - Android back behavior while fullscreen overlay is active.
- Highest-risk interaction:
  - Enter fullscreen -> select hotspot -> open details/room.

## 7) Event Details
- Verify:
  - Status/timing metadata displays correctly.
  - Join/open CTA behavior and route params unchanged.
- Regression risks:
  - Visual refactor obscuring schedule/live state context.
- Platform watch:
  - Long-title wrapping and metadata truncation.
- Highest-risk interaction:
  - Details CTA into Event Room.

## 8) Event Room
- Verify:
  - Presence lifecycle joins/leaves/refreshes without visible errors.
  - Audio, timed highlighting, and schedule-offset playback remain stable.
  - Mute affects actual output.
- Regression risks:
  - Presence refresh cadence causing UI jitter.
  - Energy visual state interfering with controls/readability.
- Platform watch:
  - Background/resume behavior around live sessions.
- Highest-risk interaction:
  - Join room during live state and remain through status updates.

## 9) Prayer Circle
- Verify:
  - Search/add/remove/invite flows still work.
  - Empty/low-member states render correctly.
- Regression risks:
  - Styled member rows hiding or compressing action affordances.
- Platform watch:
  - Search field focus + keyboard + list interaction.
- Highest-risk interaction:
  - Add member from search result then remove.

## 10) Events Circle
- Verify:
  - Search/add/remove/invite semantics unchanged.
  - Distinct circle identity visuals do not affect action clarity.
- Regression risks:
  - Invite panel hierarchy causing wrong button taps.
- Platform watch:
  - Dense row actions in small screens.
- Highest-risk interaction:
  - Invite flow end-to-end with list refresh.

## 11) Profile / Trust & Progress
- Verify:
  - Hero + metrics render without changing metric meaning.
  - Account/support actions remain discoverable.
- Regression risks:
  - Section re-grouping making utility actions hard to find.
- Platform watch:
  - Long metric labels clipping on narrow Android devices.
- Highest-risk interaction:
  - Navigate through metrics and utility action areas in one pass.

## 12) Journal autosave
- Verify:
  - Journal paging still works, autosave status appears correctly, data persists after navigation away/back.
- Regression risks:
  - Visual shell changes masking save-state transitions.
- Platform watch:
  - Keyboard + text input behavior differences, especially multiline.
- Highest-risk interaction:
  - Edit page -> wait for autosave -> switch page -> return.

## 13) Loading / empty / error states
- Verify:
  - Shared loading/empty/error cards appear in all core flows with consistent hierarchy.
  - Retry actions trigger the same underlying behavior as before.
- Regression risks:
  - State component reuse introducing wrong copy/action labels.
- Platform watch:
  - Reduced-motion mode with loading opacity drift.
- Highest-risk interaction:
  - Force network failure then recover via retry in Community and Events.

## 14) Accessibility / reduced motion basics
- Verify:
  - Primary buttons, chips, cards, and room controls announce readable labels and state (selected/disabled/busy) with screen reader.
  - Decorative glows/background effects are not over-announced.
  - Reduced-motion mode lowers ornamental motion intensity across rooms and primary surfaces.
- Regression risks:
  - Nested accessibility labels causing duplicate announcements.
  - Inconsistent reduced-motion behavior in newly extracted components.
- Platform watch:
  - VoiceOver (iOS) vs TalkBack (Android) read order differences.
- Highest-risk interaction:
  - Full navigation pass using screen reader + reduced motion enabled.

## 15) Shared Solo final device QA (deep links + sync hardening)
- Device matrix:
  - Run all checks on at least one iOS + one Android physical device.
  - Execute once with `Host=iOS / Participant=Android`, then swap (`Host=Android / Participant=iOS`).
- Preconditions:
  - Two authenticated test users that are members of the same prayer circle.
  - Optional third authenticated non-member user.
  - Host can enter `SoloLive` with script + audio loaded.
- Deep-link coverage:
  - Verify cold-start link open: app closed -> open `egregorv2://solo/live?...&sharedSessionId=<id>` -> lands in Solo Live shared session.
  - Verify warm-start link open: app in background -> open same link -> active app resolves to same shared session.
  - Verify post-auth capture: signed out user opens invite link -> completes auth -> lands in target shared session.
  - Verify invalid link handling: missing/blank `sharedSessionId` does not enter shared session.
  - Platform watch:
    - Link handoff behavior from Messages/WhatsApp/browser differs on iOS vs Android.
- Shared sync coverage:
  - Verify participant playback follows host (`play`, `pause`, `seek`, completion), with participant controls blocked.
  - Verify participant drift correction after host seek (participant snaps back to host timeline).
  - Verify join count updates on both devices when participant joins/leaves.
  - Verify host gets join notice (`Someone joined your prayer.` / `More people joined your prayer.`).
- Background/resume coverage:
  - Host path: while shared session active, background app for ~20-40s, resume, verify state still authoritative for participants.
  - Participant path: background app for ~20-40s, resume, verify rejoin/presence refresh and playback resync.
  - Network flap: briefly toggle airplane mode during active session, restore network, verify snapshot/presence recovery.
- Host end cleanup coverage:
  - End by completion: host reaches session end -> participant sees playback stop and session end state.
  - End by exit: host taps close/exit early -> participant session ends and controls no longer attempt live sync.
  - Re-entry check: previously joined participant cannot continue reading live session state after host end unless rejoined to a new active session.
- Non-member / access control coverage:
  - Non-member authenticated user opens invite link for an active shared session.
  - Verify user cannot read/join session state unless they become an active participant (RLS scope).
  - Verify leaving a shared session revokes further read visibility for that user until rejoin.
- Highest-risk interaction:
  - Host starts shared solo -> shares deep link -> participant joins mid-playback -> both background/resume -> host ends -> non-member attempts access.

## 16) Phase 6A release hardening checks
- Verify:
  - Reminder permission prompts are contextual (Event Details, Event Room, Profile) and not auth-gate forced.
  - Invite/reminder queue rows transition through dispatch states (`pending` -> `processing` -> `sent`/`failed` or retry back to `pending`).
  - Room join success/failure and trust actions (report/block/unblock) complete without misleading UI state.
  - Account deletion request initiation shows status-aware behavior and blocks duplicate active requests.
- Regression risks:
  - Notification worker failing silently when secrets are missing.
  - Permission state copy diverging from actual OS permission state.
  - Analytics/crash initialization missing in release env while appearing normal in dev.
- Platform watch:
  - Android 13+ notification permission variants and settings redirect behavior.
  - iOS push permission/status behavior (manual verification required if iOS native project is generated outside this repo snapshot).
- Highest-risk interaction:
  - Live details -> save reminder -> join room -> report room -> account deletion request initiation in one signed-in session.

## Exit criteria
- All high-risk interactions above pass on at least one iOS and one Android device.
- No route/param regressions observed.
- No blocker in room entry, playback, event join, circle actions, or journal autosave.
- Shared-solo final matrix (section 15) passes on both host/participant platform permutations.
