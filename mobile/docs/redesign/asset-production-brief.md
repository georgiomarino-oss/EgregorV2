# Phase 4A Asset Production Brief

Date: 2026-03-08  
Scope: Production-ready visual media direction for cinematic section themes and reusable premium card/background treatments.

## 1) Creative North Star

Egregor should feel like a premium spiritual operating system, not a generic meditation app:

1. Celestial and luminous, with authored light direction.
2. Cinematic depth through atmosphere, not noisy visual clutter.
3. Human and collective: prayer as intimate and global.
4. Commercial-grade polish: legible overlays, stable composition, scalable asset pipeline.

## 2) Section Palette and Atmosphere Guidance

## 2.1 Solo

1. Base palette: deep indigo, midnight plum, violet smoke, warm candle gold accents.
2. Mood: intimate sanctuary, reflective, personal aura field.
3. Light direction: soft top-left glow, low-frequency warm rim light.
4. Texture: faint mist and silk-like gradients, no harsh particles.

## 2.2 Circles

1. Base palette: deep teal, ocean cyan, glacier blue, pearl highlights.
2. Mood: communal, living constellation, trust and belonging.
3. Light direction: broad horizontal aurora with clustered soft nodes.
4. Texture: subtle atmospheric grain + gentle luminous ribbons.

## 2.3 Live

1. Base palette: cosmic navy, electric sky, pale starlight, amber-gold highlights.
2. Mood: synchronized global moment, urgency + calm.
3. Light direction: strong volumetric beam + warm event edge.
4. Texture: planet-scale haze, thin cloud bands, restrained motion trails.

## 2.4 Profile

1. Base palette: moonstone slate, cool steel blue, muted ivory, soft gold.
2. Mood: trust ledger, stability, grounded reflection.
3. Light direction: subtle museum-like spot + soft archival glow.
4. Texture: refined paper/fiber microtexture at very low contrast.

## 3) Asset Specifications

1. Prefer 1536x1024 masters for landscape card crops and 1024x1536 alternates for portrait.
2. Safe text zone: keep central 60% horizontally and lower 40% vertically readable under scrim.
3. Deliver with clean edges (no embedded text/branding/watermark).
4. Output formats:
   1. `webp` for static card art.
   2. `png` fallback for alpha-friendly overlays.
   3. `mp4` and optionally Lottie for motion loops.

## 4) Prompt-Ready Art Direction

## 4.1 Prayer Card Cover Art (Solo)

Prompt template:

`Cinematic celestial prayer cover, intimate sacred chamber, indigo and plum atmosphere, soft golden aura bloom, volumetric dust motes, refined spiritual tone, realistic light scattering, high-end editorial color grading, no text, no logos, no people close-up, clean center composition for UI overlays`

Variations:

1. Dawn renewal (warmer gold, lighter violet mist).
2. Night release (deeper indigo, silver moon haze).
3. Protection and grounding (earth-warm undertone, steadier glow ring).

## 4.2 Live/Event Card Cover Art (Live)

Prompt template:

`Premium cinematic global prayer event artwork, planetary horizon with luminous atmosphere, deep navy and sky-blue gradients, warm amber edge lights, synchronized energy arcs, elegant spiritual realism, commercial app hero quality, no text, no logos, clear foreground-midground-background separation`

Variations:

1. Global heartbeat pulse.
2. Daily 11:11 intention alignment.
3. Circle-hosted gathering.

## 4.3 Live Prayer Backgrounds

Prompt template:

`Immersive live prayer background, calm but powerful celestial light field, layered mist planes, soft luminous nodes, deep-space ambience, readable under dark UI overlays, subtle contrast, no text, no hard focal clutter`

## 4.4 Live Event Backgrounds

Prompt template:

`Cinematic live event room backdrop, collective energy vortex with restrained motion cues, cool blue aura with warm highlights, atmospheric depth, premium streaming-era visual quality, readability-first composition, no text`

## 4.5 Globe / Global Consciousness Imagery

Prompt template:

`Global consciousness visualization, Earth-like sphere with luminous connective lines and prayer nodes, elegant spiritual technology aesthetic, cinematic volumetric lighting, deep navy background, refined and non-gamified look, no text`

## 4.6 Section Hero Visuals

Solo prompt:
`Intimate spiritual sanctuary hero art, indigo aura, warm gold micro-light, meditative stillness, premium editorial atmosphere`

Circles prompt:
`Community constellation hero visual, cyan luminous network, welcoming collective aura, modern sacred atmosphere`

Live prompt:
`Global live moment hero visual, cinematic horizon glow, synchronized energy wave, high-clarity contrast`

Profile prompt:
`Trust and reflection hero visual, slate and moonlight palette, archival elegance, subtle paper-light texture`

## 4.7 Motion Background Loops / Lottie / Video Candidates

Deliver candidates:

1. Solo aura breathing loop (8-12s seamless).
2. Circles constellation drift loop (10-14s seamless).
3. Live global pulse loop (8-10s seamless).
4. Profile ambient archive glow loop (10-12s seamless).

Constraints:

1. Avoid high-frequency flashing.
2. Keep low motion amplitude for reduced-motion substitutions.
3. Design to degrade cleanly to static keyframe.
4. Keep bitrate and alpha strategy mobile-friendly.

## 5) Overlay and Fallback Compatibility Rules

1. Assets must remain legible under 45-70% dark scrim.
2. Brightest highlights should avoid top-center text lockup area.
3. Provide at least one neutral fallback set per section for missing data cases.
4. Avoid dominant purple in non-solo sections to prevent palette mismatch.

## 6) Acceptance Checklist

1. Section identity is visually distinct at first glance.
2. Text remains readable with app scrims and status chips.
3. Art does not look synthetic or template-like.
4. No visual conflict with CTA/button placements.
5. Reduced-motion fallback still feels premium and intentional.
