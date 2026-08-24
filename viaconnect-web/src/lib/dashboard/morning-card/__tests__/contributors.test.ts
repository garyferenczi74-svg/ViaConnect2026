import { describe, it, expect } from 'vitest';
import {
  MARKETING_CHIP_CONTRIBUTORS,
  buildMorningChips,
  chipByKey,
} from '../contributors';
import { MARKETING_CHIP_KEYS } from '../keys';

describe('morning-card contributors DISPLAY', () => {
  it('builds eight chips in marketing order', () => {
    const chips = buildMorningChips();
    expect(chips.map((c) => c.key)).toEqual([...MARKETING_CHIP_KEYS]);
    expect(chips).toHaveLength(8);
  });

  it('keeps every live contributor pending until Brief 12', () => {
    const chips = buildMorningChips();
    for (const chip of chips) {
      expect(chip.sourceStatus).toBe('pending');
      expect(chip.contributors.length).toBeGreaterThan(0);
      for (const row of chip.contributors) {
        expect(row.sourceStatus).toBe('pending');
        expect(row.displayValue).toBe('Pending');
      }
    }
  });

  it('does not invent last-sync or numeric zeros', () => {
    const chips = buildMorningChips();
    const blob = JSON.stringify(chips);
    expect(blob).not.toMatch(/last_sync/);
    expect(blob).not.toMatch(/"displayValue":"0"/);
    expect(blob).not.toMatch(/Vitality/);
    expect(blob).not.toMatch(/Helix/);
  });

  it('lists Brief 4 wearable names as DISPLAY catalog only', () => {
    expect(MARKETING_CHIP_CONTRIBUTORS.recovery.map((c) => c.name)).toEqual([
      'Whoop',
      'Oura',
    ]);
    expect(MARKETING_CHIP_CONTRIBUTORS.sleep.map((c) => c.name)).toEqual([
      'Whoop',
      'Oura',
      'Apple Health',
    ]);
    expect(MARKETING_CHIP_CONTRIBUTORS.strain.map((c) => c.name)).toEqual(['Whoop']);
    expect(MARKETING_CHIP_CONTRIBUTORS.metabolic.map((c) => c.name)).toEqual([
      'Hume',
      'Apple Health',
    ]);
  });

  it('looks up a chip by key', () => {
    const chips = buildMorningChips();
    expect(chipByKey(chips, 'immune')?.label).toBe('Immune');
    expect(chipByKey(chips, 'immune')?.contributors[0]?.name).toBe('Labs');
  });
});
