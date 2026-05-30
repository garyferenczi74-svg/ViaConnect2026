// Tests for the Practitioner Body Scan tab pure logic (Prompt #169 Task 3,
// spec section 12). The project's vitest config runs node-environment .test.ts
// only, so the testable contract lives in the pure shaping + guard helpers; the
// React component is a thin wrapper that fetches rows and renders the result.
//
// Coverage targets:
//   * the practitioner payload carries the single aggregate engagement score
//   * the practitioner payload carries NO Helix fields (firewall guard)
//   * trend series + delta math from raw measurement rows
//   * peptide copy passes the no-Tesofensine / no-Semaglutide rule and any
//     Retatrutide reference is injectable-only

import { describe, it, expect } from 'vitest';
import {
  toAggregateEngagement,
  buildTrendSeries,
  trendDelta,
  buildPractitionerScanPayload,
  findHelixExposure,
  assertNoHelixExposure,
  type EngagementScoreResponse,
  type ScanMeasurementRow,
} from '@/lib/body-tracker/practitioner-scan';
import {
  PRACTITIONER_PEPTIDE_GUIDANCE,
  FORBIDDEN_PEPTIDE_TERMS,
  findForbiddenPeptideTerms,
  flattenGuidanceCopy,
  assertPeptideCopyCompliant,
} from '@/lib/body-tracker/practitioner-peptide-guidance';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ENGAGEMENT: EngagementScoreResponse = {
  score: 78,
  components: {
    protocolAdherence: 80,
    assessmentEngagement: 75,
    trackingConsistency: 70,
    outcomeTrajectory: 88,
  },
  period: { start: '2026-04-01', end: '2026-04-30' },
};

function measRow(date: string, bf: number | null, lean: number | null, waist: number | null): ScanMeasurementRow {
  return {
    session_id: `s-${date}`,
    scan_date: date,
    waist_natural_circ_cm: waist,
    hip_circ_cm: 98,
    chest_circ_cm: 100,
    waist_to_hip_ratio: waist ? Math.round((waist / 98) * 100) / 100 : null,
    body_fat_pct_mid: bf,
    lean_mass_kg: lean,
    fat_mass_kg: bf,
    ffmi: 21,
  };
}

// ===========================================================================
// Aggregate engagement (single 0 to 100 number only)
// ===========================================================================

describe('toAggregateEngagement', () => {
  it('reduces the full response to a single clamped aggregate + period', () => {
    const agg = toAggregateEngagement(ENGAGEMENT);
    expect(agg).toEqual({ score: 78, periodStart: '2026-04-01', periodEnd: '2026-04-30' });
  });

  it('clamps out-of-range scores to 0 to 100', () => {
    expect(toAggregateEngagement({ ...ENGAGEMENT, score: 140 })?.score).toBe(100);
    expect(toAggregateEngagement({ ...ENGAGEMENT, score: -10 })?.score).toBe(0);
  });

  it('returns null for a missing or NaN score', () => {
    expect(toAggregateEngagement(null)).toBeNull();
    expect(toAggregateEngagement({ ...ENGAGEMENT, score: Number.NaN })).toBeNull();
  });

  it('does not surface component sub-scores (aggregate only)', () => {
    const agg = toAggregateEngagement(ENGAGEMENT);
    expect(agg).not.toHaveProperty('components');
    expect(agg).not.toHaveProperty('protocolAdherence');
  });
});

// ===========================================================================
// Trend series + delta
// ===========================================================================

describe('buildTrendSeries', () => {
  it('sorts ascending by date and maps fields', () => {
    const series = buildTrendSeries([
      measRow('2026-03-01', 22, 60, 84),
      measRow('2026-01-01', 25, 58, 90),
      measRow('2026-02-01', 23.5, 59, 87),
    ]);
    expect(series.map((p) => p.date)).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
    expect(series[0].bodyFatPct).toBe(25);
    expect(series[2].waistCm).toBe(84);
  });

  it('drops rows with an unparseable date', () => {
    const series = buildTrendSeries([
      measRow('not-a-date', 22, 60, 84),
      measRow('2026-02-01', 23, 59, 87),
    ]);
    expect(series).toHaveLength(1);
    expect(series[0].date).toBe('2026-02-01');
  });
});

describe('trendDelta', () => {
  it('computes first-to-last delta for a metric', () => {
    const series = buildTrendSeries([
      measRow('2026-01-01', 25, 58, 90),
      measRow('2026-03-01', 22, 61, 84),
    ]);
    expect(trendDelta(series, 'bodyFatPct')).toBe(-3);
    expect(trendDelta(series, 'leanMassKg')).toBe(3);
    expect(trendDelta(series, 'waistCm')).toBe(-6);
  });

  it('returns null when fewer than two points carry the metric', () => {
    const series = buildTrendSeries([
      measRow('2026-01-01', null, 58, 90),
      measRow('2026-03-01', 22, 61, 84),
    ]);
    expect(trendDelta(series, 'bodyFatPct')).toBeNull();
  });
});

// ===========================================================================
// Practitioner payload: aggregate engagement present, NO Helix fields
// ===========================================================================

describe('buildPractitionerScanPayload', () => {
  const rows = [
    measRow('2026-01-01', 25, 58, 90),
    measRow('2026-02-01', 23.5, 59, 87),
    measRow('2026-03-01', 22, 61, 84),
  ];

  it('carries the single aggregate engagement score', () => {
    const payload = buildPractitionerScanPayload({
      patientDisplayName: 'Patient',
      measurementRows: rows,
      engagement: ENGAGEMENT,
    });
    expect(payload.engagement).toEqual({ score: 78, periodStart: '2026-04-01', periodEnd: '2026-04-30' });
    expect(payload.scanCount).toBe(3);
    expect(payload.latestScanDate).toBe('2026-03-01');
    expect(payload.trend).toHaveLength(3);
  });

  it('handles a null engagement response (consent withheld / no snapshot)', () => {
    const payload = buildPractitionerScanPayload({
      patientDisplayName: 'Patient',
      measurementRows: rows,
      engagement: null,
    });
    expect(payload.engagement).toBeNull();
  });

  it('exposes NO Helix-shaped fields anywhere in the payload', () => {
    const payload = buildPractitionerScanPayload({
      patientDisplayName: 'Patient',
      measurementRows: rows,
      engagement: ENGAGEMENT,
    });
    expect(findHelixExposure(payload)).toEqual([]);
    // The allow-listed keys only.
    expect(Object.keys(payload).sort()).toEqual(
      ['engagement', 'latestScanDate', 'patientDisplayName', 'scanCount', 'trend'],
    );
  });

  // Prompt #169b section 11.2.3 PRIVACY: cycle data is sensitive and consumer-only.
  // Even if a raw row carries cycle_phase_at_scan, the allow-listed practitioner
  // payload must never surface it (the practitioner Body Scan tab must not read
  // cycle data unless the patient explicitly shared).
  it('excludes cycle-phase data from the practitioner payload (consumer-only)', () => {
    const rowsWithCycle = rows.map((r) => ({
      ...r,
      cycle_phase_at_scan: 'luteal',
      cycle_start_date: '2026-05-01',
    })) as unknown as ScanMeasurementRow[];

    const payload = buildPractitionerScanPayload({
      patientDisplayName: 'Patient',
      measurementRows: rowsWithCycle,
      engagement: ENGAGEMENT,
    });

    // No cycle/menstrual-shaped key anywhere in the serialized payload.
    const serialized = JSON.stringify(payload).toLowerCase();
    expect(serialized).not.toContain('cycle');
    expect(serialized).not.toContain('menstrual');
    expect(serialized).not.toContain('luteal');
    // Trend points carry only their allow-listed measurement fields.
    for (const p of payload.trend) {
      expect(Object.keys(p).sort()).toEqual(
        ['bodyFatPct', 'date', 'fatMassKg', 'leanMassKg', 'sessionId', 'waistCm', 'waistToHipRatio'],
      );
    }
  });
});

// ===========================================================================
// Helix firewall guard
// ===========================================================================

describe('Helix firewall guard', () => {
  it('detects forbidden Helix-shaped keys (deep)', () => {
    const leak = {
      score: 78,
      rewards: { helixBalance: 1200, achievements: ['x'] },
    };
    const hits = findHelixExposure(leak);
    expect(hits).toContain('rewards');
    expect(hits).toContain('rewards.helixBalance');
    expect(hits).toContain('rewards.achievements');
  });

  it('passes a clean aggregate-only object', () => {
    expect(findHelixExposure({ score: 78, periodEnd: '2026-04-30' })).toEqual([]);
  });

  it('assertNoHelixExposure throws on a leak and is silent on a clean object', () => {
    expect(() => assertNoHelixExposure({ helixTokens: 5 })).toThrow(/Helix exposure/);
    expect(() => assertNoHelixExposure({ score: 80 })).not.toThrow();
  });

  it.each(['helix', 'token', 'achievement', 'challenge', 'leaderboard', 'balance', 'streak', 'reward'])(
    'flags a key containing %s',
    (frag) => {
      const obj = { [`${frag}Field`]: 1 };
      expect(findHelixExposure(obj).length).toBeGreaterThan(0);
    },
  );
});

// ===========================================================================
// Peptide guidance compliance
// ===========================================================================

describe('practitioner peptide guidance compliance', () => {
  it('never mentions Tesofensine or Semaglutide', () => {
    expect(findForbiddenPeptideTerms(PRACTITIONER_PEPTIDE_GUIDANCE)).toEqual([]);
    const haystack = flattenGuidanceCopy(PRACTITIONER_PEPTIDE_GUIDANCE);
    for (const term of FORBIDDEN_PEPTIDE_TERMS) {
      expect(haystack).not.toContain(term);
    }
  });

  it('references Retatrutide only with an injectable-only disclosure', () => {
    const haystack = flattenGuidanceCopy(PRACTITIONER_PEPTIDE_GUIDANCE);
    expect(haystack).toContain('retatrutide');
    expect(haystack).toContain('injectable-only');
  });

  it('assertPeptideCopyCompliant passes the shipped content', () => {
    expect(() => assertPeptideCopyCompliant(PRACTITIONER_PEPTIDE_GUIDANCE)).not.toThrow();
  });

  it('assertPeptideCopyCompliant throws if a forbidden term is reintroduced', () => {
    const tampered = {
      ...PRACTITIONER_PEPTIDE_GUIDANCE,
      items: [
        ...PRACTITIONER_PEPTIDE_GUIDANCE.items,
        { id: 'bad', name: 'Semaglutide', note: 'should not be here', routeTag: 'x' },
      ],
    };
    expect(() => assertPeptideCopyCompliant(tampered)).toThrow(/Forbidden peptide term/);
  });

  it('assertPeptideCopyCompliant throws if Retatrutide loses its injectable-only disclosure', () => {
    const tampered = {
      ...PRACTITIONER_PEPTIDE_GUIDANCE,
      items: PRACTITIONER_PEPTIDE_GUIDANCE.items.map((i) =>
        i.id === 'retatrutide'
          ? { ...i, note: 'Retatrutide is investigational.', routeTag: 'Reference' }
          : i,
      ),
      disclaimer: 'Informational only.',
      intro: 'Educational reference.',
    };
    expect(() => assertPeptideCopyCompliant(tampered)).toThrow(/injectable-only/);
  });

  it('contains no em-dashes or en-dashes in shipped copy (project discipline)', () => {
    const haystack = flattenGuidanceCopy(PRACTITIONER_PEPTIDE_GUIDANCE);
    expect(haystack).not.toContain('—'); // em-dash
    expect(haystack).not.toContain('–'); // en-dash
  });
});
