# Globe Upgrades Manual QA

Date: 2026-03-09

## Preconditions

1. Canonical occurrences available in next 24h.
2. Presence data available for at least one room.
3. Optional for interactive mode: `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`.

## 1) Live placement and coherence

1. Open Live tab.
2. Confirm sequence remains:
- `EventsHeader`
- `Global Pulse` panel
- occurrence sections
3. Confirm no location permission prompt appears.

## 2) Marker scaling verification

1. Compare at least two pulses with different room activity.
2. Confirm higher activity pulses render visibly larger (bounded, not extreme).
3. Confirm detail preview includes intensity wording (`Calm`, `Steady`, `Vivid`, `Radiant` pulse).
4. Confirm marker scale is still legible and not cluttered.

## 3) State differentiation verification

Confirm visual distinction for:

1. live now
2. opening soon / waiting room
3. flagship
4. 11:11 ritual
5. general upcoming

Checks:

1. Legend entries exist for these states.
2. Flagship and 11:11 accent halos are visible and subtle.
3. Live vs upcoming ring energy feels distinct without noise.

## 4) Fullscreen immersive mode verification

1. Open fullscreen from the globe panel.
2. Confirm fullscreen includes:
- expanded legend
- intensity explanation note
- clean back/close action
3. When no marker selected, confirm `Join from the field` spotlight panel appears.
4. Tap spotlight entries and confirm canonical occurrence navigation.
5. Tap map markers and confirm selection preview supersedes spotlight panel.

## 5) Canonical CTA flow verification

1. Live marker -> opens canonical `EventRoom`.
2. Waiting-room marker -> opens canonical room/waiting path.
3. Upcoming marker -> opens canonical `EventDetails`.
4. Fullscreen preview primary/secondary CTA paths match canonical behavior.

## 6) Reduced-motion and performance

1. Enable reduced-motion and re-open Live.
2. Confirm pulse/autospin behavior is toned down.
3. Confirm interaction remains responsive in inline and fullscreen mode.
4. Confirm no blank globe card appears during fallback conditions.

## 7) Fallback verification (Mapbox unavailable)

1. Run without token or unsupported runtime.
2. Confirm fallback panel remains premium and informative.
3. Confirm occurrence list + CTAs continue to function.

## 8) Regression and test commands

Run:

```powershell
npm --prefix mobile run typecheck
npm --prefix mobile run test:phase3b-live
npm --prefix mobile run test:release-baseline
```

Expected:

1. Globe mapping/state/intensity tests pass.
2. No location permission/plugin regression.
3. Existing phase baseline remains green.
