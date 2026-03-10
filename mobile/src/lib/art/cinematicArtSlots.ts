export type CinematicArtSlot =
  | 'solo.hero.home'
  | 'solo.hero.setup'
  | 'solo.card.default'
  | 'solo.card.manifestation'
  | 'live.hero.feed'
  | 'live.hero.details'
  | 'live.card.default'
  | 'live.card.flagship1111'
  | 'circles.hero.home'
  | 'circles.hero.governance'
  | 'circles.hero.inviteDecision'
  | 'circles.card.default'
  | 'profile.hero.trust'
  | 'profile.hero.ledger'
  | 'profile.hero.settings'
  | 'profile.card.journal'
  | 'room.solo.overlay'
  | 'room.live.overlay'
  | 'shared.overlay.geometry';

const manifestationKeywords = [
  'abundance',
  'career',
  'calling',
  'clarity',
  'finance',
  'manifest',
  'purpose',
  'vision',
];

export function resolveSoloCategoryArtSlot(
  categoryLabel: string | null | undefined,
): CinematicArtSlot {
  const normalized = (categoryLabel ?? '').trim().toLowerCase();
  const manifestation = manifestationKeywords.some((keyword) => normalized.includes(keyword));
  if (manifestation) {
    return 'solo.card.manifestation';
  }
  return 'solo.card.default';
}

export function resolveOccurrenceCardArtSlot(sectionKey?: string | null): CinematicArtSlot {
  if (sectionKey === 'ritual_1111' || sectionKey === 'global_flagships') {
    return 'live.card.flagship1111';
  }
  return 'live.card.default';
}
