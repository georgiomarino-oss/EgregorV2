---
name: seo-content-strategy
description: "Use when planning or implementing Egregor SEO work such as metadata, crawlable page structure, discoverability improvements, structured content plans, landing-page strategy, or search-friendly editorial work for the web app. Do not use for App Store listings, mobile UI tasks, or generic marketing rewrites that are not search-focused."
---

# Mission

Improve search visibility without sacrificing brand credibility, product truth, or clean site architecture.

## Read First

- `AGENTS.md`
- `web/app/page.tsx`
- `web/app/layout.tsx`
- `web/app/site-content.ts`
- `web/app/site-config.ts`
- `web/app/sitemap.ts`
- `web/app/robots.ts`
- `web/WEBSITE_UPGRADES_SETUP.md`

## SEO Rules

- Keep pages useful for humans first.
- Avoid keyword stuffing and low-trust spiritual jargon.
- Match search intent with clear, concrete page purpose.
- Use metadata, headings, internal links, and structured content rather than stuffing repeated phrases into body copy.
- Keep privacy, support, subscription, and account-deletion surfaces indexable and consistent where appropriate.

## Content Strategy Rules

- Tie landing pages to real app surfaces or real user intents.
- Keep tone spiritually resonant but grounded and credible.
- Prefer a smaller set of strong, differentiated pages over thin keyword pages.
- Do not create content silos that misrepresent the product or imply unsupported outcomes.

## Repo Areas To Use

- page files under `web/app`
- metadata in page files and `web/app/layout.tsx`
- site-wide config in `web/app/site-config.ts`
- crawl config in `web/app/sitemap.ts` and `web/app/robots.ts`

## Deliverables

- metadata updates, page-structure changes, landing-page plans, or editorial recommendations
- explicit note on which search intent each page is meant to satisfy
- run at least:
  - `npm --prefix web run typecheck`
  - `npm --prefix web run build` when implementing SEO changes
