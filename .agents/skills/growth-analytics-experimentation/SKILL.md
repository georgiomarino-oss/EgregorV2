---
name: growth-analytics-experimentation
description: "Use when reviewing Egregor funnels, analytics instrumentation, experiment ideas, activation or retention improvements, or measurement gaps tied to real product behavior. Do not use for vanity-metric reporting, uninstrumented hype ideas, or purely visual redesign work."
---

# Mission

Improve growth decisions through real funnel visibility and testable hypotheses, not vanity dashboards.

## Read First

- `AGENTS.md`
- `mobile/docs/release/observability-and-analytics.md`
- `mobile/src/lib/observability/analytics.ts`
- `mobile/src/app/navigation/AuthGate.tsx`
- `mobile/src/screens/EventDetailsScreen.tsx`
- `mobile/src/screens/EventRoomScreen.tsx`
- `mobile/src/screens/ProfileScreen.tsx`
- `web/app/analytics.ts`
- `web/WEBSITE_UPGRADES_SETUP.md`

## Current High-Value Funnels

- auth entry -> auth submit -> session active
- invite viewed -> accepted or declined
- live details viewed -> reminder toggle -> join pressed -> room join success or failure
- notification permission trigger -> result
- trust actions: report, block, unblock
- account deletion initiation
- support form submission on web

## Analytics Rules

- Measure decisions and failure points, not vanity engagement totals.
- Keep event definitions tied to a real user action or real operational outcome.
- Prefer a small number of durable, queryable events over broad noisy logging.
- Do not add instrumentation that conflicts with privacy, deletion, or store-truth commitments.

## Experiment Rules

- Form hypotheses around activation, retention, trust, or conversion.
- Keep experiments reversible and measurable.
- Do not use manipulative growth tactics or misleading urgency.
- Do not design experiments that hide support, privacy, or deletion pathways.

## Deliverables

- instrumentation audit, event additions, funnel analysis, or experiment briefs
- explicit success metric, guardrail metric, and rollout scope for each experiment
- validation note on where the event is emitted and where it lands
