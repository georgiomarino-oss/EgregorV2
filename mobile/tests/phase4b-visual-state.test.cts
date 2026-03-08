import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveSectionThemeByBackgroundVariant,
  resolveSectionThemeByRoute,
} from '../src/theme/sectionThemeMapping';
import { resolveOccurrenceVisualState } from '../src/features/events/utils/occurrenceVisualState';

test('resolveSectionThemeByRoute maps tab routes to canonical section themes', () => {
  assert.equal(resolveSectionThemeByRoute('SoloTab'), 'solo');
  assert.equal(resolveSectionThemeByRoute('CommunityTab'), 'circles');
  assert.equal(resolveSectionThemeByRoute('EventsTab'), 'live');
  assert.equal(resolveSectionThemeByRoute('ProfileTab'), 'profile');
  assert.equal(resolveSectionThemeByRoute('UnknownTab'), 'solo');
});

test('resolveSectionThemeByBackgroundVariant maps supported background variants correctly', () => {
  assert.equal(resolveSectionThemeByBackgroundVariant('solo'), 'solo');
  assert.equal(resolveSectionThemeByBackgroundVariant('home'), 'circles');
  assert.equal(resolveSectionThemeByBackgroundVariant('circles'), 'circles');
  assert.equal(resolveSectionThemeByBackgroundVariant('live'), 'live');
  assert.equal(resolveSectionThemeByBackgroundVariant('events'), 'live');
  assert.equal(resolveSectionThemeByBackgroundVariant('eventRoom'), 'live');
  assert.equal(resolveSectionThemeByBackgroundVariant('profile'), 'profile');
  assert.equal(resolveSectionThemeByBackgroundVariant('auth'), null);
});

test('resolveOccurrenceVisualState elevates 11:11 and global flagship emphasis', () => {
  const ritual = resolveOccurrenceVisualState('ritual_1111');
  const flagship = resolveOccurrenceVisualState('global_flagships');
  const defaultVisual = resolveOccurrenceVisualState('next_24_hours');

  assert.equal(ritual.isElevenEleven, true);
  assert.equal(ritual.isFlagship, false);
  assert.equal(ritual.emphasisLabel, '11:11 Signature Ritual');
  assert.equal(ritual.fallbackLabel, '11:11 Ritual');
  assert.equal(ritual.emphasisIcon, 'clock-outline');

  assert.equal(flagship.isElevenEleven, false);
  assert.equal(flagship.isFlagship, true);
  assert.equal(flagship.emphasisLabel, 'Global Flagship');
  assert.equal(flagship.fallbackLabel, 'Global Flagship');
  assert.equal(flagship.emphasisIcon, 'earth');

  assert.equal(defaultVisual.isElevenEleven, false);
  assert.equal(defaultVisual.isFlagship, false);
  assert.equal(defaultVisual.emphasisLabel, null);
  assert.equal(defaultVisual.fallbackLabel, null);
  assert.equal(defaultVisual.emphasisIcon, 'earth');
});

