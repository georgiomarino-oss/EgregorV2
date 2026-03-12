# EgregorV2 Vendor RFP / SOW Brief

Date: 2026-03-12  
Client: EgregorV2  
Document purpose: Share with UX/UI and development agencies to solicit proposals and define execution scope.

## 1) Project Context

EgregorV2 is a premium spiritual collaboration app with canonical product architecture:

1. Home
2. Circles
3. Live
4. Profile

Core systems already exist (Supabase backend, mobile app, web policy/support pages, canonical event library, true in-app account deletion).  

This engagement now includes a substantial **UX/UI redesign and immersive visual upgrade** while preserving canonical architecture and backend foundations. It is not a greenfield rebuild.

## 2) Engagement Goals

1. Complete launch readiness for Apple App Store and Google Play.
2. Finalize event audio/timing artifact readiness and validation.
3. Redesign core screens to achieve a beautiful, engaging, immersive premium experience.
4. Introduce a coherent visual identity (imagery, graphics, typography, motion) aligned to prayer, intention, and global collective manifestation.
5. Upgrade live prayer/live event motion backgrounds and crowd-responsive live-event visuals as participation scales.
6. Strengthen development/ops reliability for commercial scale.
7. Deliver documentation, QA evidence, and runbooks for sustained operations.

## 3) Non-Negotiable Constraints

1. Preserve canonical architecture and navigation: Home / Circles / Live / Profile.
2. Do not reintroduce legacy pseudo-event or synthetic-room flows.
3. Do not expose service-role or provider secrets to client code.
4. Keep account deletion fully in-app initiable and aligned with web deletion resource.
5. Evolve and extend the design system; do not bypass it with one-off UI patterns.
6. Any destructive data cleanup must follow archive-first approach.
7. Redesign must improve beauty and immersion without reducing accessibility/readability.
8. Keep performance stable on representative mid/low-tier devices.

## 4) Technical Baseline

### 4.1 Stack

1. Mobile: React Native + Expo + TypeScript
2. Backend: Supabase Postgres + Edge Functions (Deno/TypeScript)
3. Web: Next.js + TypeScript
4. AI/Audio: OpenAI + ElevenLabs
5. Observability/Push: Sentry + Expo Push

### 4.2 Existing Key Assets

1. Canonical domain docs and journey docs
2. Event-library overhaul docs and scripts
3. Account deletion compliance + true deletion docs
4. Design system and Figma handoff package
5. Release readiness checklists and phase verification reports

### 4.3 Current Vendor and Platform Landscape (Client-Provided)

The client currently pays for and uses the following vendors/services. Proposals must account for these existing investments.

1. **Supabase**  
   Primary backend (Postgres, Auth, Edge Functions, Storage, migrations, RLS policies).
2. **ElevenLabs**  
   Text-to-speech generation for prayer/event audio artifacts and timing/alignment workflows.
3. **Mapbox**  
   Live map/globe visual experience in event/live surfaces.
4. **Expo / Expo Go**  
   Mobile development/runtime workflow and push integration path.
5. **Vercel**  
   Web app hosting/deployment for support/privacy/deletion/policy surfaces.
6. **GitHub**  
   Source control and collaboration workflow.
7. **Figma**  
   UI design system, component design, and handoff source.
8. **Lottie**  
   Animated motion assets currently used in app surfaces.
9. **Rive**  
   Interactive animation platform available for richer runtime motion/interactive states.
10. **UXPilot**  
   UX workflow/acceleration tooling currently available to the client.
11. **Sanity**  
   CMS/content management platform available for web or structured content operations.
12. **Resend**  
   Transactional email platform available for support/compliance/notification email flows.
13. **GoDaddy**  
   Domain and DNS ownership/management.

Developer program status:

1. **Google Play Developer account:** approved and available.
2. **Apple Developer account:** in final approval stage.

Expectation for vendor team:

1. Reuse and optimize existing vendor stack wherever practical.
2. Identify consolidation opportunities to reduce tool sprawl and operational overhead.
3. Recommend additional vendors only when there is clear production-readiness benefit.

## 5) Scope of Work (SOW)

### Workstream A: Full UX/UI Redesign and Art Direction

1. Redesign all primary app surfaces across Home, Circles, Live, and Profile.
2. Produce a deep visual research phase on color, symbolism, and tone appropriate for Egregor's mission:
   - redirecting attention toward positive intention, prayer, and collective action
   - balancing spiritual depth with trust, calm, and clarity
   - cross-cultural and accessibility-aware color/theme validation
3. Deliver a complete visual language system:
   - color system and semantic themes
   - typography hierarchy
   - iconography and illustration style
   - image/graphic style rules
4. Create high-quality graphics and visual assets for key screens:
   - hero visuals
   - card imagery
   - room and event backgrounds
   - section-specific graphic motifs
5. Redesign edge-state UX (loading/empty/error/permission/failure) to match premium tone.
6. Produce production-ready Figma with components, variants, redlines, and implementation specs.

Deliverables:

1. Color and Theme Research Report with rationale, references, and accessibility checks
2. Visual Direction Board (2-3 routes) and final selected direction
3. Full Figma file set with production-ready component/variant library
4. Screen-by-screen redlines and behavior notes
5. Asset pack (images/graphics/illustrations) with usage mapping

### Workstream B: Mobile Engineering and Runtime Readiness

1. Verify/optimize canonical event runtime integration.
2. Implement redesigned screens and design-system extensions in React Native.
3. Build immersive motion backgrounds for:
   - live prayers
   - live events
4. Upgrade live-event responsiveness for rising participant counts:
   - visual response tiers (for example, low/medium/high presence)
   - smoother participant presence rendering
   - crowd-energy visual feedback that remains calm and legible
   - performance-safe animation scaling
5. Harden artifact prefetch and fallback states.
6. Improve modularity where needed (without destabilizing release branch).
7. Finalize account deletion UX copy/state fidelity with backend behavior.
8. Execute release candidate QA across representative Android/iOS devices.

Deliverables:

1. PRs with tests and changelog
2. Motion implementation spec (timings, triggers, reduced-motion behavior)
3. Runtime validation evidence videos/screenshots
4. Defect log with disposition and closure status

### Workstream C: Backend, Content Pipeline, and Data Ops

1. Re-run canonical prewarm/backfill flows.
2. Complete event audio/timing backfill once ElevenLabs credits are available.
3. Validate script/audio idempotence and artifact integrity for launch horizon.
4. Confirm migration health and absence of legacy event leakage.
5. Harden operational scripts and runbooks.

Deliverables:

1. Backfill/validation reports with counts and failures
2. Updated runbooks for prewarm, validation, and backfill
3. SQL/function deployment log and rollback notes

### Workstream D: Store Readiness and Release Operations

1. Android signed release proof with production signing credentials.
2. iOS signing, entitlement, APNs, and TestFlight validation.
3. Push scheduler deployment and end-to-end delivery validation.
4. Privacy/deletion/support metadata consistency across app, web, and store forms.
5. Final release readiness sign-off package.

Deliverables:

1. Store submission checklist evidence pack
2. Signed build artifacts + verification outputs
3. Production-readiness go/no-go recommendation

## 6) Exclusions (Out of Scope Unless Added by Change Order)

1. Canonical information architecture rewrite (navigation model stays Home/Circles/Live/Profile unless explicitly approved).
2. Net-new major feature pillars not already in canonical plan.
3. Replatforming away from Expo/Supabase.
4. Building a custom notification provider platform in this phase.
5. Rewriting analytics stack end-to-end.

## 7) Milestones and Indicative Timeline

### Milestone 1: Discovery, UX Audit, and Research Baseline (Week 1)

1. Repo/docs audit
2. Environment/access verification
3. Gap confirmation against launch criteria
4. Color/theme/mood research kickoff
5. Finalized execution plan

Exit criteria:

1. Signed scope matrix
2. Risk register and dependency map
3. Research plan and visual exploration plan approved

### Milestone 2: Visual Direction and Redesign System (Weeks 2-3)

1. Visual direction options and selection
2. High-fidelity redesign of key flows and screens
3. Graphics and motion language package
4. Figma production handoff completion

Exit criteria:

1. Approved UX/UI package
2. Approved motion and graphics package
3. Implementation-ready specs signed off

### Milestone 3: Engineering Implementation + Artifact/Ops Hardening (Weeks 4-6)

1. Redesign implementation in app
2. Live prayer/event motion background implementation
3. Crowd-responsive live-event visual upgrade
4. Event script/audio/timing backfill and validation
5. Pipeline and runbook hardening
6. Push and observability operational checks

Exit criteria:

1. Redesigned app flows merged and tested
2. Artifact readiness report
3. Ops runbook sign-off

### Milestone 4: Store Submission Readiness and Launch Packet (Week 7)

1. Android/iOS release evidence completion
2. Store policy metadata reconciliation
3. Final QA and go/no-go

Exit criteria:

1. Submission-ready pack
2. Final risk/issue register with owner assignments

## 8) Engagement Models (No Pricing Included)

### Option A: Launch-Readiness Sprint (4-5 weeks)

1. Team: 1 senior mobile engineer, 1 backend engineer (part-time), 1 UX/UI designer, 1 motion designer (part-time), 1 QA/release lead (part-time)
2. Best for: launch closure with moderate redesign and motion uplift

### Option B: Launch + Scale Hardening (8-10 weeks)

1. Team: 2 mobile engineers, 1 backend engineer, 1 UX lead, 1 product designer, 1 motion designer, 1 QA automation/release engineer, fractional PM
2. Best for: full redesign implementation + launch + post-launch hardening

### Option C: Full Partner Pod (12+ weeks)

1. Team: 2-3 mobile engineers, 1-2 backend engineers, UX director, 1-2 product designers, 1 motion/interaction specialist, 1 visual artist/illustration specialist, QA lead, PM
2. Best for: "visual masterpiece" execution, launch, stabilization, and roadmap acceleration

Commercial assumptions:

1. Existing architecture remains intact.
2. No major scope creep.
3. Client provides timely access to credentials, stores, and environments.

## 9) Required Vendor Team Composition

1. React Native/Expo senior engineer
2. Supabase/Postgres/Edge Functions engineer
3. Product UX/UI lead with systems capability
4. Motion/interaction designer (mobile animation systems)
5. Visual/brand designer or illustrator for image/graphic direction
6. QA/release engineer (store submission experience required)
7. Project lead/PM for cadence and risk tracking

Preferred experience:

1. App Store + Google Play submission support
2. Subscription + policy compliance workflows
3. AI/TTS content pipeline integrations
4. High-end immersive mobile experience design with performance constraints
5. Real-time/crowd-responsive UI systems in live experiences

## 10) Proposal Response Format (What We Need from Vendors)

Vendors should submit:

1. Understanding of current app and constraints
2. Detailed delivery plan by workstream and milestone
3. Staffing plan (named roles, allocation, location/time zone)
4. Timeline with assumptions and dependencies
5. Commercial model and contracting structure by phase/milestone (no fixed range required in proposal stage)
6. Risk plan and mitigation strategy
7. QA and release process
8. Relevant case studies and references
9. Post-launch support model and SLA options
10. Visual direction samples (minimum 2 routes) and explanation of why they fit Egregor's mission
11. Approach for color/theme research and validation
12. Plan for motion backgrounds and crowd-responsive live-event behavior
13. Vendor architecture recommendation:
   - how existing vendors will be used in the final production setup
   - any vendor consolidation suggestions
   - any additional vendors required for full-scale production readiness
   - rationale, commercial impact, implementation effort, and risk/lock-in analysis

## 11) Acceptance Criteria

### Technical

1. No regression of canonical architecture and flows.
2. Typecheck and release-baseline tests pass.
3. Migration/function deployments are reproducible and audited.
4. Event artifacts validated for launch horizon.
5. Live-event visual responsiveness scales without unacceptable frame drops or instability.

### UX/UI

1. Critical flows are complete with defined edge states.
2. Design system compliance maintained.
3. Accessibility baseline passes agreed checklist.
4. Final visual language meets approved "immersive premium" direction.
5. Graphics and motion assets are production-ready and correctly integrated.
6. Live prayers/live events include approved motion backgrounds with reduced-motion support.

### Release/Ops

1. Android and iOS store-readiness evidence completed.
2. Push workflow verified in production-like setup.
3. Compliance pages and in-app behavior are consistent.

## 12) Handoff Checklist to Start Work

Client to provide:

1. Repo access and branch policy
2. Supabase staging + production access
3. Store console access (Apple/Google)
4. Provider admin access (OpenAI, ElevenLabs, Sentry, Expo, Mapbox)
5. Existing release docs and latest verification reports
6. Design files/handoff package access

Vendor to provide before coding:

1. Delivery plan and milestone schedule
2. Risk log with top blockers
3. Environment matrix and deployment plan
4. QA strategy and evidence format
5. Visual research and art-direction plan
6. Vendor usage map covering current vendors and proposed additions/replacements (if any)

## 13) Known Immediate Priorities at Kickoff

1. Resolve ElevenLabs credit availability and complete event audio backfill validation.
2. Close iOS release readiness with device-level evidence.
3. Produce Android signed release artifact evidence.
4. Validate push dispatch scheduler in production-like conditions.
5. Finalize store submission materials and compliance reconciliation.
6. Start visual research and color/theme exploration aligned to prayer, intention, and collective manifestation outcomes.
7. Define live background motion and crowd-response behavior specification for implementation.

## 14) Commercial and Legal Notes

1. All client data, code, prompts, and design assets remain client IP.
2. Vendor must follow security best practices for secrets and least-privilege access.
3. Any retained user data logic must remain consistent with privacy/deletion policy.
4. Changes to deletion/privacy/billing flows require explicit client approval before release.

