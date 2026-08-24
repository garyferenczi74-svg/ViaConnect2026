import { describe, it, expect } from 'vitest';
import {
  MARKETING_CHIP_KEYS,
  MARKETING_CHIP_LABELS,
  MARKETING_CHIP_ICONS,
  isMarketingChipKey,
} from '../keys';

describe('morning-card marketing keys', () => {
  it('exports exactly the eight marketing chips in display order', () => {
    expect([...MARKETING_CHIP_KEYS]).toEqual([
      'recovery',
      'sleep',
      'strain',
      'regimen',
      'nutrients',
      'symptoms',
      'metabolic',
      'immune',
    ]);
    expect(MARKETING_CHIP_KEYS).toHaveLength(8);
  });

  it('does not include Helix or engagement-lever keys', () => {
    const keys: readonly string[] = MARKETING_CHIP_KEYS;
    expect(keys).not.toContain('helix_challenges');
    expect(keys).not.toContain('helix');
    expect(keys).not.toContain('plug_ins');
    expect(keys).not.toContain('body_tracker');
  });

  it('labels every key in title case without Vitality', () => {
    for (const key of MARKETING_CHIP_KEYS) {
      expect(MARKETING_CHIP_LABELS[key].length).toBeGreaterThan(0);
      expect(MARKETING_CHIP_LABELS[key]).not.toMatch(/Vitality/i);
      expect(MARKETING_CHIP_LABELS[key]).not.toMatch(/Helix/i);
    }
  });

  it('maps each key to a Lucide icon name', () => {
    expect(MARKETING_CHIP_ICONS.recovery).toBe('Heart');
    expect(MARKETING_CHIP_ICONS.sleep).toBe('Moon');
    expect(MARKETING_CHIP_ICONS.strain).toBe('Activity');
    expect(MARKETING_CHIP_ICONS.regimen).toBe('Pill');
    expect(MARKETING_CHIP_ICONS.nutrients).toBe('Apple');
    expect(MARKETING_CHIP_ICONS.symptoms).toBe('ClipboardList');
    expect(MARKETING_CHIP_ICONS.metabolic).toBe('Leaf');
    expect(MARKETING_CHIP_ICONS.immune).toBe('Shield');
  });

  it('narrows known keys and rejects unknown strings', () => {
    expect(isMarketingChipKey('sleep')).toBe(true);
    expect(isMarketingChipKey('helix_challenges')).toBe(false);
    expect(isMarketingChipKey('Vitality')).toBe(false);
  });
});
