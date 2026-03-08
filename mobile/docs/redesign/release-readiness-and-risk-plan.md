# Release Readiness And Risk Plan

Date: 2026-03-08

## 1) Launch Readiness Standard

Commercial release requires:

1. Canonical collaboration model (invites, memberships, persisted rooms).
2. Trust/safety baseline (report/block/moderation/account deletion).
3. Global scheduling reliability (11:11 local + true global moments).
4. Clear IA and discoverability (Home + Circles + Live + Profile).
5. Operational observability and rollback safety.

## 2) Trust/Safety/Compliance Model (Minimum Viable)

## 2.1 Reporting

1. Report entry points on profile, circle, event occurrence, and room participant.
2. Report reasons standardized (`abuse`, `harassment`, `spam`, `self-harm concern`, `other`).
3. Reports persist with timestamps, reporter, target, and evidence metadata.

## 2.2 Blocking

1. User can block from profile and room participant menus.
2. Block effects are immediate:
   - hide from discover/search
   - prevent invites
   - prevent private/circle room co-join
3. Block list is manageable from Profile settings.

## 2.3 Invitation abuse prevention

1. Per-user invite rate limits and cooldowns.
2. Progressive limits for newly created accounts.
3. Abuse signals on high decline rates and repeated external invites.

## 2.4 Presence visibility/privacy

1. Presence setting in profile: `public`, `circles_only`, `hidden`.
2. Default for new users: `circles_only`.
3. Live room participant visibility respects block/privacy rules.

## 2.5 Account deletion

1. In-app deletion request flow in Profile.
2. Explicit confirmation and policy disclosures.
3. Align app behavior with `web/app/account-deletion/page.tsx`.

## 2.6 Moderation operations

1. Primary: internal moderation queue (`moderation_reports` + `moderation_actions`).
2. Fallback: routed support workflow via `web/app/support/page.tsx` while queue tooling matures.
3. SLA targets documented for report triage and resolution.

## 3) Scheduling Operational Plan

1. Replace hardcoded client schedule constants in `mobile/src/features/events/utils/occurrence.ts`.
2. Materialize occurrences from server-side `event_series` configs.
3. Use scheduler/worker pipeline:
   - generate next occurrence horizon
   - enqueue reminder jobs
   - create/open rooms as occurrence windows begin
4. Support manual emergency global prayer trigger with audit logging.

## 4) Phased Roadmap

## 4.1 P0: Must-Fix Before Serious Release

### User/Business outcome

1. Collaboration is real and trustworthy.
2. Critical safety and account-compliance gaps are closed.
3. Store review risk is materially reduced.

### Backend changes

1. Add canonical invite/membership lifecycle entities.
2. Add `event_series` and `event_occurrences`.
3. Add canonical `rooms` and participant mapping layer.
4. Add `user_blocks`, `moderation_reports`, `moderation_actions`.
5. Add notification job queue primitives.

### Mobile changes

1. Add invite inbox and accept/decline flows.
2. Replace non-persisted room join paths with canonical room resolution.
3. Add report/block actions in profile and room contexts.
4. Add in-app account deletion entry flow in Profile.

### Release/compliance impact

1. Resolves mismatch between web deletion messaging and app behavior.
2. Introduces moderation and abuse handling baseline expected for app stores.

### Risk level

High (domain and RLS touchpoints).

### Dependencies

1. Supabase migrations and policy updates.
2. API layer split from monolithic `mobile/src/lib/api/data.ts`.
3. QA regression on shared solo and deep links.

## 4.2 P1: Strong-Launch Improvements

### User/Business outcome

1. Improved retention via clear Home and reminder loops.
2. Better discoverability and collaboration conversion.

### Backend changes

1. Notification preference expansion and scheduling reliability hardening.
2. Discoverability indexes/queries for circles and invites.
3. Moderation tooling enhancements (triage views and metrics).

### Mobile changes

1. Final IA labels and flow unification (Home/Circles/Live/Profile).
2. Reminder controls and quiet hours UI.
3. Circle discover/search and membership state improvements.

### Release/compliance impact

1. Improves transparency and control expected for commercial subscriptions.
2. Reduces support burden via clearer self-serve controls.

### Risk level

Medium.

### Dependencies

1. Event scheduler stability from P0.
2. Analytics instrumentation for retention and invite conversion.

## 4.3 P2: Polish And Growth

### User/Business outcome

1. Premium experience differentiation.
2. Better global growth and community depth.

### Backend changes

1. Advanced recommendation logic (next best event/circle).
2. Admin-curated event tooling and seasonal campaign support.
3. Moderation automation assist (rule-based triage).

### Mobile changes

1. Cinematic polish and animation tuning.
2. Advanced journaling insights and re-engagement loops.
3. Localization expansion and region-specific spiritual programs.

### Release/compliance impact

1. No major compliance blockers if P0/P1 complete.
2. Focus shifts to quality and scale operations.

### Risk level

Low to medium.

### Dependencies

1. Stable data model and observability from P0/P1.

## 5) Risk Register (Top Priority)

| Risk | Why It Matters | Mitigation |
|---|---|---|
| Breaking shared solo reliability while generalizing room model | This is currently a proven strong area | Keep shared solo tables active behind compatibility layer until parity is proven |
| RLS regressions in new membership/invite tables | Could expose private circle data | Stage migrations, run policy tests, add canary rollout |
| Deep-link breakage during IA rename | Invite conversion and collaboration drop | Maintain legacy route mapping and token resolver during transition |
| Notification fatigue | Retention damage and uninstall risk | Default moderate cadence + quiet hours + category-level controls |
| Moderation backlog | Trust erosion and support overload | SLA + fallback support route + prioritized triage categories |

## 6) Release Gates

P0 gate:

1. 100% of collaborative joins use persisted room identities.
2. Invite lifecycle present end-to-end (create, receive, accept/decline, expire/revoke).
3. Report/block and account deletion flow available in-app.
4. No critical RLS defects in security test suite.

P1 gate:

1. Home/Circles/Live/Profile IA live with stable telemetry.
2. Reminder system sends correctly localized events (including 11:11 local).
3. Discoverability and invite conversion KPIs meet launch threshold.

P2 gate:

1. Premium visual polish complete without performance regressions.
2. Growth features validated by retention and collaboration lift.

## 7) Verification And Observability

1. Add analytics events for invite lifecycle, room joins, reminder toggles, report/block usage.
2. Track join success rate and room persistence failures.
3. Track notification delivery/open rates by timezone bucket.
4. Maintain QA evidence trail similar to `mobile/docs/evidence/rc2`.

## 8) First Migration Targets (Concrete)

1. Supabase migration set adding invitations, occurrences, rooms, moderation.
2. `mobile/src/lib/api/data.ts` split into:
   - circles service
   - invites service
   - events/occurrences service
   - rooms service
   - safety service
3. `mobile/src/screens/CommunityScreen.tsx` reworked into Circles My/Discover/Invites structure.
4. `mobile/src/screens/EventsScreen.tsx` switched from synthesized occurrences to persisted occurrences.
5. `mobile/src/screens/ProfileScreen.tsx` updated with trust/safety and deletion flows.
