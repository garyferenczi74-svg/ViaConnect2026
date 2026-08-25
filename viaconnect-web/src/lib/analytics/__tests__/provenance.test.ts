import { describe, expect, it } from 'vitest';
import {
  ANALYTICS_PROVENANCE_CHIPS,
  ANALYTICS_PROVENANCE_EMPTY,
  bodyFatDisplay,
  chipForGoalOrigin,
  chipForSourceName,
  entryToSourceName,
  goalProgressDisplay,
  hannahLiftDisplay,
  hydrationVitalDisplay,
  isDerivedLeanMass,
  leanMassDisplay,
  redactUnsourcedHannahNumbers,
  sameSourceTrend,
  sourcedDisplay,
  unwrapRelatedEntry,
  vitalValueDisplay,
  weightBoundDisplay,
} from '../provenance';

describe('Brief 32 provenance vocabulary', () => {
  it('locks the exact chip list', () => {
    expect(ANALYTICS_PROVENANCE_CHIPS).toEqual([
      'from CAQ',
      'from profile',
      'from Hume Body Pod',
      'from Apple Health',
      'estimated',
    ]);
  });

  it('maps known source names and never copies phone_health onto Hume', () => {
    expect(chipForSourceName('hume_body_pod')).toBe('from Hume Body Pod');
    expect(chipForSourceName('phone_health')).toBeNull();
    expect(chipForSourceName('Hume Health')).toBeNull();
    expect(chipForSourceName('hume')).toBeNull();
    expect(chipForSourceName('fittrack')).toBeNull();
    expect(chipForSourceName('apple_health')).toBe('from Apple Health');
    expect(chipForSourceName('Apple Health')).toBe('from Apple Health');
    expect(chipForSourceName('caq')).toBe('from CAQ');
    expect(chipForSourceName('caq_backfill')).toBe('from CAQ');
    expect(chipForSourceName('manual')).toBe('from profile');
    expect(chipForSourceName('goals_tab')).toBe('from profile');
    expect(chipForSourceName('weight_card')).toBe('from profile');
    expect(chipForSourceName('estimated')).toBe('estimated');
    expect(chipForSourceName(null)).toBeNull();
    expect(chipForSourceName('whoop')).toBeNull();
  });

  it('maps goal origin to CAQ or profile', () => {
    expect(chipForGoalOrigin('caq')).toBe('from CAQ');
    expect(chipForGoalOrigin('caq_backfill')).toBe('from CAQ');
    expect(chipForGoalOrigin('goals_tab')).toBe('from profile');
    expect(chipForGoalOrigin('weight_card')).toBe('from profile');
    expect(chipForGoalOrigin(null)).toBeNull();
  });

  it('reads Hume only from exact entry device_name hume_body_pod', () => {
    expect(entryToSourceName({ device_name: 'hume_body_pod', source: 'import' })).toBe(
      'hume_body_pod',
    );
    expect(entryToSourceName({ device_name: 'Hume Health', source: 'import' })).toBe(
      'Hume Health',
    );
    expect(chipForSourceName(entryToSourceName({ device_name: 'Hume Health', source: 'import' }))).toBeNull();
    expect(entryToSourceName({ source: 'manual', device_name: null })).toBe('manual');
    expect(unwrapRelatedEntry([{ source: 'manual', device_name: null }])?.source).toBe('manual');
    expect(unwrapRelatedEntry(null)).toBeNull();
  });
});

describe('Brief 32 printed number honesty', () => {
  it('hides a number when the chip is missing', () => {
    expect(sourcedDisplay('62 bpm', null)).toEqual({
      text: ANALYTICS_PROVENANCE_EMPTY,
      chip: null,
    });
    expect(sourcedDisplay('62 bpm', 'from profile')).toEqual({
      text: '62 bpm',
      chip: 'from profile',
    });
  });

  it('prints Resting HR only with a chip, never unsourced 62', () => {
    expect(
      vitalValueDisplay({ value: 62, unit: 'bpm', sourceName: null, round: true }),
    ).toEqual({ text: '--', chip: null });
    expect(
      vitalValueDisplay({ value: 62, unit: 'bpm', sourceName: 'caq', round: true }),
    ).toEqual({ text: '62 bpm', chip: 'from CAQ' });
    expect(
      vitalValueDisplay({ value: 62, unit: 'bpm', sourceName: 'manual', round: true }),
    ).toEqual({ text: '62 bpm', chip: 'from profile' });
    expect(
      vitalValueDisplay({ value: 0, unit: 'bpm', sourceName: 'manual', round: true }),
    ).toEqual({ text: '--', chip: null });
  });

  it('treats unsourced hydration 0 as --, never 0.0 L', () => {
    expect(hydrationVitalDisplay({ totalMl: 0, logCount: 0, eventCount: 0 })).toEqual({
      text: '--',
      chip: null,
    });
    expect(hydrationVitalDisplay({ totalMl: 0, logCount: 2, eventCount: 0 })).toEqual({
      text: '--',
      chip: null,
    });
    expect(hydrationVitalDisplay({ totalMl: 1500, logCount: 2, eventCount: 0 })).toEqual({
      text: '1.5 L',
      chip: 'from profile',
    });
    expect(hydrationVitalDisplay({ totalMl: 1500, logCount: 0, eventCount: 0 })).toEqual({
      text: '--',
      chip: null,
    });
  });

  it('labels derived lean mass estimated and hides unsourced device-looking lean mass', () => {
    expect(isDerivedLeanMass(189.8, 260, 27)).toBe(true);
    expect(
      leanMassDisplay({
        measuredLbs: 189.8,
        measuredSourceName: null,
        weightLbs: 260,
        bodyFatPct: 27,
      }),
    ).toEqual({ text: '189.8 lb', chip: 'estimated' });
    expect(
      leanMassDisplay({
        measuredLbs: 145.5,
        measuredSourceName: 'hume_body_pod',
        weightLbs: 200,
        bodyFatPct: 20,
      }),
    ).toEqual({ text: '145.5 lb', chip: 'from Hume Body Pod' });
    expect(
      leanMassDisplay({
        measuredLbs: 145.5,
        measuredSourceName: null,
        weightLbs: 200,
        bodyFatPct: 10,
      }),
    ).toEqual({ text: '--', chip: null });
    expect(
      leanMassDisplay({
        measuredLbs: null,
        measuredSourceName: null,
        weightLbs: 260,
        bodyFatPct: 27,
      }),
    ).toEqual({ text: '189.8 lb', chip: 'estimated' });
  });

  it('hides unsourced body fat and does not invent a +27 pt trend', () => {
    expect(bodyFatDisplay({ bodyFatPct: 27, sourceName: null })).toEqual({
      text: '--',
      chip: null,
    });
    expect(bodyFatDisplay({ bodyFatPct: 27, sourceName: 'caq' })).toEqual({
      text: '27.0 %',
      chip: 'from CAQ',
    });

    const mixed = sameSourceTrend([
      { value: 0, date: '2026-08-01', sourceName: 'caq' },
      { value: 27, date: '2026-08-20', sourceName: 'caq' },
    ]);
    expect(mixed.series).toEqual([]);
    expect(mixed.delta).toBeNull();

    const onePoint = sameSourceTrend([
      { value: 27, date: '2026-08-20', sourceName: 'caq' },
    ]);
    expect(onePoint.series).toEqual([]);
    expect(onePoint.delta).toBeNull();

    const twoSame = sameSourceTrend([
      { value: 26.2, date: '2026-08-01', sourceName: 'manual' },
      { value: 27.0, date: '2026-08-20', sourceName: 'manual' },
    ]);
    expect(twoSame.series).toEqual([26.2, 27.0]);
    expect(twoSame.delta).toBe(0.8);
    expect(twoSame.chip).toBe('from profile');

    const mixedSources = sameSourceTrend([
      { value: 26.2, date: '2026-08-01', sourceName: 'caq' },
      { value: 27.0, date: '2026-08-20', sourceName: 'hume_body_pod' },
    ]);
    expect(mixedSources.series).toEqual([]);
    expect(mixedSources.delta).toBeNull();
  });

  it('chips weight start/now/target or prints --', () => {
    expect(
      weightBoundDisplay({ kind: 'Start', pounds: 265, sourceName: 'caq' }),
    ).toEqual({ text: 'Start 265 lb', chip: 'from CAQ' });
    expect(
      weightBoundDisplay({ kind: 'Now', pounds: 260, sourceName: null }),
    ).toEqual({ text: 'Now --', chip: null });
    expect(
      weightBoundDisplay({
        kind: 'Now',
        pounds: 260,
        sourceName: null,
        caqWeightLbs: 260.2,
      }),
    ).toEqual({ text: 'Now 260 lb', chip: 'from CAQ' });
    expect(
      weightBoundDisplay({ kind: 'Target', pounds: 220, sourceName: 'goals_tab' }),
    ).toEqual({ text: 'Target 220 lb', chip: 'from profile' });
  });

  it('chips goal percent estimated only when start/now/target are sourced', () => {
    expect(
      goalProgressDisplay({
        percent: 13,
        startChip: 'from CAQ',
        nowChip: 'from profile',
        targetChip: 'from CAQ',
      }),
    ).toEqual({ text: '13%', chip: 'estimated' });
    expect(
      goalProgressDisplay({
        percent: 13,
        startChip: 'from CAQ',
        nowChip: null,
        targetChip: 'from CAQ',
      }),
    ).toEqual({ text: '--', chip: null });
  });

  it('chips Hannah +pts as estimated, or hides when there is no lift', () => {
    expect(hannahLiftDisplay(6)).toEqual({ text: '+6 pts', chip: 'estimated' });
    expect(hannahLiftDisplay(0)).toEqual({ text: '--', chip: null });
    expect(hannahLiftDisplay(null)).toEqual({ text: '--', chip: null });
  });

  it('redacts Hannah baseline 62 when that number has no source', () => {
    const unsourced =
      'Early readings suggest a progressing baseline at 62. The next ten days of consistent check ins will unlock pattern detection.';
    expect(redactUnsourcedHannahNumbers(unsourced, [])).toContain('baseline at --');
    expect(redactUnsourcedHannahNumbers(unsourced, [])).not.toMatch(/\b62\b/);
    expect(redactUnsourcedHannahNumbers(unsourced, [62])).toContain('baseline at 62');
  });
});

describe('Brief 32 disconnected Consumer', () => {
  it('does not look like a wearable unless chipped from CAQ or profile', () => {
    const rhr = vitalValueDisplay({
      value: 62,
      unit: 'bpm',
      sourceName: null,
      round: true,
    });
    const lean = leanMassDisplay({
      measuredLbs: 189.8,
      measuredSourceName: 'hume_body_pod',
      weightLbs: 260,
      bodyFatPct: 27,
    });
    const fat = bodyFatDisplay({ bodyFatPct: 27, sourceName: null });

    expect(rhr.text).toBe('--');
    expect(fat.text).toBe('--');
    // Derived lean must not inherit a Hume chip from an unsourced device claim.
    expect(lean.chip).toBe('estimated');
    expect(lean.chip).not.toBe('from Hume Body Pod');
  });
});
