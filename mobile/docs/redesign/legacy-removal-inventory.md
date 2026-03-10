# Legacy Removal Inventory

Date: 2026-03-10
Scope: Phase legacy-removal and canonicalization pass.

## Inventory

| Path | Current behavior | Why legacy | Decision | Removal risk |
|---|---|---|---|---|
| `mobile/src/screens/PrayerCircleScreen.tsx` | Compatibility screen that says route moved, then attempts to find a "Prayer Circle" and redirect to `CircleDetails`. | Retired split-circle route; canonical Circles flow is `CommunityHome -> CircleDetails`. | Remove screen and route registration. | Low. Existing canonical Circles screen already exposes memberships and invites. |
| `mobile/src/screens/EventsCircleScreen.tsx` | Compatibility screen that says route moved, then attempts to find an "Events Circle" and redirect to `CircleDetails`. | Retired split-circle route; canonical Circles flow is centralized. | Remove screen and route registration. | Low. No canonical UX depends on this screen. |
| `mobile/src/app/navigation/RootNavigator.tsx` (`EventsCircle`/`PrayerCircle` stack screens) | Registers compatibility screens in the authenticated Community stack. | Keeps retired routes reachable in runtime navigation tree. | Remove stack routes and imports. | Low. |
| `mobile/src/app/navigation/types.ts` (`CommunityStackParamList.EventsCircle`, `CommunityStackParamList.PrayerCircle`) | Maintains deprecated route types. | Route API drift from intended IA. | Remove deprecated route params from type map. | Low; compile will surface any remaining references. |
| `mobile/src/app/AppRoot.tsx` deep links (`community/events-circle`, `community/prayer-circle`) | Accepts legacy compatibility paths. | Contradicts canonical target list (`invite`, `live/occurrence`, `room`, `circles/:id`). | Remove these mappings. | Medium for old external links; acceptable in canonicalization pass. |
| `mobile/src/lib/invite.ts` `events/room` parser path + legacy query parsing (`eventId`, `eventSource`, `eventTemplateId`) | Parses and routes legacy room links and params. | Old event/template model fallback path. | Remove legacy parser branch and legacy query handling. | Medium for old links; canonical links remain supported. |
| `mobile/src/lib/invite.ts` `buildEventInviteUrl` fallback to `egregorv2://events/room?...` | Generates legacy event-room links when canonical IDs are absent. | Reintroduces deprecated link shape. | Enforce canonical-only invite links (room or occurrence). | Medium; callers must handle missing canonical identifiers. |
| `mobile/src/screens/EventDetailsScreen.tsx` `eventId` -> `legacyEventId` normalization | Details screen still accepts legacy event ID input path. | Canonical model is occurrence/room-targeted only. | Remove legacy normalization and route param dependence. | Low. |
| `mobile/src/screens/EventRoomScreen.tsx` route fallbacks (`eventId`, `eventTemplateId`, cached template/event hydration) | Supports non-canonical room hydration from template/event fallback state. | Deprecated event/template fallback flow can reintroduce ambiguous room semantics. | Keep script-only UX fallback minimal; remove legacy event/template route and hydration branches. | Medium; ensure canonical room/occurrence routes remain intact. |
| `mobile/src/lib/api/circles.ts` legacy adapter API (`fetchPrayerCircleMembersLegacy`, `fetchEventsCircleMembersLegacy`, legacy add/remove/search) | Compatibility wrappers around old RPCs. | Old prayer/events circle management surface. | Remove if no remaining call sites. | Low once invite message context is switched to canonical member lookup. |
| `mobile/src/lib/api/data.ts` legacy adapter re-exports/wrappers for prayer/events circle members | Provides old member/search/add/remove API and caches used by legacy flows. | Transitional glue for retired screens/flows. | Remove wrappers and caches once screens use canonical invite-context members. | Medium; verify Solo/Event share flows still work. |
| `mobile/src/features/community/components/*` | Old Community-era components (`CircleEntryCards`, `CommunityAlertFeed`, `GlobalPulseHero`, `LiveMetricsPanel`). | No longer used by canonical screens. | Remove dead components. | Low. |
| `mobile/src/features/circles/components/CircleMemberRow.tsx` | Old circle-member row tied to legacy `PrayerCircleMember` data shape. | Unused after canonical circles migration. | Remove dead component. | Low. |
| `mobile/src/lib/api/data.ts` legacy event-room DB fallbacks (`fetchLegacyEventRoomSnapshot`, `joinLegacyEventRoom`, etc.) | Allows fallback to old `events`/`event_participants` path when canonical RPCs fail. | Keeps retired non-canonical room behavior alive under failures. | Keep temporarily for runtime migration safety in this pass; document retention. | High if removed abruptly without verifying backend parity in all environments. |

## Intentional temporary retention in this pass

1. `mobile/src/lib/api/data.ts` legacy event-room fallback functions and fallback branching remain temporarily retained.
- Reason: they are deep runtime safety nets around Supabase schema drift and join/presence RPC failures.
- Containment: no primary UX route will intentionally generate legacy room links after this pass.
- Follow-up: remove after launch-stability telemetry confirms zero reliance and all environments are on canonical schema.
