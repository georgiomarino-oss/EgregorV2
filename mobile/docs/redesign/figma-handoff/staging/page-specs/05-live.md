# Live - Figma Page Spec

## Canonical scope
- Objective: Stage canonical Live tab feed, globe, event detail, and event room surfaces.
- Canonical routes included: `EventsHome`, `EventsHome#GlobalPulseInline`, `EventsHome#GlobalPulseFullscreen`, `EventDetails`, `EventRoom`.
- Legacy excluded: deprecated pseudo-event room flows and deprecated events deep links.

## Source-of-truth files
- `mobile/docs/redesign/figma-handoff/staging/data/active-screen-blueprints.json`
- `mobile/docs/redesign/figma-handoff/staging/data/event-content-library.json`
- `mobile/docs/redesign/figma-handoff/staging/data/canonical-event-series.json`
- `mobile/docs/redesign/figma-handoff/staging/data/copy-state-library.json`
- `mobile/docs/redesign/figma-handoff/staging/data/asset-mapping.json`
- `mobile/docs/redesign/figma-handoff/staging/data/motion-surfaces.json`
- `mobile/src/screens/EventsScreen.tsx`
- `mobile/src/screens/EventDetailsScreen.tsx`
- `mobile/src/screens/EventRoomScreen.tsx`
- `mobile/src/features/events/components/EmbeddedGlobeCard.tsx`

## Frame list
| Route | Frame set | Required state frames | Key child components |
| --- | --- | --- | --- |
| `EventsHome` | `Screen/EventsHome/Default` | `loading_feed`, `feed_error`, `empty_live_feed`, `reminder_syncing` | EventsHeader, EmbeddedGlobeCard, OccurrenceList, AlertBanner |
| `EventsHome#GlobalPulseInline` | `Screen/EventsHome#GlobalPulseInline/Default` | `mapbox_ready`, `globe_fallback`, `no_pulses`, `selection_inactive` | EmbeddedGlobeCard inline mode, legend chips, fullscreen trigger |
| `EventsHome#GlobalPulseFullscreen` | `Screen/EventsHome#GlobalPulseFullscreen/Default` | `fullscreen_open`, `selection_active`, `selection_empty_with_spotlights` | EmbeddedGlobeCard fullscreen mode, selection preview panel, spotlight list |
| `EventDetails` | `Screen/EventDetails/Default` | `loading`, `target_unavailable`, `reminder_saved_removed`, `permission_blocked` | EventDetailsHero, EventDetailsMeta, ReminderStatusNotice, action button stack |
| `EventRoom` | `Screen/EventRoom/Default` | `waiting_room`, `live_now`, `ended`, `loading_room_details`, `playback_error` | RoomAtmosphereBackdrop, CollectiveEnergyField, RoomScriptPanel, RoomTransportControls |

## Component list
- EventsHeader
- EmbeddedGlobeCard (inline and fullscreen)
- OccurrenceCard family
- EventDetailsHero
- EventDetailsMeta
- ReminderStatusNotice
- RoomAtmosphereBackdrop
- CollectiveEnergyField
- RoomScriptPanel
- RoomTransportControls

## Text/content assignment (editable)
- Populate occurrence and detail content from `event-content-library.csv`/`.json` and `canonical-event-series.csv`/`.json`.
- Required fields: `stableKey`, `title`, `subtitle`, `description`, `categoryTheme`, `durationMinutes`, `associatedImageSlot`, `artDirectionNote`, treatment.
- Preserve state CTA mapping (`live`, `waiting_room`, `upcoming`, `ended`).
- Use `copy-state-library.json` for live status labels, reminder states, and permission-denied messaging.

## Asset placement instructions
- Use rows filtered to page `Live` in `asset-placement-index.csv`.
- Required slots:
- `live.hero.feed`
- `live.hero.details`
- `live.card.default`
- `live.card.flagship1111`
- `live.globe.fallback`
- `room.live.overlay`
- `ambient.lottie.cosmic`

## Motion-layer notes
- Global Pulse (inline/fullscreen): keep globe/map layer, pulse rings, accent rings, legend, selection card, spotlight list as separate editable layers.
- EventRoom: keep full atmosphere layer stack and live/waiting/ended state signaling chips.
- Reduced motion: lower pulse intensity or fallback while preserving state hierarchy and labels.
