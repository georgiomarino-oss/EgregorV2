# Egregor Agent Runbook

Custom repo-level agent definitions are not exposed in this Codex installation, so this repo uses a documented agent operating model instead of an unsupported config file.

Use these named roles by opening separate Codex sessions or subtasks with the matching prompt from `docs/codex/agent-prompts.md`.

## Operating Rules

- Keep one lead session responsible for final synthesis, validation, and merge decisions.
- Spawn specialist sessions only when their output can be parallelized cleanly.
- Give each specialist a narrow scope, concrete files, and an explicit deliverable.
- Route conclusions back through the lead session before code or copy lands.

## Recommended Agents

## 1. Product Designer

- Scope: mobile IA-safe UX refinement, screen hierarchy, states, and Figma handoff coordination
- Best model profile: strongest reasoning or multimodal model available
- Primary skills: `$ux-ui-redesign`, `$figma-uxpilot-handoff`
- Inputs: target screen, canonical guardrails, current screenshots, relevant docs
- Outputs: UX recommendations, component/state notes, handoff requirements, edge-state checklist
- Spawn when: the task changes layout, hierarchy, state handling, or design-system usage without reworking product logic

## 2. Motion Designer

- Scope: atmosphere direction, room/background motion, transitions, reduced-motion behavior
- Best model profile: strongest reasoning model with UI context
- Primary skills: `$motion-animation-direction`, `$performance-accessibility`
- Inputs: target surface, current motion code, screenshots/video references, performance constraints
- Outputs: motion plan, reduced-motion rules, animation QA checklist, implementation notes
- Spawn when: the task changes SoloLive, EventRoom, globe motion, hero reveals, or motion-heavy polish

## 3. Frontend Implementer

- Scope: React Native or Next.js implementation inside current architecture
- Best model profile: strongest coding model with repo access
- Primary skills: `$ux-ui-redesign`, `$marketing-website-growth`, `$performance-accessibility`
- Inputs: approved design direction, target files, acceptance criteria, required validation commands
- Outputs: code changes, tests/run results, unresolved risks
- Spawn when: the task is mostly UI implementation and can proceed after design or copy direction is set

## 4. Backend / Supabase Engineer

- Scope: migrations, RLS, Edge Functions, notification pipeline, canonical data services
- Best model profile: strongest coding model comfortable with SQL and TypeScript
- Primary skills: `$release-readiness-qa`, `$event-library-content`, `$social-auth-identity`, `$trust-safety-compliance`
- Inputs: schema target, current migrations/tests, API expectations, policy constraints
- Outputs: migration/function changes, SQL test plan, operational risks
- Spawn when: the task touches canonical event data, notifications, deletion, auth, moderation, or profile identity

## 5. Release / QA Engineer

- Scope: release audit, regression validation, checklist enforcement, evidence capture planning
- Best model profile: strongest reasoning model with repo access
- Primary skills: `$release-readiness-qa`, `$performance-accessibility`, `$trust-safety-compliance`
- Inputs: change set, target platform, release docs, current blockers
- Outputs: pass/fail matrix, missing evidence, manual QA slice, go/no-go recommendations
- Spawn when: the task is launch-facing, store-facing, or likely to reopen a previously closed risk

## 6. Growth / Marketing / SEO Strategist

- Scope: website copy, page architecture, launch messaging, SEO, positioning, funnel clarity
- Best model profile: strong writing and reasoning model
- Primary skills: `$marketing-website-growth`, `$seo-content-strategy`, `$aso-store-listing`, `$growth-analytics-experimentation`
- Inputs: page goals, target audience, product truth, current web content, launch constraints
- Outputs: copy recommendations, metadata plans, conversion ideas, claim-risk review
- Spawn when: the task is about external messaging, search visibility, landing pages, or store positioning

## 7. Trust / Compliance Reviewer

- Scope: privacy, deletion, moderation, report/block, truthful claims, store-policy alignment
- Best model profile: strongest reasoning model; use the cautious option
- Primary skills: `$trust-safety-compliance`, `$release-readiness-qa`, `$aso-store-listing`
- Inputs: changed copy/flows, public policy pages, release docs, runtime behavior summary
- Outputs: compliance findings, wording corrections, reviewer-risk notes, required follow-ups
- Spawn when: the task touches user data, deletion, support, moderation, claims, or store forms

## 8. Content Systems Editor

- Scope: event/prayer libraries, lunar naming, TTS-safe scripts, screenshot/story content systems
- Best model profile: strong writing model with careful editorial discipline
- Primary skills: `$event-library-content`, `$figma-uxpilot-handoff`, `$aso-store-listing`
- Inputs: canonical catalogs, proofread CSVs, content constraints, handoff requirements
- Outputs: edited content, naming validation, repetition audit, content QA notes
- Spawn when: the task touches recurring event copy, prayer copy, screenshot narrative content, or Figma content libraries

## Handoff Pattern

Use this order unless the task is obviously narrower:

1. Designer or strategist defines constraints and desired outcome.
2. Implementer or backend engineer executes inside those constraints.
3. Release / QA engineer verifies behavior and evidence.
4. Trust / compliance reviewer does a final policy/truth pass if claims, deletion, privacy, or moderation are involved.

## Keep Single-Agent When

- One person can finish the task in one pass without real parallelism
- The work is a small fix in one file or one service
- The same file would be edited by multiple agents and merge risk is higher than any speed gain
- The task is exploratory and needs architecture decisions before specialization
