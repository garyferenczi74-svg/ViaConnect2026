import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readHeightCm, readResolvedHeightCm } from '../readHeightCm';
import type { ClinicalMetricsClient } from '../clinicalBodyMetrics';

/** Gary LIVE CAQ 2026-04-02 — real stored values, not a default. */
const GARY_CAQ = { height: '180', weight: '120', sex: 'male' } as const;
const GARY_HEIGHT_IN = '70.90';

type TableSpec = {
  row?: unknown;
  error?: { message: string } | null;
};

function mockClient(tables: Record<string, TableSpec>): ClinicalMetricsClient {
  return {
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
      return builder;
    },
  } as unknown as ClinicalMetricsClient;
}

describe('readHeightCm units lock comments', () => {
  it('documents cm vs inches and does not invent a default', () => {
    const reader = readFileSync(join(process.cwd(), 'src/lib/scan/readHeightCm.ts'), 'utf8');
    expect(reader).toMatch(/already cm/);
    expect(reader).toMatch(/cm string; never inches/);
    expect(reader).toMatch(/inches → cm/);
    expect(reader.indexOf('cm string; never inches')).toBeLessThan(
      reader.indexOf('inches → cm'),
    );
    expect(reader).not.toMatch(/heightCm\s*=\s*170|heightCm\s*\?\?\s*170/);
  });
});

describe('readHeightCm ordered fallback', () => {
  it('prefers clinical_assessments.height_cm over CAQ and body_goals', async () => {
    const supabase = mockClient({
      clinical_assessments: { row: { height_cm: 178 } },
      body_goals: { row: { height_in: GARY_HEIGHT_IN } },
      assessment_results: { row: { data: { ...GARY_CAQ } } },
    });
    const resolved = await readResolvedHeightCm(supabase, 'user-gary');
    expect(resolved).toEqual({ heightCm: 178, source: 'clinical_assessment' });
    expect(await readHeightCm(supabase, 'user-gary')).toBe(178);
  });

  it('prefers CAQ "180" over body_goals "70.90" when clinical is empty', async () => {
    const supabase = mockClient({
      clinical_assessments: { row: { height_cm: null } },
      body_goals: { row: { height_in: GARY_HEIGHT_IN } },
      assessment_results: { row: { data: { ...GARY_CAQ } } },
    });
    const resolved = await readResolvedHeightCm(supabase, 'user-gary');
    expect(resolved).toEqual({ heightCm: 180, source: 'caq_demographics' });
    expect(resolved.heightCm).not.toBeCloseTo(180.086, 3);
  });

  it('falls back to body_goals.height_in only when CAQ is absent', async () => {
    const supabase = mockClient({
      clinical_assessments: { row: null },
      body_goals: { row: { height_in: GARY_HEIGHT_IN } },
      assessment_results: { row: { data: {} } },
    });
    const resolved = await readResolvedHeightCm(supabase, 'user-gary');
    expect(resolved.source).toBe('body_goals');
    expect(resolved.heightCm).toBeCloseTo(180.086, 3);
    expect(resolved.heightCm).not.toBe(70.9);
  });

  it('returns UNKNOWN when every source is missing and never invents 170', async () => {
    const supabase = mockClient({
      clinical_assessments: { row: null },
      body_goals: { row: null },
      assessment_results: { row: { data: {} } },
    });
    const resolved = await readResolvedHeightCm(supabase, 'user-1');
    expect(resolved).toEqual({ heightCm: null, source: null });
    expect(await readHeightCm(supabase, 'user-1')).toBeNull();
  });

  it('treats non-positive clinical height as missing and continues fallback', async () => {
    const supabase = mockClient({
      clinical_assessments: { row: { height_cm: 0 } },
      body_goals: { row: null },
      assessment_results: { row: { data: { height: '180' } } },
    });
    const resolved = await readResolvedHeightCm(supabase, 'user-gary');
    expect(resolved).toEqual({ heightCm: 180, source: 'caq_demographics' });
  });

  it('fails open to the next source when clinical read errors', async () => {
    const supabase = mockClient({
      clinical_assessments: { error: { message: 'boom' } },
      body_goals: { row: null },
      assessment_results: { row: { data: { ...GARY_CAQ } } },
    });
    const resolved = await readResolvedHeightCm(supabase, 'user-gary');
    expect(resolved).toEqual({ heightCm: 180, source: 'caq_demographics' });
  });
});
