// Tests for src/lib/scoring/pill-icons.ts.
//
// Each pill key resolves to a Lucide icon component reference. The
// pill primitive renders <Icon strokeWidth={1.5} className="h-4 w-4" />.

import { describe, it, expect } from 'vitest';
import {
  ACCURACY_PILL_ICONS,
  ENGAGEMENT_PILL_ICONS,
  type AccuracyPillKey,
  type EngagementPillKey,
} from '../pill-icons';

describe('ACCURACY_PILL_ICONS', () => {
  it('exposes one icon per accuracy pill key', () => {
    const keys: AccuracyPillKey[] = ['caq', 'labs', 'genetics'];
    for (const key of keys) {
      expect(ACCURACY_PILL_ICONS[key]).toBeTypeOf('object');
    }
    expect(Object.keys(ACCURACY_PILL_ICONS).sort()).toEqual([...keys].sort());
  });
});

describe('ENGAGEMENT_PILL_ICONS', () => {
  it('exposes one icon per engagement pill key', () => {
    const keys: EngagementPillKey[] = [
      'nutrition',
      'supplements',
      'body_tracker',
      'wearable',
      'plug_ins',
      'helix_challenges',
    ];
    for (const key of keys) {
      expect(ENGAGEMENT_PILL_ICONS[key]).toBeTypeOf('object');
    }
    expect(Object.keys(ENGAGEMENT_PILL_ICONS).sort()).toEqual([...keys].sort());
  });
});
