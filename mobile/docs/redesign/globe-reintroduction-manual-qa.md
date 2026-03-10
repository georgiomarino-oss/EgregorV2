# Globe Reintroduction Manual QA

Date: 2026-03-09

## Preconditions

1. Canonical event/occurrence seed data available in local/staging Supabase.
2. At least one live or upcoming occurrence in next 24 hours.
3. Optional: `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` set for interactive globe validation.

## Core Live-Tab Validation

1. Open Live tab.
2. Confirm order: `EventsHeader` -> `Global Pulse` globe panel -> occurrence sections.
3. Confirm panel copy references canonical room pulses and approximate clusters.
4. Confirm no location permission prompt appears.

## Marker And CTA Validation

1. Tap an inline hotspot for a live occurrence.
2. Confirm navigation opens canonical `EventRoom` (room/occurrence identifiers present).
3. Tap an inline hotspot for an upcoming occurrence.
4. Confirm navigation opens canonical `EventDetails`.
5. Open fullscreen globe and tap hotspot.
6. Confirm preview card renders title, state, meta, and actions.
7. Confirm fullscreen primary/details actions route to canonical room/details flows.

## Privacy/Truthfulness Validation

1. Confirm legend labels read `Live`, `Upcoming`, `News`, `Active clusters`.
2. Confirm supporting note indicates approximate region/timezone clusters.
3. Confirm no UI language implies precise participant geolocation.

## Fallback Validation (No Mapbox)

1. Launch app without `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` or on runtime without Mapbox native bridge.
2. Confirm fallback card appears (no blank panel).
3. Confirm fallback copy states list mode remains active.
4. Confirm occurrence list and join/detail CTAs still work.

## Regression Checks

1. Validate deep-link and canonical join flow still work from occurrence cards.
2. Validate reminder toggle behavior on occurrence cards/details is unchanged.
3. Run:
```powershell
npm --prefix mobile run typecheck
npm --prefix mobile run test:phase3b-live
```

## Expected Outcomes

1. Globe is visible as a meaningful top Live surface.
2. Globe data is canonical and privacy-safe.
3. Interaction paths route to canonical occurrences/rooms.
4. Fallback remains polished and functional when interactive globe is unavailable.
