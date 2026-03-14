# Codex Skills Map

This repo installs a focused set of repo-local skills under `.agents/skills/`. Invoke a skill explicitly when you want Codex to stay inside that workflow and avoid cross-domain drift.

## Quick Rule

- Use one skill when the task is narrow.
- Pair two skills when the task naturally crosses a boundary, such as redesign plus motion, or release QA plus trust/compliance.
- Avoid forcing three or more skills unless the task is genuinely cross-functional.

## Installed Skills

| Skill | Invoke explicitly when | Main repo areas | Example prompt | Pairs well with |
|---|---|---|---|---|
| `$ux-ui-redesign` | Redesigning or refining mobile screens/components without changing canonical product logic | `mobile/src/screens`, `mobile/src/components`, `mobile/src/features`, `mobile/src/theme`, `mobile/docs/redesign` | `Use $ux-ui-redesign to refine the Circles invite inbox without changing navigation or trust flows.` | `$motion-animation-direction`, `$performance-accessibility`, `$figma-uxpilot-handoff` |
| `$motion-animation-direction` | Adjusting room atmospheres, breathing backgrounds, hero transitions, reduced-motion behavior, or motion reviews | `mobile/src/features/rooms`, `mobile/src/screens/SoloLiveScreen.tsx`, `mobile/src/screens/EventRoomScreen.tsx`, `mobile/docs/redesign/figma-handoff/motion` | `Use $motion-animation-direction to tune Event Room motion for reduced-motion and low-end Android.` | `$ux-ui-redesign`, `$performance-accessibility`, `$figma-uxpilot-handoff` |
| `$figma-uxpilot-handoff` | Updating Figma staging data, exporter docs, importer inputs, or UXPilot-ready handoff assets | `mobile/docs/redesign/figma-handoff`, `tools/figma-importer`, `tmp/device-captures` | `Use $figma-uxpilot-handoff to refresh the canonical handoff package after the Profile settings update.` | `$ux-ui-redesign`, `$motion-animation-direction`, `$event-library-content` |
| `$marketing-website-growth` | Improving website positioning, launch copy, support pages, pricing pages, or conversion surfaces | `web/app`, `web/app/site-content.ts`, `web/app/site-config.ts`, `web/public` | `Use $marketing-website-growth to sharpen the homepage and support CTA language without overpromising app readiness.` | `$seo-content-strategy`, `$aso-store-listing`, `$trust-safety-compliance` |
| `$seo-content-strategy` | Planning or implementing SEO metadata, landing-page content, site architecture, or discoverability improvements | `web/app`, `web/app/sitemap.ts`, `web/app/robots.ts`, `web/app/site-content.ts` | `Use $seo-content-strategy to improve metadata and internal linking for the Egregor website.` | `$marketing-website-growth`, `$trust-safety-compliance` |
| `$aso-store-listing` | Preparing App Store / Play copy, screenshot narratives, reviewer notes, or listing QA | `mobile/docs/redesign`, `mobile/docs/release`, `web/app/privacy`, `web/app/support`, `web/app/account-deletion`, `web/app/subscriptions` | `Use $aso-store-listing to draft truthful App Store listing copy and reviewer notes for launch candidate review.` | `$release-readiness-qa`, `$trust-safety-compliance`, `$marketing-website-growth` |
| `$release-readiness-qa` | Running launch checks, validating release evidence, tightening checklists, or reviewing blockers | `mobile/docs/release`, `mobile/docs/redesign`, `mobile/tests`, `supabase/tests` | `Use $release-readiness-qa to audit the current release blockers and produce a go/no-go checklist.` | `$trust-safety-compliance`, `$performance-accessibility`, `$aso-store-listing` |
| `$event-library-content` | Curating canonical event content, lunar/live series, scripts, audio prewarm, or event proofing | `supabase/scripts`, `supabase/tests`, `mobile/docs/redesign/event-library*`, `mobile/docs/redesign/figma-handoff/content` | `Use $event-library-content to review full moon copy and validate the event artifact pipeline.` | `$figma-uxpilot-handoff`, `$release-readiness-qa` |
| `$growth-analytics-experimentation` | Reviewing funnels, instrumentation, analytics gaps, or testable growth ideas grounded in real behavior | `mobile/src/lib/observability`, `mobile/docs/release/observability-and-analytics.md`, `web/app/analytics.ts` | `Use $growth-analytics-experimentation to audit the invite-to-room funnel and propose instrumented experiments.` | `$marketing-website-growth`, `$seo-content-strategy`, `$release-readiness-qa` |
| `$trust-safety-compliance` | Auditing privacy, deletion, support, moderation, report/block, or store-compliance consistency | `mobile/src/features/profile`, `mobile/src/lib/api/safety.ts`, `web/app/privacy`, `web/app/support`, `web/app/account-deletion`, `mobile/docs/release` | `Use $trust-safety-compliance to verify the app and web deletion wording still matches true deletion behavior.` | `$release-readiness-qa`, `$aso-store-listing`, `$marketing-website-growth` |
| `$performance-accessibility` | Improving safe-area handling, readability, low-end device behavior, reduced motion, or accessibility quality | `mobile/src/components`, `mobile/src/features/rooms`, `mobile/src/screens`, `mobile/docs/qa-redesign-checklist.md` | `Use $performance-accessibility to review large-text and reduced-motion behavior on Live and Profile surfaces.` | `$ux-ui-redesign`, `$motion-animation-direction`, `$release-readiness-qa` |
| `$social-auth-identity` | Adding or auditing Google/Apple sign-in, auth callbacks, identity linking, or profile bootstrap flows | `mobile/src/screens/AuthScreen.tsx`, `mobile/src/app/navigation/AuthGate.tsx`, `mobile/src/app/AppRoot.tsx`, `mobile/src/lib/supabase.ts`, `supabase` auth-related work | `Use $social-auth-identity to scope Sign in with Apple without breaking current deep-link capture or profile creation.` | `$trust-safety-compliance`, `$release-readiness-qa` |

## Practical Pairings

- Redesign plus motion: `$ux-ui-redesign` + `$motion-animation-direction`
- Redesign plus handoff: `$ux-ui-redesign` + `$figma-uxpilot-handoff`
- Website growth plus SEO: `$marketing-website-growth` + `$seo-content-strategy`
- Store listing plus readiness audit: `$aso-store-listing` + `$release-readiness-qa`
- Compliance plus release audit: `$trust-safety-compliance` + `$release-readiness-qa`
- Room polish plus device sanity: `$motion-animation-direction` + `$performance-accessibility`
- Event content plus launch validation: `$event-library-content` + `$release-readiness-qa`

## When Not To Force A Skill

- Small single-file fixes already scoped to one domain
- Straightforward refactors with no product or compliance implications
- Small copy tweaks that do not change positioning, SEO, store, or policy meaning
