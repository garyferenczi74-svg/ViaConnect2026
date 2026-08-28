import { describe, it, expect } from 'vitest';
import {
  CONTRIBUTOR_METRICS,
  METRIC_LABELS,
} from '@/lib/body-tracker/contributor-rows';
import {
  MORNING_CHIP_KEYS,
  MORNING_CHIP_LABELS,
  MORNING_CHIP_ICONS,
  isMorningChipKey,
} from '../keys';

describe('morning-card contributor keys', () => {
  it('exports exactly the 7 METRIC_LABELS in Connections order', () => {
    expect([...MORNING_CHIP_KEYS]).toEqual([...CONTRIBUTOR_METRICS]);
    expect(MORNING_CHIP_KEYS).toHaveLength(7);
    expect(MORNING_CHIP_KEYS.map((key) => MORNING_CHIP_LABELS[key])).toEqual([
      'HRV',
      'Sleep',
      'Resting HR',
      'Recovery',
      'Workouts',
      'Body comp.',
      'Steps',
    ]);
    expect(MORNING_CHIP_LABELS).toEqual(METRIC_LABELS);
  });

  it('does not include the eight marketing keys or Helix', () => {
    const keys: readonly string[] = MORNING_CHIP_KEYS;
    expect(keys).not.toContain('strain');
    expect(keys).not.toContain('regimen');
    expect(keys).not.toContain('nutrients');
    expect(keys).not.toContain('symptoms');
    expect(keys).not.toContain('metabolic');
    expect(keys).not.toContain('immune');
    expect(keys).not.toContain('helix_challenges');
    expect(keys).not.toContain('helix');
  });

  it('labels every key without Vitality or Helix', () => {
    for (const key of MORNING_CHIP_KEYS) {
      expect(MORNING_CHIP_LABELS[key].length).toBeGreaterThan(0);
      expect(MORNING_CHIP_LABELS[key]).not.toMatch(/Vitality/i);
      expect(MORNING_CHIP_LABELS[key]).not.toMatch(/Helix/i);
    }
  });

  it('maps each key to a Lucide icon name', () => {
    expect(MORNING_CHIP_ICONS.hrv).toBe('HeartPulse');
    expect(MORNING_CHIP_ICONS.sleep).toBe('Moon');
    expect(MORNING_CHIP_ICONS.resting_hr).toBe('Gauge');
    expect(MORNING_CHIP_ICONS.recovery).toBe('Activity');
    expect(MORNING_CHIP_ICONS.workouts).toBe('Dumbbell');
    expect(MORNING_CHIP_ICONS.body_composition).toBe('Droplet');
    expect(MORNING_CHIP_ICONS.steps).toBe('Footprints');
  });

  it('narrows known keys and rejects unknown strings', () => {
    expect(isMorningChipKey('sleep')).toBe(true);
    expect(isMorningChipKey('hrv')).toBe(true);
    expect(isMorningChipKey('helix_challenges')).toBe(false);
    expect(isMorningChipKey('Vitality')).toBe(false);
    expect(isMorningChipKey('strain')).toBe(false);
  });
});
