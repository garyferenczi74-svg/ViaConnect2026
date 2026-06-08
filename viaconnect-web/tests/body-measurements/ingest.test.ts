/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { ingestMeasurementsFromScan } from '@/lib/body-measurements/ingestScanMeasurements';

type RouterCfg = {
  tier?: string;
  entitlementThrows?: boolean;
  existingCirc?: { id: string } | null;
  scanRow?: Record<string, unknown> | null;
  circInsertError?: { code?: string } | null;
};

// Minimal chainable + thenable Supabase stub that routes results by table + op.
function makeSupabase(cfg: RouterCfg) {
  const captured: { entry?: any; circ?: any } = {};
  const router = (ctx: any) => {
    if (ctx.table === 'memberships') {
      if (cfg.entitlementThrows) throw new Error('entitlement service down');
      return { data: [{ tier_id: cfg.tier ?? 'free', membership_tiers: { tier_level: 0 } }] };
    }
    if (ctx.table === 'body_tracker_circumference' && ctx.op === 'select') {
      return { data: cfg.existingCirc ?? null };
    }
    if (ctx.table === 'body_scan_measurements') {
      return { data: cfg.scanRow ?? null };
    }
    if (ctx.table === 'body_tracker_entries' && ctx.op === 'insert') {
      captured.entry = ctx.insertRow;
      return { data: { id: 'entry-1' }, error: null };
    }
    if (ctx.table === 'body_tracker_circumference' && ctx.op === 'insert') {
      captured.circ = ctx.insertRow;
      return { error: cfg.circInsertError ?? null };
    }
    return { data: null };
  };
  const from = (table: string) => {
    const ctx: any = { table, op: 'select', insertRow: null };
    const run = () => Promise.resolve().then(() => router(ctx));
    const b: any = {
      select: () => b,
      eq: () => b,
      in: () => b,
      order: () => b,
      limit: () => b,
      maybeSingle: () => run(),
      single: () => run(),
      insert: (row: any) => {
        ctx.op = 'insert';
        ctx.insertRow = row;
        return b;
      },
      then: (resolve: any, reject: any) => run().then(resolve, reject),
    };
    return b;
  };
  return { client: { from }, captured };
}

const SCAN_ROW = {
  scan_date: '2026-06-08',
  neck_circ_cm: 38,
  shoulder_circ_cm: 120,
  chest_circ_cm: 100,
  waist_natural_circ_cm: 85,
  hip_circ_cm: 98,
  left_bicep_circ_cm: 33,
  right_bicep_circ_cm: 33,
  left_forearm_circ_cm: 27,
  right_forearm_circ_cm: 27,
  left_thigh_circ_cm: 56,
  right_thigh_circ_cm: 56,
  left_calf_circ_cm: 38,
  right_calf_circ_cm: 38,
  under_bust_circ_cm: 90,
};

describe('ingestMeasurementsFromScan', () => {
  it('imports a Platinum scan, mapping girths to cm circumference columns, scan-linked (criterion 2)', async () => {
    const { client, captured } = makeSupabase({ tier: 'platinum', scanRow: SCAN_ROW, existingCirc: null });
    const res = await ingestMeasurementsFromScan({ scanId: 'scan-1', userId: 'u1' }, client);
    expect(res).toEqual({ ok: true, status: 'imported', entryId: 'entry-1', siteCount: 13 });
    expect(captured.entry.source).toBe('scan');
    expect(captured.entry.entry_date).toBe('2026-06-08');
    expect(captured.circ.source).toBe('scan');
    expect(captured.circ.scan_id).toBe('scan-1');
    expect(captured.circ.entry_unit).toBe('cm');
    expect(captured.circ.entry_id).toBe('entry-1');
    expect(captured.circ.waist).toBe(85);
    expect(captured.circ.hip).toBe(98);
    expect(captured.circ).not.toHaveProperty('under_bust');
  });

  it('is idempotent: an already-linked scan does not write again (criterion 5)', async () => {
    const { client, captured } = makeSupabase({ tier: 'platinum', scanRow: SCAN_ROW, existingCirc: { id: 'c-1' } });
    const res = await ingestMeasurementsFromScan({ scanId: 'scan-1', userId: 'u1' }, client);
    expect(res).toEqual({ ok: true, status: 'already_imported', entryId: null, siteCount: 0 });
    expect(captured.entry).toBeUndefined();
    expect(captured.circ).toBeUndefined();
  });

  it('does not write for a non-Platinum member (criterion 3)', async () => {
    const { client, captured } = makeSupabase({ tier: 'gold', scanRow: SCAN_ROW });
    const res = await ingestMeasurementsFromScan({ scanId: 'scan-1', userId: 'u1' }, client);
    expect(res).toEqual({ ok: false, reason: 'not_platinum' });
    expect(captured.entry).toBeUndefined();
    expect(captured.circ).toBeUndefined();
  });

  it('imports for Platinum+ Family (tier level 3 also counts)', async () => {
    const { client } = makeSupabase({ tier: 'platinum_family', scanRow: SCAN_ROW });
    const res = await ingestMeasurementsFromScan({ scanId: 'scan-2', userId: 'u1' }, client);
    expect(res.ok).toBe(true);
  });

  it('fails closed when the entitlement lookup throws (criterion 4)', async () => {
    const { client, captured } = makeSupabase({ entitlementThrows: true, scanRow: SCAN_ROW });
    const res = await ingestMeasurementsFromScan({ scanId: 'scan-1', userId: 'u1' }, client);
    expect(res).toEqual({ ok: false, reason: 'entitlement_error' });
    expect(captured.entry).toBeUndefined();
    expect(captured.circ).toBeUndefined();
  });

  it('reports no_scan_data when the scan has no measurements row', async () => {
    const { client } = makeSupabase({ tier: 'platinum', scanRow: null });
    const res = await ingestMeasurementsFromScan({ scanId: 'scan-x', userId: 'u1' }, client);
    expect(res).toEqual({ ok: false, reason: 'no_scan_data' });
  });

  it('treats a 23505 unique race as already imported', async () => {
    const { client } = makeSupabase({ tier: 'platinum', scanRow: SCAN_ROW, circInsertError: { code: '23505' } });
    const res = await ingestMeasurementsFromScan({ scanId: 'scan-1', userId: 'u1' }, client);
    expect(res).toEqual({ ok: true, status: 'already_imported', entryId: null, siteCount: 0 });
  });
});
