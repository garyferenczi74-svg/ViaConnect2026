import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readResolvedWeightKg, readWeightKg } from '../readWeightKg';
import type { ClinicalMetricsClient } from '../clinicalBodyMetrics';

const GARY_CAQ = { height: '180', weight: '120', sex: 'male' } as const;

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

describe('readWeightKg CAQ-first Total Weight', () => {
  it('documents CAQ-first order and does not invent a default', () => {
    const reader = readFileSync(join(process.cwd(), 'src/lib/scan/readWeightKg.ts'), 'utf8');
    expect(reader).toMatch(/parseCaqWeightKg/);
    expect(reader).toMatch(/clinical_assessments\.weight_kg/);
    expect(reader).not.toMatch(/weightKg\s*=\s*70|weightKg\s*\?\?\s*70/);
  });

  it('prefers Gary CAQ 120 over clinical 90', async () => {
    const supabase = mockClient({
      clinical_assessments: { row: { weight_kg: 90 } },
      assessment_results: { row: { data: { ...GARY_CAQ } } },
    });
    const resolved = await readResolvedWeightKg(supabase, 'user-gary');
    expect(resolved).toEqual({ weightKg: 120, source: 'caq_demographics' });
    expect(await readWeightKg(supabase, 'user-gary')).toBe(120);
  });

  it('returns honest null when every source is UNKNOWN', async () => {
    const supabase = mockClient({
      clinical_assessments: { row: null },
      assessment_results: { row: { data: {} } },
    });
    expect(await readResolvedWeightKg(supabase, 'user-1')).toEqual({
      weightKg: null,
      source: null,
    });
  });
});
