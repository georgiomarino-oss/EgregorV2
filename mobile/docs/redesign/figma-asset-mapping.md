# Figma Asset Mapping

Canonical source files:
- `mobile/src/lib/art/cinematicArt.ts`
- `mobile/src/lib/art/cinematicArtSlots.ts`
- `mobile/assets/generated/asset-manifest.json`
- `mobile/assets/lottie/*`
- `mobile/app.json`

Rule of use:
- Keep structural assets structural (icons, splash, fallback animation containers).
- Treat cinematic hero/card/room images as replaceable art while preserving slot semantics and layer roles.

Total mapped assets: 24

| Path | Used by | Primary/Fallback | Replaceable art vs structural UI | Supports content types | Slot | Manifest prompt/notes |
| --- | --- | --- | --- | --- | --- | --- |
| mobile/assets/generated/circles/circle-governance-hero.png | CommunityHome circle cards, Circle summary rows | primary | replaceable_art | governance/belonging | circles.card.default | Circle governance premium artwork, constellation patterns and gentle aurora ribbons, teal and glacier palette, cinematic spiritual clarity, no text |
| mobile/assets/generated/circles/circle-governance-hero.png | CircleDetails hero, CircleInviteComposer hero | primary | replaceable_art | governance/belonging | circles.hero.governance | Circle governance premium artwork, constellation patterns and gentle aurora ribbons, teal and glacier palette, cinematic spiritual clarity, no text |
| mobile/assets/generated/circles/circles-home-hero.png | CommunityHome hero | primary | replaceable_art | governance/belonging | circles.hero.home | Community constellation hero, deep teal and cyan gradients, luminous trust network nodes, welcoming premium spiritual mood, no text |
| mobile/assets/generated/circles/invite-decision-hero.png | InviteDecision hero | primary | replaceable_art | governance/belonging | circles.hero.inviteDecision | Invite decision hero art, sacred threshold motif, luminous teal gateway, trustworthy premium cinematic style, no text |
| mobile/assets/generated/cards/live-occurrence-card-neutral.png | OccurrenceCard default, EventDetails action card | primary | replaceable_art | collective live moment | live.card.default | Neutral premium live occurrence card art, deep blue cinematic gradient and subtle global pulse motifs, no text |
| mobile/assets/generated/live/live-flagship-1111-card.png | OccurrenceCard 11:11/flagship emphasis | primary | replaceable_art | 11:11, flagship | live.card.flagship1111 | Flagship 11:11 ritual artwork, celestial alignment lights, blue aurora with amber accents, refined spiritual cinematic style, no text |
| mobile/assets/generated/live/live-room-detail-hero.png | EventDetails hero | primary | replaceable_art | collective live moment, 11:11, flagship | live.hero.details | Live room detail hero, immersive celestial depth, volumetric blue beams, subtle warm edge light, premium and clean, no text |
| mobile/assets/generated/live/live-feed-global-pulse-hero.png | EventsHome hero | primary | replaceable_art | collective live moment, 11:11, flagship | live.hero.feed | Global consciousness hero art, planetary horizon glow, deep navy and sky blue gradients, synchronized energy arcs, premium cinematic atmosphere, no text |
| mobile/assets/generated/profile/profile-journal-companion-art.png | JournalPanel companion art | primary | replaceable_art | trust/progress | profile.card.journal | Journal companion artwork, contemplative moonlit paper texture with soft sacred light, elegant and premium, no text |
| mobile/assets/generated/profile/profile-progress-ledger-hero.png | Profile settings summary, Account sanctuary | primary | replaceable_art | trust/progress, support/account/etc. | profile.hero.ledger | Progress ledger premium artwork, elegant sacred geometry over reflective slate gradients, calm and trustworthy, no text |
| mobile/assets/generated/profile/profile-safety-privacy-settings-hero.png | Settings sanctuary hero, Account deletion panel | primary | replaceable_art | support/account/etc. | profile.hero.settings | Safety and privacy settings hero, sanctuary steel-blue gradients with soft protective halo, premium cinematic style, no text |
| mobile/assets/generated/profile/profile-trust-progress-hero.png | TrustHero | primary | replaceable_art | trust/progress | profile.hero.trust | Trust and progress hero, moonstone and steel-blue palette, calm archival glow, premium reflective spiritual atmosphere, no text |
| mobile/assets/generated/rooms/live-room-atmosphere-overlay.png | EventRoom atmosphere backdrop | primary | replaceable_art | collective live moment, 11:11, flagship | room.live.overlay | Live event room atmosphere overlay, global blue pulse, volumetric light and subtle sacred geometry, premium cinematic quality, no text |
| mobile/assets/generated/rooms/solo-room-atmosphere-overlay.png | SoloLive atmosphere backdrop | primary | replaceable_art | personal ritual | room.solo.overlay | Solo room atmosphere overlay, sacred violet aura field, soft mist and luminous particles, premium cinematic and calm, no text |
| mobile/assets/generated/shared/backgrounds/shared-sacred-geometry-overlay.png | Shared subtle overlays | primary | replaceable_art | cross-section atmosphere | shared.overlay.geometry | Subtle sacred geometry overlay for premium mobile interfaces, translucent luminous lines on deep cinematic gradient, no text |
| mobile/assets/generated/cards/solo-prayer-card-neutral.png | PrayerCard default | primary | replaceable_art | personal ritual | solo.card.default | Neutral premium solo prayer card art, violet sanctuary tones, soft light bloom, no text |
| mobile/assets/generated/solo/solo-category-manifestation-card.png | PrayerCard manifestation categories | primary | replaceable_art | personal ritual | solo.card.manifestation | Manifestation-themed premium spiritual art, deep violet dusk with rose-gold highlights, subtle sacred geometry, cinematic depth, no text |
| mobile/assets/generated/solo/solo-home-hero.png | SoloHome hero | primary | replaceable_art | personal ritual | solo.hero.home | Cinematic celestial sanctuary, luminous indigo and plum atmosphere, soft sacred geometry and warm gold aura, premium spiritual editorial mood, no text, no logos, no people |
| mobile/assets/generated/solo/solo-home-hero.png | SoloSetup hero | primary | replaceable_art | personal ritual | solo.hero.setup | Cinematic celestial sanctuary, luminous indigo and plum atmosphere, soft sacred geometry and warm gold aura, premium spiritual editorial mood, no text, no logos, no people |
| mobile/assets/lottie/cosmic-ambient.json | Auth, MissingEnv, Solo, Circles, Live, Profile screens | primary | structural_ui | cross-section ambient | ambient.lottie.cosmic | Ambient animation source |
| mobile/assets/lottie/globe-fallback.json | EmbeddedGlobeCard fallback mode | fallback | structural_ui | collective live moment, 11:11, flagship | live.globe.fallback | Fallback globe animation |
| mobile/assets/brand/app-icon-still-1024.png | app.json icon, android adaptive icon | primary | structural_ui | brand | brand.appIcon | Product icon |
| mobile/assets/brand/app-icon-still-48.png | app.json web favicon | primary | structural_ui | brand | brand.favicon | Web favicon |
| mobile/assets/splash-icon.png | app.json splash | primary | structural_ui | brand | brand.splash | Splash artwork |

Motion-critical asset notes:
- `room.solo.overlay` and `room.live.overlay` must remain in separate atmosphere layers, not flattened into content layers.
- `live.globe.fallback` remains a fallback path for Global Pulse rendering when Mapbox is unavailable.
- `shared.overlay.geometry` should remain subtle and optional for reduced-motion/static variants.

