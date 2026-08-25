import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ProvenanceChip } from '@/components/journey/coaching/ProvenanceChip';
import {
  ANALYTICS_PROVENANCE_CHIPS,
  bodyFatDisplay,
  chipForSourceName,
  goalProgressDisplay,
  hannahLiftDisplay,
  hydrationVitalDisplay,
  leanMassDisplay,
  redactUnsourcedHannahNumbers,
  sameSourceTrend,
  vitalValueDisplay,
  weightBoundDisplay,
} from '@/lib/analytics/provenance';

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Brief 32 Analytics provenance chips', () => {
  it('wires the live coaching Analytics surface, not the flag-off VitalTrends trio', () => {
    const page = src('src/app/(app)/(consumer)/analytics/page.tsx');
    const journey = src('src/components/journey/YourJourneyCoaching.tsx');
    const vitalsFlagOff = src('src/components/journey/trio/VitalTrends.tsx');

    expect(page).toContain('YourJourneyCoaching');
    expect(page).toMatch(/import \{ YourJourneyCoaching \}/);
    expect(page).not.toMatch(/import \{[^}]*YourJourneyPage/);
    expect(page).not.toMatch(/<VitalTrends/);
    expect(page).not.toMatch(/<YourJourneyPage/);
    expect(journey).toContain('ProvenanceChip');
    expect(journey).toContain('vitalValueDisplay');
    expect(journey).toContain('hydrationVitalDisplay');
    expect(journey).toContain('leanMassDisplay');
    expect(journey).toContain('bodyFatDisplay');
    expect(journey).toContain('weightBoundDisplay');
    expect(journey).toContain('goalProgressDisplay');
    expect(journey).toContain('hannahLiftDisplay');
    expect(journey).toContain('sameSourceTrend');
    expect(journey).toContain('row.series.length >= 2');
    expect(vitalsFlagOff).toContain('Not connected');
    expect(vitalsFlagOff).not.toContain('useMetabolicVitals');
  });

  it('does not mint HRV/RHR from wearable_daily_vitals or turn native_health_bridge on', () => {
    const journey = src('src/components/journey/YourJourneyCoaching.tsx');
    const metabolic = src('src/hooks/journey/useMetabolicVitals.ts');
    const flags = src('src/lib/config/feature-flags.ts');

    expect(journey).not.toContain('wearable_daily_vitals');
    expect(metabolic).not.toContain('wearable_daily_vitals');
    expect(metabolic).toContain('body_tracker_metabolic');
    expect(flags).toMatch(/native_health_bridge:\s*\{\s*default:\s*false/);
    expect(journey).not.toContain('native_health_bridge');
    expect(metabolic).not.toContain('native_health_bridge');
  });

  it('never copies phone_health onto a Hume chip', () => {
    expect(chipForSourceName('phone_health')).toBeNull();
    expect(chipForSourceName('hume_body_pod')).toBe('from Hume Body Pod');
    const journey = src('src/components/journey/YourJourneyCoaching.tsx');
    const provenance = src('src/lib/analytics/provenance.ts');
    expect(journey).not.toMatch(/phone_health[\s\S]{0,80}hume_body_pod/);
    expect(provenance).toContain('if (key === \'phone_health\') return null');
    expect(provenance).toContain('if (raw === \'hume_body_pod\') return \'from Hume Body Pod\'');
  });

  it('prints every coaching-block number with the exact chip vocabulary or --', () => {
    ANALYTICS_PROVENANCE_CHIPS.forEach((chip) => {
      const html = renderToStaticMarkup(createElement(ProvenanceChip, { chip }));
      expect(html).toContain(chip);
      expect(html).toContain('data-provenance');
    });

    const disconnected = {
      rhr: vitalValueDisplay({ value: 62, unit: 'bpm', sourceName: null, round: true }),
      hydration: hydrationVitalDisplay({ totalMl: 0, logCount: 0, eventCount: 0 }),
      lean: leanMassDisplay({
        measuredLbs: 189.8,
        measuredSourceName: null,
        weightLbs: 260,
        bodyFatPct: 27,
      }),
      fat: bodyFatDisplay({ bodyFatPct: 27, sourceName: null }),
      start: weightBoundDisplay({ kind: 'Start', pounds: 265, sourceName: 'caq' }),
      now: weightBoundDisplay({ kind: 'Now', pounds: 260, sourceName: null }),
      target: weightBoundDisplay({ kind: 'Target', pounds: 220, sourceName: 'caq' }),
      lift: hannahLiftDisplay(6),
    };

    expect(disconnected.rhr).toEqual({ text: '--', chip: null });
    expect(disconnected.hydration).toEqual({ text: '--', chip: null });
    expect(disconnected.fat).toEqual({ text: '--', chip: null });
    expect(disconnected.now.text).toBe('Now --');
    expect(disconnected.start).toEqual({ text: 'Start 265 lb', chip: 'from CAQ' });
    expect(disconnected.target).toEqual({ text: 'Target 220 lb', chip: 'from CAQ' });
    expect(disconnected.lean).toEqual({ text: '189.8 lb', chip: 'estimated' });
    expect(disconnected.lift).toEqual({ text: '+6 pts', chip: 'estimated' });

    expect(
      goalProgressDisplay({
        percent: 13,
        startChip: disconnected.start.chip,
        nowChip: disconnected.now.chip,
        targetChip: disconnected.target.chip,
      }),
    ).toEqual({ text: '--', chip: null });

    const labeledNow = weightBoundDisplay({ kind: 'Now', pounds: 260, sourceName: 'manual' });
    expect(labeledNow).toEqual({ text: 'Now 260 lb', chip: 'from profile' });
    expect(
      goalProgressDisplay({
        percent: 13,
        startChip: 'from CAQ',
        nowChip: 'from profile',
        targetChip: 'from CAQ',
      }),
    ).toEqual({ text: '13%', chip: 'estimated' });
  });

  it('requires two same-source dated points before a sparkline or +pt delta', () => {
    const synthetic = sameSourceTrend([
      { value: 0, date: '2026-08-01', sourceName: 'caq' },
      { value: 27, date: '2026-08-20', sourceName: 'caq' },
    ]);
    expect(synthetic.series).toEqual([]);
    expect(synthetic.delta).toBeNull();

    const one = sameSourceTrend([{ value: 27, date: '2026-08-20', sourceName: 'manual' }]);
    expect(one.series).toEqual([]);
    expect(one.delta).toBeNull();

    const real = sameSourceTrend([
      { value: 26.0, date: '2026-08-01', sourceName: 'manual' },
      { value: 27.0, date: '2026-08-20', sourceName: 'manual' },
    ]);
    expect(real.series.length).toBeGreaterThanOrEqual(2);
    expect(real.delta).toBe(1);
    expect(real.chip).toBe('from profile');
  });

  it('redacts Hannah citing 62 when Resting HR has no source', () => {
    const copy =
      'You are building the first data points of your Bio Optimization journey. Early readings suggest a progressing baseline at 62.';
    expect(redactUnsourcedHannahNumbers(copy, [])).not.toMatch(/\b62\b/);
    expect(redactUnsourcedHannahNumbers(copy, [62])).toContain('baseline at 62');
    expect(hannahLiftDisplay(0).text).toBe('--');
  });
});
