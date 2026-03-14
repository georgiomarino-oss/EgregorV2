---
name: marketing-website-growth
description: "Use when improving the Egregor marketing website, support pages, subscription pages, launch messaging, product positioning, or other conversion-facing web surfaces while keeping claims aligned with the actual app and compliance pages. Do not use for mobile UI redesign, backend schema work, or SEO-only technical changes that do not affect positioning or copy."
---

# Mission

Improve the public web experience so it feels premium and conversion-aware without drifting into hype, false claims, or mismatch with the actual app.

## Read First

- `AGENTS.md`
- `web/app/page.tsx`
- `web/app/site-content.ts`
- `web/app/site-config.ts`
- `web/app/support/page.tsx`
- `web/app/subscriptions/page.tsx`
- `web/app/privacy/page.tsx`
- `web/app/account-deletion/page.tsx`
- `mobile/docs/redesign/store-submission-readiness.md`
- `mobile/docs/redesign/launch-candidate-punch-list.md`

## Tone Rules

- Keep the brand premium, calm, spiritually resonant, and credible.
- Use precise language for functional or compliance-sensitive flows.
- Avoid hype, fear tactics, pseudo-medical promises, or spiritual grandiosity that the product cannot support.
- Mirror the real app structure and real trust posture.

## Growth Rules

- Improve clarity before adding more copy.
- Strengthen conversion through better hierarchy, specificity, and trust, not inflated promises.
- Keep support, deletion, privacy, and subscription information consistent across public pages.
- Treat website trust surfaces as part of conversion, not boilerplate.

## Claim Discipline

- Verify app claims against repo reality before publishing them.
- Do not imply iOS readiness, push maturity, social auth support, or event-audio completeness if those remain operational gaps.
- Do not promise feature breadth that exceeds the canonical Home/Circles/Live/Profile product.

## Useful Repo Areas

- `web/app`
- `web/app/site-content.ts`
- `web/app/site-config.ts`
- `web/public/brand`
- `web/WEBSITE_UPGRADES_SETUP.md`
- `web/MONETIZATION_WEBSITE_SETUP.md`

## Deliverables

- update copy, layout, or public trust surfaces inside `web/app`
- call out any product-truth or compliance mismatch before editing around it
- run at least:
  - `npm --prefix web run typecheck`
  - `npm --prefix web run build` for meaningful site changes
