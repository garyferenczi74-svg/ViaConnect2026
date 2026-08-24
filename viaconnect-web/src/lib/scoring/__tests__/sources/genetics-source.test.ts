// Prompt 214d Gap 2: genetics score contribution reads Elysium finished outputs.
// Brief 16: present / 96% rung follows hub SSOT, not mapped_count.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getGeneticsSource,
  GENETICS_SCORE_TABLES,
  FORBIDDEN_SCORE_GENETICS_TABLES,
} from '../../sources/genetics-source';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface MockState {
  coverage: Record<string, unknown> | null;
  catalog: Array<Record<string, unknown>>;
  variantRows?: Array<{ is_sample?: boolean }>;
  uploads?: Array<{ source_filename?: string | null }>;
  kits?: Array<{ status?: string }>;
}

function thenable<T>(value: T) {
  const result = {
    data: value,
    error: null,
  };
  return Object.assign(Promise.resolve(result), result);
}

function makeClient(state: MockState) {
  const from = vi.fn((table: string) => {
    if (table === 'user_variants') {
      const eq = vi.fn().mockReturnValue(thenable(state.variantRows ?? []));
      const select = vi.fn().mockReturnValue({ eq });
      return { select };
    }
    if (table === 'dna_uploads') {
      const eq = vi.fn().mockReturnValue(thenable(state.uploads ?? []));
      const select = vi.fn().mockReturnValue({ eq });
      return { select };
    }
    if (table === 'kit_registrations') {
      const secondEq = vi.fn().mockReturnValue(thenable(state.kits ?? []));
      const eq = vi.fn().mockReturnValue({ eq: secondEq });
      const select = vi.fn().mockReturnValue({ eq });
      return { select };
    }
    if (table === 'elysium_upload_coverage') {
      const maybeSingle = vi.fn().mockResolvedValue({
        data: state.coverage,
        error: null,
      });
      const limit = vi.fn().mockReturnValue({ maybeSingle });
      const order = vi.fn().mockReturnValue({ limit });
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });
      return { select };
    }
    if (table === 'elysium_variant_interpretations') {
      const limit = vi.fn().mockResolvedValue({
        data: state.catalog,
        error: null,
      });
      const order = vi.fn().mockReturnValue({ limit });
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });
      return { select };
    }
    throw new Error(`Forbidden raw genetics table in score path: ${table}`);
  });
  return { from };
}

describe('genetics-source (214d Elysium-only + Brief 16 SSOT)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('absent when no Elysium coverage and no hub SNPs (no score delta)', async () => {
    const client = makeClient({ coverage: null, catalog: [] });
    const result = await getGeneticsSource('u-1', client as never);
    expect(result.present).toBe(false);
    expect(result.source_specific?.contribution).toBe('none');
    expect(result.source_specific?.lifecycle_status).toBe('genex360_purchase');
  });

  it('pending contribution when coverage exists but mapped_count is 0', async () => {
    const client = makeClient({
      coverage: {
        mapped_count: 0,
        pending_count: 3,
        unknown_count: 1,
        created_at: '2026-08-12T00:00:00Z',
      },
      catalog: [{ rsid: 'rs1801133', interpretation_status: 'interpreted' }],
    });
    const result = await getGeneticsSource('u-1', client as never);
    expect(result.present).toBe(false);
    expect(result.source_specific?.contribution).toBe('pending');
    expect(result.source_specific?.lifecycle_status).toBe('pending_interpretation');
  });

  it('keeps Elysium contribution active without claiming hub upload', async () => {
    const client = makeClient({
      coverage: {
        mapped_count: 4,
        pending_count: 1,
        unknown_count: 0,
        created_at: '2026-08-12T12:00:00Z',
      },
      catalog: [
        { rsid: 'rs1801133', interpretation_status: 'interpreted' },
        { rsid: 'rs4680', interpretation_status: 'interpreted' },
      ],
    });
    const result = await getGeneticsSource('u-1', client as never);
    expect(result.present).toBe(false);
    expect(result.panel).toBeNull();
    expect(result.source_specific?.contribution).toBe('active');
    expect(result.source_specific?.interpreted_count).toBe(4);
  });

  it('12 non-sample hub SNPs are present even with no Elysium mapped_count', async () => {
    const client = makeClient({
      coverage: null,
      catalog: [],
      variantRows: Array.from({ length: 12 }, () => ({ is_sample: false })),
    });
    const result = await getGeneticsSource('u-1', client as never);
    expect(result.present).toBe(true);
    expect(result.panel).toBe('genex360_v1');
    expect(result.source_specific?.contribution).toBe('none');
  });

  it('12 sample hub SNPs are not present', async () => {
    const client = makeClient({
      coverage: {
        mapped_count: 4,
        pending_count: 0,
        unknown_count: 0,
        created_at: '2026-08-12T12:00:00Z',
      },
      catalog: [{ rsid: 'rs1801133', interpretation_status: 'interpreted' }],
      variantRows: Array.from({ length: 12 }, () => ({ is_sample: true })),
    });
    const result = await getGeneticsSource('u-1', client as never);
    expect(result.present).toBe(false);
  });

  it('does not treat raw genetic_profiles tables as allowed score sources', () => {
    expect(GENETICS_SCORE_TABLES).toContain('elysium_variant_interpretations');
    expect(GENETICS_SCORE_TABLES).toContain('elysium_upload_coverage');
    expect(FORBIDDEN_SCORE_GENETICS_TABLES).toContain('genetic_profiles');
    expect(FORBIDDEN_SCORE_GENETICS_TABLES).toContain('genex360_purchases');

    const src = readFileSync(
      join(process.cwd(), 'src/lib/scoring/sources/genetics-source.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/from\(['"]genetic_profiles['"]\)/);
    expect(src).not.toMatch(/from\(['"]genex360_purchases['"]\)/);
    expect(src).toMatch(/elysium_variant_interpretations/);
    expect(src).toMatch(/elysium_upload_coverage/);
    expect(src).toMatch(/loadGeneticsUploadFacts/);
  });
});
