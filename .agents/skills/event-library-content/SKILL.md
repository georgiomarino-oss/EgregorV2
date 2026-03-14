---
name: event-library-content
description: "Use when curating or validating Egregor canonical event-library content, lunar/full-moon scheduling, recurring series copy, event scripts, audio/timing prewarm workflows, or event content proofing. Do not use for generic app redesign, unrelated marketing copy, or store-listing-only work."
---

# Mission

Keep the event library spiritually resonant, canonically scheduled, TTS-safe, and operationally reusable.

## Read First

- `AGENTS.md`
- `mobile/docs/redesign/event-library-overhaul-plan.md`
- `mobile/docs/redesign/event-library-overhaul-pass.md`
- `mobile/docs/redesign/prayer-event-script-proofread-handoff.md`
- `mobile/docs/redesign/figma-handoff/content/canonical-event-series.json`
- `mobile/docs/redesign/figma-handoff/content/event-content-library.json`
- `supabase/scripts/lunar-phase-reference.2026-2028.json`
- `supabase/tests/event_library_overhaul.sql`

## Canonical Content Rules

- Preserve the canonical Home / Circles / Live / Profile app structure while working on event content.
- Use the canonical recurring series set; do not revive removed legacy event sources.
- Keep event copy varied, calm, and precise.
- Write for spoken delivery when scripts may be synthesized.

## Hard Constraints

- Do not invent fictitious moon names.
- Use `Blood Moon` wording only when eclipse-qualified source data supports it.
- Avoid repetitive scripts across recurring events.
- Keep scripts TTS-friendly:
  - natural sentence rhythm
  - no bullet-list prose
  - no robotic repeated openings
  - no vague filler spirituality

## Artifact And Pipeline Awareness

When content work touches runtime event experience, account for:

- persisted `event_occurrence_content`
- cached audio artifact reuse
- script prewarm
- audio prewarm
- artifact validation
- backfill for missing content

Useful scripts:

- `supabase/scripts/prewarm-event-occurrence-scripts.mjs`
- `supabase/scripts/prewarm-event-occurrence-audio-artifacts.mjs`
- `supabase/scripts/validate-event-occurrence-artifacts.mjs`
- `supabase/scripts/backfill-missing-event-artifacts.mjs`
- `supabase/scripts/prewarm-canonical-content.mjs`

## Deliverables

- content edits, curation notes, or pipeline-validation findings
- explicit notes on lunar naming, repetition, or artifact readiness where relevant
- run the relevant SQL or script validation flow when operational content changed
