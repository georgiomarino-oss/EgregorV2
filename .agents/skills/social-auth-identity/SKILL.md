---
name: social-auth-identity
description: "Use when adding or auditing Google sign-in, Apple sign-in, Supabase auth callback handling, identity linking, profile bootstrap, or deep-link auth handoff for Egregor. Do not use for general profile UI work, store copy not tied to auth reality, or unrelated backend tasks."
---

# Mission

Extend identity flows without breaking the current auth gate, deep-link capture, profile creation, or deletion/compliance expectations.

## Read First

- `AGENTS.md`
- `mobile/src/screens/AuthScreen.tsx`
- `mobile/src/app/navigation/AuthGate.tsx`
- `mobile/src/app/AppRoot.tsx`
- `mobile/src/app/navigation/RootNavigator.tsx`
- `mobile/src/app/navigation/types.ts`
- `mobile/src/lib/supabase.ts`
- `mobile/docs/redesign/true-account-deletion-plan.md`
- `mobile/docs/redesign/store-submission-readiness.md`

## Current Repo Truth

- The current mobile auth screen is email/password based.
- Auth state is managed through Supabase session persistence and `AuthGate`.
- Deep links are captured before auth completion and handed off after session creation.
- Social auth should be treated as additive work, not assumed current behavior.

## Required Guardrails

- Preserve `egregorv2://` deep-link handling and pending invite capture.
- Avoid duplicate user/profile creation during provider sign-in and linking.
- Preserve current post-auth routing into canonical invite, room, or occurrence targets.
- Keep account deletion and policy pages truthful if auth providers are added.
- Do not claim Sign in with Apple or Google publicly until callback, device, and reviewer flows are verified.

## Provider-Specific Caution

- Sign in with Apple may carry additional revocation and reviewer expectations beyond baseline Supabase deletion.
- If Google or Apple sign-in is added, update support, privacy, and deletion wording only after the runtime path is real.

## Deliverables

- auth-flow design notes, implementation, or audit findings
- explicit callback/deep-link plan
- duplicate-identity and profile-bootstrap handling notes
- required runtime and store-review validation steps
