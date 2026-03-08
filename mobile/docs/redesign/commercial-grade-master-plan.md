# EgregorV2 Commercial-Grade Master Plan

Date: 2026-03-08  
Scope: Product redesign blueprint only (no production code changes in this task)

## 1) Mission And Constraints

EgregorV2 should ship as a premium, cinematic, spiritually resonant, globally collaborative, scalable, store-ready product without a big-bang rewrite.

This plan is grounded in the current codebase and database, especially:

- Mobile navigation and tabs: `mobile/src/app/navigation/RootNavigator.tsx`, `mobile/src/app/navigation/BottomTabs.tsx`
- Circle and events surfaces: `mobile/src/screens/CommunityScreen.tsx`, `mobile/src/screens/EventsScreen.tsx`, `mobile/src/screens/PrayerCircleScreen.tsx`, `mobile/src/screens/EventsCircleScreen.tsx`, `mobile/src/screens/EventRoomScreen.tsx`
- Shared solo hardening: `mobile/src/screens/SoloLiveScreen.tsx`, `mobile/src/lib/api/data.ts`, `supabase/migrations/20260306*_shared_solo_*.sql`, `supabase/migrations/20260307*_shared_solo_*.sql`
- Token/theme foundation: `mobile/src/theme/tokens.ts`, `mobile/docs/DESIGN_SYSTEM.md`
- Legal/support/account surfaces: `web/app/privacy/page.tsx`, `web/app/terms/page.tsx`, `web/app/support/page.tsx`, `web/app/account-deletion/page.tsx`

## 2) Current-State Truth (Reuse vs Replace)

| Area | Current Reality | Decision |
|---|---|---|
| Shared live solo | Persisted collaborative session stack already hardened (`shared_solo_sessions`, participant RLS, reusable sessions) | Reuse as backbone for real-time room reliability; generalize into canonical room model |
| Theme/design tokens | Tokenized system already present | Reuse and evolve, do not rewrite |
| Supabase foundation | Stable tables for profiles, circles, events, participants, journal, subscriptions | Reuse core tables; extend with missing product-model entities |
| Deep links | Existing scheme and parser (`egregorv2://`, invite capture in `AuthGate`) | Reuse scheme; add canonical invite and room targets |
| Legal/support web | Privacy/terms/support/account deletion pages already deployed | Reuse; align app behavior to claims (especially delete-account) |
| Circle model | Owner-centric personal circles managed via RPC; no invitation lifecycle | Replace ownership semantics with role-based memberships + invitations |
| Event/room model | Mixed semantics: persisted event rooms vs synthesized occurrence pseudo-rooms | Replace with canonical `event_series -> event_occurrence -> room` chain |
| Discoverability | Weak "shared with me" visibility in current Community model | Replace IA to include explicit inbox and membership states |

## 3) Product-Structure Decisions (Canonical)

1. Community becomes **Circles**.
2. Events remains a separate destination, renamed **Live**.
3. Bottom navigation becomes: **Home, Circles, Live, Profile**.
4. Default/home screen becomes **Home** (retention + clarity): next live moment, quick solo entry, invite inbox summary, circle activity.
5. Solo remains first-class but moves from top-level tab identity to primary block/action inside Home and Live room entry.

Incremental migration detail:

- Keep underlying route keys stable initially (`SoloTab`, `CommunityTab`, `EventsTab`) while relabeling in UI to avoid deep-link and analytics breaks.
- Move to final route names after canonical models are shipped and telemetry is stable.

## 4) Canonical Product Model Corrections

This redesign resolves current blocking issues:

1. Owner-centric circles -> multi-role circle governance (`owner`, `steward`, `member`) with explicit membership lifecycle.
2. Weak "shared with me" discoverability -> invite inbox + membership inbox on Home/Circles.
3. No invitation lifecycle -> first-class invitation objects (`pending`, `accepted`, `declined`, `revoked`, `expired`).
4. Mixed room semantics -> all joinable sessions are persisted rooms tied to either an event occurrence or a shared solo session.
5. Fake shared rooms -> remove non-persisted collaborative room experiences from production paths.

## 5) Scheduling Strategy (Global + Local)

### Scheduling rules

1. Event cadence is config-driven through canonical `event_series` records, not hard-coded client constants.
2. At least one daily series starts at **11:11 local time** for each user timezone.
3. True global moments run on UTC-anchored schedules.
4. Event occurrences are materialized ahead of time by backend jobs.
5. Admins can publish curated events and trigger emergency global prayer moments.

### Default starter schedule

| Event Name | Category | Purpose | Recurrence | Time Basis | Default Duration | Target Need/State | Why It Belongs |
|---|---|---|---|---|---|---|---|
| 11:11 Intention Reset | Daily Rhythm | Midday recentering and intention realignment | Daily at 11:11 | Local | 11 min | Busy, scattered, overloaded | Signature daily ritual with spiritual identity |
| Sunrise Gratitude | Daily Rhythm | Begin day grounded in gratitude | Daily at 07:00 | Local | 12 min | Anxiety on waking, mental noise | Supports daily habit loop and retention |
| Evening Release | Daily Rhythm | Let go, forgive, close the day | Daily at 21:30 | Local | 15 min | Stress, rumination, sleep transition | Strong re-engagement anchor |
| Global Heartbeat | Global Moment | Shared synchronized prayer across regions | Every 6 hours (00:00/06:00/12:00/18:00) | UTC | 15 min | Need for global belonging | Creates true cross-region simultaneity |
| Weekly Circle Gathering | Community | Circle-led live collective session | Weekly | Circle timezone default | 30 min | Desire for continuity and belonging | Converts circles into living communities |
| New Moon Reflection | Lunar | Collective renewal and intention setting | Monthly (curated date) | UTC with local rendering | 30 min | Transition, reset, reflection | Distinct spiritual differentiator |
| Emergency Global Prayer | Alert | Rapid coordinated response to crisis | Admin-triggered | UTC immediate | 20 min | Collective grief, urgency | Supports trust, relevance, and mission response |

## 6) Trust/Safety Minimum For Commercial Launch

1. In-app reporting for users/content/events/rooms.
2. User blocking with immediate effect on invites, visibility, and room joins.
3. Invitation abuse controls (rate limits, cooldowns, trust-score gates).
4. Presence privacy controls (public to circle / contacts only / hidden).
5. In-app account deletion request and confirmation flow.
6. Moderation queue (or support-backed fallback) with SLA and audit trail.

## 7) Delivery Strategy (No Big-Bang Rewrite)

1. Phase P0: fix domain integrity and trust/safety gaps before serious release candidate.
2. Phase P1: strengthen launch quality with new Home/Circles/Live IA and richer reminders.
3. Phase P2: premium polish, growth loops, and advanced collaboration.

Phases are detailed in `mobile/docs/redesign/release-readiness-and-risk-plan.md`.

## 8) Recommended Implementation Order For Next Codex Tasks

1. Create canonical backend entities/migrations: invitations, circle membership lifecycle, event series/occurrences, rooms, reports/blocks.
2. Refactor `mobile/src/lib/api/data.ts` into modular services for circles/invites/events/rooms/safety to reduce coupling risk.
3. Ship invite inbox + accept/decline UX and "shared with me" discoverability in Circles.
4. Replace synthesized room-entry paths with persisted occurrence-room joins in Live.
5. Add in-app report/block and account deletion flow in Profile (aligned with `web/app/account-deletion/page.tsx`).
6. Introduce Home IA and relabel tabs without breaking deep links, then migrate route keys.

## 9) Files And Tables Most Likely To Change First

### Mobile files

- `mobile/src/lib/api/data.ts`
- `mobile/src/app/navigation/BottomTabs.tsx`
- `mobile/src/app/navigation/RootNavigator.tsx`
- `mobile/src/app/navigation/types.ts`
- `mobile/src/screens/CommunityScreen.tsx` (to become Circles experience)
- `mobile/src/screens/PrayerCircleScreen.tsx`
- `mobile/src/screens/EventsCircleScreen.tsx`
- `mobile/src/screens/EventsScreen.tsx`
- `mobile/src/screens/EventDetailsScreen.tsx`
- `mobile/src/screens/EventRoomScreen.tsx`
- `mobile/src/screens/ProfileScreen.tsx`
- `mobile/src/screens/SoloLiveScreen.tsx` (integration, not rewrite)

### Supabase tables and RPC/functions

- Existing to extend: `profiles`, `circles`, `circle_members`, `events`, `event_participants`, `user_event_subscriptions`, `user_journal_entries`, `app_user_presence`, `shared_solo_sessions`, `shared_solo_participants`
- New canonical additions: `circle_invitations`, `event_series`, `event_occurrences`, `rooms`, `room_participants`, `user_blocks`, `moderation_reports`, `moderation_actions`, `notification_queue` (or equivalent job table)
- Existing function to retire/replace: `supabase/functions/generate-news-driven-events/index.ts` (replace with config-driven scheduler)

## 10) Legacy Behaviors To Preserve During Migration

1. Shared solo deep links and session reuse behavior (current hardened paths).
2. Existing `egregorv2://` scheme and auth-gated invite capture handoff.
3. Theme/token usage and existing semantic color architecture.
4. Existing legal/support website entry points and URLs.
5. Journal autosave behavior and continuity of existing journal entries.
6. Existing user auth/session continuity and profile bootstrap behavior.
