import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveOccurrenceCardArtSlot,
  resolveSoloCategoryArtSlot,
} from '../src/lib/art/cinematicArtSlots';

test('resolveSoloCategoryArtSlot prefers manifestation art for manifestation-like categories', () => {
  assert.equal(resolveSoloCategoryArtSlot('Manifestation and Purpose'), 'solo.card.manifestation');
  assert.equal(resolveSoloCategoryArtSlot('Career and Calling'), 'solo.card.manifestation');
});

test('resolveSoloCategoryArtSlot returns default art for non-manifestation categories', () => {
  assert.equal(resolveSoloCategoryArtSlot('Peace and Grounding'), 'solo.card.default');
  assert.equal(resolveSoloCategoryArtSlot(''), 'solo.card.default');
});

test('resolveOccurrenceCardArtSlot elevates 11:11 and flagship moments', () => {
  assert.equal(resolveOccurrenceCardArtSlot('ritual_1111'), 'live.card.flagship1111');
  assert.equal(resolveOccurrenceCardArtSlot('global_flagships'), 'live.card.flagship1111');
  assert.equal(resolveOccurrenceCardArtSlot('live_now'), 'live.card.default');
});
