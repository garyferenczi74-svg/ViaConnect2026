/**
 * src/components/journey/coaching/__tests__/gaugeCluster.test.ts
 *
 * TDD for buildGaugeData (Prompt 208g Task G-T2).
 * Pure helper: deterministic, never throws, no DOM, node-safe.
 *
 * The 7 pillars in order:
 *   1. Sleep Quality    averages.sleep       metric 'sleep'
 *   2. Energy Level     averages.adherence   metric 'energy'
 *   3. Mood and Stress  averages.stress      metric 'mood'
 *   4. Nutrition        averages.nutrition   metric 'nutrition'
 *   5. Physical Activity averages.movement   metric 'activity'
 *   6. Bio Optimization current (composite) metric 'wellness'
 *   7. Hydration        hydrationPct         metric 'plasmateal'
 */

import { describe, it, expect } from 'vitest';
import { buildGaugeData } from '../GaugeCluster';

describe('buildGaugeData', () => {
  it('returns exactly 7 entries', () => {
    const result = buildGaugeData({});
    expect(result).toHaveLength(7);
  });

  it('returns entries in the specified order with correct labels and metrics', () => {
    const result = buildGaugeData({});
    expect(result[0]).toMatchObject({ label: 'Sleep Quality', metric: 'sleep' });
    expect(result[1]).toMatchObject({ label: 'Energy Level', metric: 'energy' });
    expect(result[2]).toMatchObject({ label: 'Mood and Stress', metric: 'mood' });
    expect(result[3]).toMatchObject({ label: 'Nutrition', metric: 'nutrition' });
    expect(result[4]).toMatchObject({ label: 'Physical Activity', metric: 'activity' });
    expect(result[5]).toMatchObject({ label: 'Bio Optimization', metric: 'wellness' });
    expect(result[6]).toMatchObject({ label: 'Hydration', metric: 'plasmateal' });
  });

  it('empty input returns 7 entries all value 0 (computing state)', () => {
    const result = buildGaugeData({});
    result.forEach((entry) => {
      expect(entry.value).toBe(0);
    });
  });

  it('rounds 73.6 to 74', () => {
    const result = buildGaugeData({
      averages: { sleep: 73.6 },
    });
    expect(result[0].value).toBe(74);
  });

  it('clamps values above 100 to 100', () => {
    const result = buildGaugeData({
      averages: { sleep: 120 },
    });
    expect(result[0].value).toBe(100);
  });

  it('converts negative to 0', () => {
    const result = buildGaugeData({
      averages: { sleep: -5 },
    });
    expect(result[0].value).toBe(0);
  });

  it('converts NaN to 0', () => {
    const result = buildGaugeData({
      averages: { sleep: NaN },
    });
    expect(result[0].value).toBe(0);
  });

  it('converts undefined averages field to 0', () => {
    const result = buildGaugeData({
      averages: {},
    });
    expect(result[0].value).toBe(0);
  });

  it('converts null averages to all zeros', () => {
    const result = buildGaugeData({
      averages: null,
    });
    result.forEach((entry) => {
      expect(entry.value).toBe(0);
    });
  });

  it('maps averages.adherence to Energy Level entry', () => {
    const result = buildGaugeData({
      averages: { adherence: 65.4 },
    });
    const energy = result.find((e) => e.label === 'Energy Level');
    expect(energy).toBeDefined();
    expect(energy!.value).toBe(65);
  });

  it('maps averages.stress to Mood and Stress entry', () => {
    const result = buildGaugeData({
      averages: { stress: 50 },
    });
    expect(result[2].value).toBe(50);
  });

  it('maps averages.nutrition to Nutrition entry', () => {
    const result = buildGaugeData({
      averages: { nutrition: 82 },
    });
    expect(result[3].value).toBe(82);
  });

  it('maps averages.movement to Physical Activity entry', () => {
    const result = buildGaugeData({
      averages: { movement: 45.9 },
    });
    expect(result[4].value).toBe(46);
  });

  it('maps current to Bio Optimization entry', () => {
    const result = buildGaugeData({
      current: 77,
    });
    const bio = result.find((e) => e.label === 'Bio Optimization');
    expect(bio).toBeDefined();
    expect(bio!.value).toBe(77);
  });

  it('maps hydrationPct to Hydration entry', () => {
    const result = buildGaugeData({
      hydrationPct: 88,
    });
    const hydration = result.find((e) => e.label === 'Hydration');
    expect(hydration).toBeDefined();
    expect(hydration!.value).toBe(88);
  });

  it('converts null hydrationPct to 0', () => {
    const result = buildGaugeData({
      hydrationPct: null,
    });
    expect(result[6].value).toBe(0);
  });

  it('handles all values populated correctly', () => {
    const result = buildGaugeData({
      current: 55,
      averages: {
        sleep: 70,
        adherence: 60,
        stress: 50,
        nutrition: 80,
        movement: 90,
      },
      hydrationPct: 75,
    });
    expect(result[0].value).toBe(70);  // Sleep Quality
    expect(result[1].value).toBe(60);  // Energy Level
    expect(result[2].value).toBe(50);  // Mood and Stress
    expect(result[3].value).toBe(80);  // Nutrition
    expect(result[4].value).toBe(90);  // Physical Activity
    expect(result[5].value).toBe(55);  // Bio Optimization
    expect(result[6].value).toBe(75);  // Hydration
  });

  it('never throws on unexpected input', () => {
    expect(() => buildGaugeData({})).not.toThrow();
    expect(() => buildGaugeData({ averages: null })).not.toThrow();
    expect(() => buildGaugeData({ current: undefined })).not.toThrow();
    expect(() => buildGaugeData({ hydrationPct: undefined })).not.toThrow();
  });
});
