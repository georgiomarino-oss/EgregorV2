import type { ImageSourcePropType } from 'react-native';

import cinematicAssetManifest from '../../../assets/generated/asset-manifest.json';
import {
  resolveOccurrenceCardArtSlot,
  resolveSoloCategoryArtSlot,
  type CinematicArtSlot,
} from './cinematicArtSlots';

const slotToAsset: Record<CinematicArtSlot, ImageSourcePropType> = {
  'circles.card.default': require('../../../assets/generated/circles/circle-governance-hero.png'),
  'circles.hero.governance': require('../../../assets/generated/circles/circle-governance-hero.png'),
  'circles.hero.home': require('../../../assets/generated/circles/circles-home-hero.png'),
  'circles.hero.inviteDecision': require('../../../assets/generated/circles/invite-decision-hero.png'),
  'live.card.default': require('../../../assets/generated/cards/live-occurrence-card-neutral.png'),
  'live.card.flagship1111': require('../../../assets/generated/live/live-flagship-1111-card.png'),
  'live.hero.details': require('../../../assets/generated/live/live-room-detail-hero.png'),
  'live.hero.feed': require('../../../assets/generated/live/live-feed-global-pulse-hero.png'),
  'profile.card.journal': require('../../../assets/generated/profile/profile-journal-companion-art.png'),
  'profile.hero.ledger': require('../../../assets/generated/profile/profile-progress-ledger-hero.png'),
  'profile.hero.settings': require('../../../assets/generated/profile/profile-safety-privacy-settings-hero.png'),
  'profile.hero.trust': require('../../../assets/generated/profile/profile-trust-progress-hero.png'),
  'room.live.overlay': require('../../../assets/generated/rooms/live-room-atmosphere-overlay.png'),
  'room.solo.overlay': require('../../../assets/generated/rooms/solo-room-atmosphere-overlay.png'),
  'shared.overlay.geometry': require('../../../assets/generated/shared/backgrounds/shared-sacred-geometry-overlay.png'),
  'solo.card.default': require('../../../assets/generated/cards/solo-prayer-card-neutral.png'),
  'solo.card.manifestation': require('../../../assets/generated/solo/solo-category-manifestation-card.png'),
  'solo.hero.home': require('../../../assets/generated/solo/solo-home-hero.png'),
  'solo.hero.setup': require('../../../assets/generated/solo/solo-home-hero.png'),
};

export function resolveCinematicArt(slot: CinematicArtSlot): ImageSourcePropType | undefined {
  return slotToAsset[slot];
}

export function resolveSoloCategoryArt(categoryLabel: string | null | undefined) {
  return resolveCinematicArt(resolveSoloCategoryArtSlot(categoryLabel));
}

export function resolveOccurrenceCardArt(sectionKey?: string | null) {
  return resolveCinematicArt(resolveOccurrenceCardArtSlot(sectionKey));
}

export function getCinematicAssetManifest() {
  return cinematicAssetManifest;
}
