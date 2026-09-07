import { describe, expect, it } from 'vitest';
import {
  asDemographicsRecord,
  backfillClinicalHeightIfMissing,
  heightInchesToCm,
  parseBiologicalSex,
  parseCaqHeightCm,
  parseCaqWeightKg,
  parsePositiveFinite,
  persistEnteredHeightCm,
  upsertClinicalBodyMetrics,
  writeThroughCaqDemographicsToClinical,
  type ClinicalMetricsClient,
} from '../clinicalBodyMetrics';

/** Gary LIVE CAQ 2026-04-02 — real stored values, not a default. */
const GARY_CAQ = { height: '180', weight: '120', sex: 'male' } as const;
const GARY_HEIGHT_IN = 70.9;

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

describe('parsePositiveFinite / CAQ demographics', () => {
  it('parses Gary CAQ string height and weight without inventing', () => {
    expect(parseCaqHeightCm({ ...GARY_CAQ })).toBe(180);
    expect(parseCaqWeightKg({ ...GARY_CAQ })).toBe(120);
    expect(parseBiologicalSex(GARY_CAQ.sex)).toBe('male');
  });

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

  it('copies Gary CAQ 180 when clinical is empty', async () => {
    const { client, upserts } = mockClient({
      clinical_assessments: { row: null },
      body_goals: { row: null },
      assessment_results: { row: { data: { ...GARY_CAQ } } },
    });
    const result = await backfillClinicalHeightIfMissing(client, 'user-gary');
    expect(result.ok).toBe(true);
    expect(result.wrote.heightCm).toBe(180);
    expect(upserts[0]?.payload.height_cm).toBe(180);
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
