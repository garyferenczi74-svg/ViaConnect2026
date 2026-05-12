// Tests for src/lib/scoring/sources/genetics-source.ts.
//
// Reads two tables: genex360_purchases and genetic_profiles.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGeneticsSource } from '../../sources/genetics-source';

interface MockState {
  purchase: Record<string, unknown> | null;
  profile: Record<string, unknown> | null;
  purchaseError?: unknown;
  profileError?: unknown;
}

function makeClient(state: MockState) {
  const from = vi.fn((table: string) => {
    if (table === 'genex360_purchases') {
      const maybeSingle = vi.fn().mockResolvedValue({
        data: state.purchase,
        error: state.purchaseError ?? null,
      });
      const limit = vi.fn().mockReturnValue({ maybeSingle });
      const order = vi.fn().mockReturnValue({ limit });
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });
      return { select };
    }
    if (table === 'genetic_profiles') {
      const maybeSingle = vi.fn().mockResolvedValue({
        data: state.profile,
        error: state.profileError ?? null,
      });
      const limit = vi.fn().mockReturnValue({ maybeSingle });
      const order = vi.fn().mockReturnValue({ limit });
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });
      return { select };
    }
    throw new Error(`Unexpected table ${table}`);
  });
  return { from };
}

describe('genetics-source', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty / not-present when neither table has a row', async () => {
    const client = makeClient({ purchase: null, profile: null });
    const result = await getGeneticsSource('u-1', client as never);
    expect(result.present).toBe(false);
    expect(result.processed_at).toBeNull();
    expect(result.panel).toBeNull();
    expect(result.source_specific?.lifecycle_status).toBe('genex360_purchase');
  });

  it('marks present = true when a genetic_profiles row has SNP statuses', async () => {
    const client = makeClient({
      purchase: null,
      profile: {
        mthfr_status: 'C677T heterozygous',
        comt_status: 'val/met',
        cyp2d6_status: 'normal',
        report_date: '2026-04-15',
      },
    });
    const result = await getGeneticsSource('u-1', client as never);
    expect(result.present).toBe(true);
    expect(result.source_specific?.lifecycle_status).toBe('complete');
  });

  it('marks present = true when test_results_delivered_at is set on purchase', async () => {
    const client = makeClient({
      purchase: {
        product_id: 'fc-genex360',
        test_results_delivered_at: '2026-04-20T10:00:00Z',
        lifecycle_status: 'delivered',
      },
      profile: null,
    });
    const result = await getGeneticsSource('u-1', client as never);
    expect(result.present).toBe(true);
    expect(result.panel).toBe('genex360_v1');
  });

  it('picks the more recent of profile.report_date vs purchase.test_results_delivered_at', async () => {
    const client = makeClient({
      purchase: {
        product_id: 'fc-genex360',
        test_results_delivered_at: '2026-04-20T10:00:00Z',
        lifecycle_status: 'delivered',
      },
      profile: {
        mthfr_status: 'wild',
        comt_status: 'wild',
        cyp2d6_status: 'wild',
        report_date: '2026-05-01',
      },
    });
    const result = await getGeneticsSource('u-1', client as never);
    // Latest is report_date 2026-05-01 vs purchase delivered 2026-04-20.
    expect(result.processed_at?.startsWith('2026-05-01')).toBe(true);
  });

  it('lifecycle_status = genex360_status when purchase exists but no results yet', async () => {
    const client = makeClient({
      purchase: {
        product_id: 'fc-genex360',
        test_results_delivered_at: null,
        lifecycle_status: 'sample_received',
      },
      profile: null,
    });
    const result = await getGeneticsSource('u-1', client as never);
    expect(result.present).toBe(false);
    expect(result.source_specific?.lifecycle_status).toBe('genex360_status');
  });
});
