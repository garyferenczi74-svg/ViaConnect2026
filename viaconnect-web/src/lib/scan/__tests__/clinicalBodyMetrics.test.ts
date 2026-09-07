import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  INCHES_TO_CM,
  asDemographicsRecord,
  backfillClinicalHeightIfMissing,
  heightInchesToCm,
  parseBiologicalSex,
  parseCaqHeightCm,
  parseCaqWeightKg,
  parsePositiveFinite,
  persistEnteredHeightCm,
  resolveHeightCm,
  upsertClinicalBodyMetrics,
  writeThroughCaqDemographicsToClinical,
  type ClinicalMetricsClient,
} from '../clinicalBodyMetrics';

/** Gary LIVE CAQ 2026-04-02 — real stored values, not a default. */
const GARY_CAQ = { height: '180', weight: '120', sex: 'male' } as const;
const GARY_HEIGHT_IN = '70.90';
const GARY_HEIGHT_IN_AS_CM = 70.9 * INCHES_TO_CM;

function src(rel: string): string {
  return readFileSync(join(process.cwd(), rel), 'utf8');
}

type TableSpec = {
  row?: unknown;
  error?: { message: string } | null;
  upsertError?: { message: string } | null;
};

function mockClient(tables: Record<string, TableSpec>): {
  client: ClinicalMetricsClient;
  upserts: Array<{ table: string; payload: Record<string, unknown> }>;
} {
  const upserts: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const client = {
    from(table: string) {
      const spec = tables[table] ?? {};
      const builder: Record<string, unknown> = {};
      const self = (): Record<string, unknown> => builder;
      builder.select = self;
      builder.eq = self;
      builder.order = self;
      builder.limit = self;
      builder.maybeSingle = () =>
        Promise.resolve({ data: spec.row ?? null, error: spec.error ?? null });
      builder.upsert = (payload: Record<string, unknown>) => {
        upserts.push({ table, payload });
        return Promise.resolve({ data: payload, error: spec.upsertError ?? null });
      };
      return builder;
    },
  };
  return { client: client as unknown as ClinicalMetricsClient, upserts };
}

describe('units lock: CAQ cm vs body_goals inches', () => {
  it('parses CAQ demographics.height "180" as centimeters, not inches', () => {
    expect(parseCaqHeightCm({ height: '180' })).toBe(180);
    expect(parseCaqHeightCm({ ...GARY_CAQ })).toBe(180);
    expect(parseCaqHeightCm({ height: '180' })).not.toBeCloseTo(180 * INCHES_TO_CM, 3);
    expect(parseCaqWeightKg({ ...GARY_CAQ })).toBe(120);
    expect(parseBiologicalSex(GARY_CAQ.sex)).toBe('male');
  });

  it('converts body_goals.height_in "70.90" inches → ~180.086 cm, never as cm', () => {
    expect(heightInchesToCm(GARY_HEIGHT_IN)).toBeCloseTo(180.086, 3);
    expect(heightInchesToCm(GARY_HEIGHT_IN)).toBeCloseTo(GARY_HEIGHT_IN_AS_CM, 5);
    expect(heightInchesToCm('70.90')).not.toBe(70.9);
    expect(heightInchesToCm('')).toBeNull();
    expect(heightInchesToCm('abc')).toBeNull();
    expect(heightInchesToCm(Number.NaN)).toBeNull();
  });

  it('keeps parser roles from swapping units', () => {
    const helpers = src('src/lib/scan/clinicalBodyMetrics.ts');
    const parseFn = helpers.slice(
      helpers.indexOf('export function parseCaqHeightCm'),
      helpers.indexOf('export function parseCaqWeightKg'),
    );
    const inchesFn = helpers.slice(
      helpers.indexOf('export function heightInchesToCm'),
      helpers.indexOf('function emptyWrite'),
    );
    expect(parseFn).not.toMatch(/INCHES_TO_CM|heightInchesToCm|\*\s*2\.54/);
    expect(inchesFn).toMatch(/INCHES_TO_CM/);
    expect(helpers).toMatch(/readBodyGoalsHeightCm[\s\S]*heightInchesToCm\(row\?\.height_in\)/);
    expect(helpers).toMatch(/readCaqAssessmentHeightCm[\s\S]*parseCaqHeightCm\(/);
    expect(helpers).not.toMatch(/parseCaqHeightCm\(.*height_in/);
    expect(helpers).not.toMatch(/heightInchesToCm\(.*demographics\.height/);
  });
});

describe('parsePositiveFinite / CAQ demographics', () => {

  it('accepts height_cm / weight_kg keys used by mobile CAQWizard', () => {
    expect(parseCaqHeightCm({ height_cm: 182 })).toBe(182);
    expect(parseCaqWeightKg({ weight_kg: '81.5' })).toBe(81.5);
  });

  it('rejects empty, zero, negative, and non-numeric values', () => {
    expect(parsePositiveFinite('')).toBeNull();
    expect(parsePositiveFinite('   ')).toBeNull();
    expect(parsePositiveFinite('0')).toBeNull();
    expect(parsePositiveFinite(0)).toBeNull();
    expect(parsePositiveFinite(-1)).toBeNull();
    expect(parsePositiveFinite('abc')).toBeNull();
    expect(parsePositiveFinite(Number.NaN)).toBeNull();
    expect(parsePositiveFinite(Number.POSITIVE_INFINITY)).toBeNull();
    expect(parsePositiveFinite(null)).toBeNull();
    expect(parsePositiveFinite(undefined)).toBeNull();
    expect(parseCaqHeightCm({})).toBeNull();
    expect(parseCaqHeightCm(null)).toBeNull();
    expect(asDemographicsRecord('180')).toBeNull();
  });

  it('never fabricates 170 when sources are empty', () => {
    expect(parseCaqHeightCm({})).not.toBe(170);
    expect(parsePositiveFinite(undefined)).not.toBe(170);
    expect(heightInchesToCm(null)).toBeNull();
  });

  it('converts body_goals.height_in without inventing', () => {
    expect(heightInchesToCm(GARY_HEIGHT_IN)).toBeCloseTo(180.086, 3);
    expect(heightInchesToCm('70.90')).toBeCloseTo(180.086, 3);
    expect(heightInchesToCm(0)).toBeNull();
  });
});

describe('upsertClinicalBodyMetrics / write-through', () => {
  it('upserts finite CAQ height and weight only', async () => {
    const { client, upserts } = mockClient({ clinical_assessments: {} });
    const result = await writeThroughCaqDemographicsToClinical(client, 'user-gary', {
      ...GARY_CAQ,
    });
    expect(result.ok).toBe(true);
    expect(result.wrote).toEqual({ heightCm: 180, weightKg: 120 });
    expect(upserts).toHaveLength(1);
    expect(upserts[0]?.table).toBe('clinical_assessments');
    expect(upserts[0]?.payload.user_id).toBe('user-gary');
    expect(upserts[0]?.payload.height_cm).toBe(180);
    expect(upserts[0]?.payload.height_cm).not.toBeCloseTo(180 * INCHES_TO_CM, 3);
    expect(upserts[0]?.payload.weight_kg).toBe(120);
    expect(upserts[0]?.payload.biological_sex).toBe('male');
    expect(upserts[0]?.payload.height_cm).not.toBe(170);
  });

  it('does not upsert when every metric is unknown', async () => {
    const { client, upserts } = mockClient({ clinical_assessments: {} });
    const result = await upsertClinicalBodyMetrics(client, 'user-1', {
      heightCm: null,
      weightKg: 0,
    });
    expect(result.ok).toBe(false);
    expect(result.wrote).toEqual({ heightCm: null, weightKg: null });
    expect(upserts).toHaveLength(0);
  });

  it('persists a user-entered height without a 170 default', async () => {
    const { client, upserts } = mockClient({ clinical_assessments: {} });
    const skipped = await persistEnteredHeightCm(client, 'user-1', 0);
    expect(skipped.ok).toBe(false);
    expect(upserts).toHaveLength(0);

    const wrote = await persistEnteredHeightCm(client, 'user-1', 178);
    expect(wrote.ok).toBe(true);
    expect(wrote.wrote.heightCm).toBe(178);
    expect(upserts[0]?.payload.height_cm).toBe(178);
    expect(JSON.stringify(upserts[0]?.payload)).not.toMatch(/"height_cm":170/);
  });
});

describe('resolveHeightCm CAQ-first order', () => {
  it('returns caq_demographics when clinical is also present', async () => {
    const { client } = mockClient({
      clinical_assessments: { row: { height_cm: 178 } },
      body_goals: { row: { height_in: GARY_HEIGHT_IN } },
      assessment_results: { row: { data: { ...GARY_CAQ } } },
    });
    const resolved = await resolveHeightCm(client, 'user-gary');
    expect(resolved).toEqual({ heightCm: 180, source: 'caq_demographics' });
  });

  it('falls back to clinical, then body_goals, and never invents', async () => {
    const clinicalOnly = mockClient({
      clinical_assessments: { row: { height_cm: 178 } },
      body_goals: { row: { height_in: GARY_HEIGHT_IN } },
      assessment_results: { row: { data: {} } },
    });
    expect(await resolveHeightCm(clinicalOnly.client, 'user-gary')).toEqual({
      heightCm: 178,
      source: 'clinical_assessment',
    });

    const goalsOnly = mockClient({
      clinical_assessments: { row: null },
      body_goals: { row: { height_in: GARY_HEIGHT_IN } },
      assessment_results: { row: { data: {} } },
    });
    const fromGoals = await resolveHeightCm(goalsOnly.client, 'user-gary');
    expect(fromGoals.source).toBe('body_goals');
    expect(fromGoals.heightCm).toBeCloseTo(180.086, 3);

    const empty = mockClient({
      clinical_assessments: { row: null },
      body_goals: { row: null },
      assessment_results: { row: { data: {} } },
    });
    expect(await resolveHeightCm(empty.client, 'user-1')).toEqual({
      heightCm: null,
      source: null,
    });
  });
});

describe('backfillClinicalHeightIfMissing', () => {
  it('leaves an existing clinical height untouched', async () => {
    const { client, upserts } = mockClient({
      clinical_assessments: { row: { height_cm: 182 } },
    });
    const result = await backfillClinicalHeightIfMissing(client, 'user-1');
    expect(result.ok).toBe(true);
    expect(result.wrote.heightCm).toBe(182);
    expect(upserts).toHaveLength(0);
  });

  it('copies Gary CAQ 180 when clinical is empty, even if body_goals 70.90 exists', async () => {
    const { client, upserts } = mockClient({
      clinical_assessments: { row: null },
      body_goals: { row: { height_in: GARY_HEIGHT_IN } },
      assessment_results: { row: { data: { ...GARY_CAQ } } },
    });
    const result = await backfillClinicalHeightIfMissing(client, 'user-gary');
    expect(result.ok).toBe(true);
    expect(result.wrote.heightCm).toBe(180);
    expect(upserts[0]?.payload.height_cm).toBe(180);
    expect(upserts[0]?.payload.height_cm).not.toBeCloseTo(180.086, 3);
  });

  it('copies body_goals.height_in when CAQ is also empty', async () => {
    const { client, upserts } = mockClient({
      clinical_assessments: { row: null },
      body_goals: { row: { height_in: GARY_HEIGHT_IN } },
      assessment_results: { row: { data: {} } },
    });
    const result = await backfillClinicalHeightIfMissing(client, 'user-gary');
    expect(result.ok).toBe(true);
    expect(result.wrote.heightCm).toBeCloseTo(180.086, 3);
    expect(upserts).toHaveLength(1);
  });

  it('writes nothing when every source is UNKNOWN', async () => {
    const { client, upserts } = mockClient({
      clinical_assessments: { row: null },
      body_goals: { row: null },
      assessment_results: { row: { data: {} } },
    });
    const result = await backfillClinicalHeightIfMissing(client, 'user-1');
    expect(result.ok).toBe(false);
    expect(result.wrote.heightCm).toBeNull();
    expect(upserts).toHaveLength(0);
  });
});
