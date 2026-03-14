# Multi-Agent Setup

## Current Status In This Codex Environment

Partially enabled:

- Yes: the environment supports normal Codex execution and internal tool parallelism.
- No: this installation does not expose an official repo-level custom agent definition format for named agents that can be safely configured here.

Result:

- This repo does not add a made-up multi-agent config file.
- Instead, it ships a documented operating model in:
  - `docs/codex/agents-runbook.md`
  - `docs/codex/agent-prompts.md`

## How To Enable Practical Multi-Agent Work Today

Use multiple Codex sessions manually:

1. Open one lead Codex session for orchestration and final merge decisions.
2. Open one to three additional Codex sessions only for cleanly separable work.
3. Give each specialist:
   - the matching prompt from `docs/codex/agent-prompts.md`
   - the exact task slice
   - the relevant files/docs
   - the acceptance criteria
   - the required repo-local skills to use
4. Keep each specialist inside one role and one deliverable.
5. Merge results back through the lead session, then run validation once in the lead session.

## Why There Is No Direct Repo Agent Config

The current Codex installation exposes repo-local skill patterns, but not a documented repo-local named-agent config format for this workspace. Until the harness exposes that official format, the safest durable setup is:

- repo-local skills for workflow specialization
- documented agent prompts for role specialization
- manual session orchestration

If a future Codex release exposes official custom agent definitions, convert the roles in `docs/codex/agents-runbook.md` into that format instead of inventing one now.

## Safe Usage Rules For This Repo

- Keep one session responsible for final edits and validation.
- Do not let multiple sessions edit the same file family at the same time unless you are intentionally splitting the work.
- Avoid parallel sessions for monolithic files like `mobile/src/lib/api/data.ts` unless each agent has a non-overlapping read-only review task.
- Route all public claims through a trust/compliance review when the work touches deletion, privacy, support, store copy, or launch messaging.
- Use repo-local skills explicitly so each session stays within the right boundaries.

## When Not To Use Multi-Agent

- Small single-file fixes
- Straightforward refactors
- One-step copy edits
- Tasks where design direction is still unclear
- Changes that will obviously collide in the same files
- Any task where parallelism would create more context overhead than actual speed

## Example Setups For Egregor

## 1. UX Audit + Implementation + QA

- Session 1: Product Designer
  - Audit the target screen and define state/interaction guardrails.
- Session 2: Frontend Implementer
  - Implement the approved direction.
- Session 3: Release / QA Engineer
  - Validate commands, manual QA, and regressions.

Recommended skills:

- `$ux-ui-redesign`
- `$performance-accessibility`
- `$release-readiness-qa`

## 2. SEO + ASO + Website Copy

- Session 1: Growth / Marketing / SEO Strategist
  - Refine homepage, support, and metadata.
- Session 2: Trust / Compliance Reviewer
  - Review public claims, deletion wording, and policy consistency.
- Session 3: ASO-focused strategist or lead session
  - Adapt truthful positioning into store listings and screenshot stories.

Recommended skills:

- `$marketing-website-growth`
- `$seo-content-strategy`
- `$aso-store-listing`
- `$trust-safety-compliance`

## 3. Event Content Audit + Audio Pipeline Review + QA

- Session 1: Content Systems Editor
  - Audit scripts, naming, and repetition.
- Session 2: Backend / Supabase Engineer
  - Review prewarm/backfill pipeline and artifact persistence.
- Session 3: Release / QA Engineer
  - Validate commands, blockers, and evidence capture.

Recommended skills:

- `$event-library-content`
- `$release-readiness-qa`

## Context-Bloat And Parallelism Cautions

- Do not give every session the entire repo when only a few files matter.
- Keep prompts specific about the accepted product truth and current blockers.
- Prefer two focused sessions over four weakly scoped ones.
- End each specialist prompt with a required output shape so the lead session can merge results quickly.
- If the task depends on one architectural decision, make that decision first in the lead session before spawning specialists.
