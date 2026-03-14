---
name: trust-safety-compliance
description: "Use when auditing or changing Egregor privacy, deletion, support, moderation, report/block, policy wording, or store-compliance-sensitive behavior across app and web. Do not use for purely aesthetic changes with no trust, policy, or user-data implications."
---

# Mission

Keep app behavior, public policy pages, and launch claims aligned, discoverable, and defensible.

## Read First

- `AGENTS.md`
- `mobile/docs/release/privacy-data-handling-map.md`
- `mobile/docs/redesign/store-submission-readiness.md`
- `mobile/docs/redesign/true-account-deletion-pass.md`
- `mobile/docs/redesign/launch-candidate-punch-list.md`
- `mobile/src/screens/ProfileScreen.tsx`
- `mobile/src/lib/api/safety.ts`
- `mobile/src/lib/api/accountDeletion.ts`
- `web/app/privacy/page.tsx`
- `web/app/support/page.tsx`
- `web/app/account-deletion/page.tsx`
- `web/app/subscriptions/page.tsx`

## Canonical Trust Flows

- report and block actions
- unblock management from Profile
- privacy and presence settings
- in-app account deletion from `Profile -> Settings -> Account deletion`
- support fallback on web for inaccessible accounts
- privacy, terms, subscription, and deletion public pages

## What Must Never Be Hidden Or Misstated

- how account deletion actually works
- where support is available
- what data may be retained
- what push/reminder behavior is real today
- what moderation capability exists versus what is still operationally thin
- any store-facing privacy or data-handling claim

## Review Standard

- Check app and web together, not in isolation.
- Prefer exact wording over soft, ambiguous policy language.
- Flag mismatches between runtime behavior and public copy immediately.
- If a task creates a new trust-sensitive claim, require evidence or downgrade the claim.

## Deliverables

- findings or code/copy changes tied to specific trust-sensitive surfaces
- a note on app/web consistency after the change
- run relevant validation, usually including:
  - `npm --prefix mobile run typecheck`
  - `npm --prefix web run typecheck`
  - `npm --prefix web run build` when public pages changed
