---
name: release-readiness-qa
description: "Use when auditing Egregor launch readiness, validating release evidence, running regression commands, tightening checklists, reviewing blockers, or preparing launch-candidate QA. Do not use for open-ended redesign work or feature ideation that is not tied to validation, evidence, or release risk."
---

# Mission

Judge the repo against commercial-release reality, not optimistic assumptions.

## Read First

- `AGENTS.md`
- `mobile/docs/redesign/store-submission-readiness.md`
- `mobile/docs/redesign/launch-candidate-punch-list.md`
- `mobile/docs/redesign/release-readiness-and-risk-plan.md`
- `mobile/docs/release/pre-submission-checklist.md`
- `mobile/docs/release/android-native-source-of-truth.md`
- `mobile/docs/release/ios-release-manual-checks.md`
- `mobile/docs/release/notification-delivery-readiness.md`
- `mobile/docs/qa-redesign-checklist.md`
- `supabase/tests/README.md`

## Baseline Commands

Run the relevant subset and report what actually ran:

- `npm --prefix mobile run typecheck`
- `npm --prefix mobile run test:release-baseline`
- `npm --prefix mobile run ci:design-system` when screen visuals changed
- `npm --prefix web run typecheck` when web changed
- `npm --prefix web run build` when meaningful web behavior or metadata changed
- `npm --prefix tools/figma-importer run validate` when Figma staging changed

When Supabase schema, RLS, or canonical content changed, use the relevant SQL flow from `supabase/tests/README.md`.

## Current Known Blockers And Risks

Keep these visible unless a task produces real closure evidence:

- Android signed-release proof with real credentials
- iOS native signing, entitlement, APNs, and physical-device validation
- push dispatch end-to-end production-like validation
- event audio readiness when provider credits or artifact validation are still open
- moderation operator maturity and evidence

## Review Standard

- Do not call something ready because the code path exists.
- Separate repo truth from runtime proof.
- Separate automated proof from manual device proof.
- If evidence is missing, say so explicitly.
- Avoid reopening architecture late unless the current architecture itself is the blocker.

## Deliverables

- pass/fail findings
- commands run
- missing evidence
- blocker severity
- manual QA still required

## Helpful Pairings

- Pair with `$trust-safety-compliance` when deletion, privacy, support, moderation, or public claims are in scope.
- Pair with `$performance-accessibility` when the change touches room, globe, or motion-heavy surfaces.
