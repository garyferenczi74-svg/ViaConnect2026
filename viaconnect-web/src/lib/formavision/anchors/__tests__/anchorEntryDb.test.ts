// Task 211b-W3d - TDD tests for the anchor ENTRY write path (anchorEntryDb.ts).
//
// Contract under test (from the task brief):
//   1. Tape entry writes the right anchor shape + consent (source 'tape',
//      stated_reliability 'medium', consent_type 'tape_anchor').
//   2. DEXA entry writes source 'dexa', stated_reliability 'high',
//      consent_type 'dexa_anchor' (both the region and the weight-only row).
//   3. Unit conversion inch -> cm (and lbs -> kg) is exact, never a
//      fabricated/rounded-to-a-different-number substitute.
//   4. Fail-open on write error: never throws, resolves false, logs via
//      safeLog.warn.
//   5. No fabricated/auto-filled value: the stored value_cm / weight_kg is
//      always exactly what the caller passed in (converted, not invented).
//   6. Own-row: user_id on every inserted row is the caller's own id.
//   7. Consent write FIRST, then the anchor write; a consent failure does not
//      block the anchor write (degrades to consent_ledger_id: null).
//
// A fake SupabaseClient is constructed by hand (matching the
// personalPrecisionDb.ts / cycleContextDb.ts pattern of injecting the client
// as a parameter, not importing createClient()), so no vi.mock of the
// Supabase module is needed. safe-log IS mocked (vi.mock, hoisted before the
// import) so the fail-open log calls can be asserted, matching the pattern
// src/lib/formavision/__tests__/resilience.test.ts already established.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// I6: fusionTelemetry is mocked so the emitAnchorAdopted wiring can be
// asserted without a real Supabase round trip (emitAnchorAdopted itself is
// exercised end-to-end by fusionTelemetry.test.ts).
vi.mock('@/lib/arnold/scanning/accuracy/fusion/fusionTelemetry', () => ({
  emitAnchorAdopted: vi.fn(() => Promise.resolve()),
}));

import { safeLog } from '@/lib/utils/safe-log';
import { emitAnchorAdopted } from '@/lib/arnold/scanning/accuracy/fusion/fusionTelemetry';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  inchesToCm,
  toStoredCm,
  lbsToKg,
  toStoredKg,
  writeAnchorFailOpen,
  writeTapeAnchorFailOpen,
  writeDexaRegionAnchorFailOpen,
  writeDexaWeightAnchorFailOpen,
  insertAnchorConsent,
  insertMeasurementAnchor,
} from '../anchorEntryDb';

// ---------------------------------------------------------------------------
// Fake Supabase client. Records every insert payload per table so tests can
// assert exact write shapes without a live DB.
// ---------------------------------------------------------------------------

interface RecordedInsert {
  table: string;
  payload: unknown;
}

interface FakeClientOptions {
  consentResult?: { data: { id: string } | null; error: { message: string } | null };
  anchorResult?: { error: { message: string } | null };
}

function makeFakeSupabase(opts: FakeClientOptions = {}) {
  const calls: RecordedInsert[] = [];
  const consentResult = opts.consentResult ?? { data: { id: 'consent-row-1' }, error: null };
  const anchorResult = opts.anchorResult ?? { error: null };

  const client = {
    from: (table: string) => {
      if (table === 'consent_ledger') {
        return {
          insert: (payload: unknown) => {
            calls.push({ table, payload });
            return {
              select: (_cols: string) => ({
                single: () => Promise.resolve(consentResult),
              }),
            };
          },
        };
      }
      if (table === 'user_measurement_anchors') {
        return {
          insert: (payload: unknown) => {
            calls.push({ table, payload });
            return Promise.resolve(anchorResult);
          },
        };
      }
      throw new Error(`Unexpected table in test: ${table}`);
    },
  };

  return { client: client as unknown as SupabaseClient, calls };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// Pure unit conversion
// ===========================================================================

describe('unit conversion: inch -> cm, lbs -> kg (pure, exact, never a substitute value)', () => {
  it('inchesToCm converts exactly (10in -> 25.4cm)', () => {
    expect(inchesToCm(10)).toBe(25.4);
  });

  it('inchesToCm rounds only to the column precision (2 decimals), not to a coarser number', () => {
    // 12.3456in * 2.54 = 31.357824 -> rounds to 31.36, not 31 or 31.4.
    expect(inchesToCm(12.3456)).toBe(31.36);
  });

  it('toStoredCm passes an inch value through inchesToCm', () => {
    expect(toStoredCm(10, 'in')).toBe(25.4);
  });

  it('toStoredCm leaves a cm value unconverted (only column-precision rounding)', () => {
    expect(toStoredCm(76.2, 'cm')).toBe(76.2);
  });

  it('lbsToKg converts exactly (150lbs -> 68.04kg)', () => {
    expect(lbsToKg(150)).toBe(68.04);
  });

  it('toStoredKg leaves a kg value unconverted', () => {
    expect(toStoredKg(68, 'kg')).toBe(68);
  });

  it('toStoredKg converts an lbs value', () => {
    expect(toStoredKg(150, 'lbs')).toBe(68.04);
  });
});

// ===========================================================================
// Tape entry: shape + consent
// ===========================================================================

describe('writeTapeAnchorFailOpen: writes the right anchor shape + consent', () => {
  it('writes consent_ledger FIRST (tape_anchor, granted) then user_measurement_anchors (source tape, medium)', async () => {
    const { client, calls } = makeFakeSupabase();
    const ok = await writeTapeAnchorFailOpen(client, {
      userId: 'user-1',
      region: 'waist_natural',
      value: 30,
      unit: 'in',
      takenAt: '2026-07-13T12:00:00.000Z',
    });

    expect(ok).toBe(true);
    expect(calls.map((c) => c.table)).toEqual(['consent_ledger', 'user_measurement_anchors']);

    const consentPayload = calls[0].payload as Record<string, unknown>;
    expect(consentPayload).toMatchObject({
      user_id: 'user-1',
      consent_type: 'tape_anchor',
      granted: true,
      revoked_at: null,
    });

    const anchorPayload = calls[1].payload as Record<string, unknown>;
    expect(anchorPayload).toMatchObject({
      user_id: 'user-1',
      source: 'tape',
      region: 'waist_natural',
      value_cm: 76.2, // 30in * 2.54, exact
      weight_kg: null,
      stated_reliability: 'medium',
      taken_at: '2026-07-13T12:00:00.000Z',
      consent_ledger_id: 'consent-row-1',
    });
  });

  it('converts inches to the stored cm value, not a fabricated round number', async () => {
    const { client, calls } = makeFakeSupabase();
    await writeTapeAnchorFailOpen(client, {
      userId: 'user-1',
      region: 'neck',
      value: 14.5,
      unit: 'in',
      takenAt: '2026-07-13T12:00:00.000Z',
    });
    const anchorPayload = calls[1].payload as Record<string, unknown>;
    expect(anchorPayload.value_cm).toBe(36.83); // 14.5 * 2.54
  });

  it('a cm entry is stored as entered (no unit conversion applied)', async () => {
    const { client, calls } = makeFakeSupabase();
    await writeTapeAnchorFailOpen(client, {
      userId: 'user-1',
      region: 'hip',
      value: 95.5,
      unit: 'cm',
      takenAt: '2026-07-13T12:00:00.000Z',
    });
    const anchorPayload = calls[1].payload as Record<string, unknown>;
    expect(anchorPayload.value_cm).toBe(95.5);
  });
});

// ===========================================================================
// DEXA entry: source 'dexa', reliability 'high'
// ===========================================================================

describe('writeDexaRegionAnchorFailOpen / writeDexaWeightAnchorFailOpen: source dexa, reliability high', () => {
  it('a region row: source dexa, stated_reliability high, consent_type dexa_anchor', async () => {
    const { client, calls } = makeFakeSupabase();
    const ok = await writeDexaRegionAnchorFailOpen(client, {
      userId: 'user-2',
      region: 'thigh',
      value: 22,
      unit: 'in',
      takenAt: '2026-07-13T09:00:00.000Z',
    });
    expect(ok).toBe(true);
    const consentPayload = calls[0].payload as Record<string, unknown>;
    expect(consentPayload).toMatchObject({ consent_type: 'dexa_anchor', granted: true });

    const anchorPayload = calls[1].payload as Record<string, unknown>;
    expect(anchorPayload).toMatchObject({
      user_id: 'user-2',
      source: 'dexa',
      region: 'thigh',
      value_cm: 55.88, // 22 * 2.54
      weight_kg: null,
      stated_reliability: 'high',
    });
  });

  it('a weight row: weight_kg set, region null, value_cm null (weight-only anchor shape)', async () => {
    const { client, calls } = makeFakeSupabase();
    const ok = await writeDexaWeightAnchorFailOpen(client, {
      userId: 'user-2',
      value: 150,
      unit: 'lbs',
      takenAt: '2026-07-13T09:00:00.000Z',
    });
    expect(ok).toBe(true);
    const anchorPayload = calls[1].payload as Record<string, unknown>;
    expect(anchorPayload).toMatchObject({
      user_id: 'user-2',
      source: 'dexa',
      region: null,
      value_cm: null,
      weight_kg: 68.04,
      stated_reliability: 'high',
    });
  });
});

// ===========================================================================
// Own-row: user_id is always the caller's own id
// ===========================================================================

describe('own-row: user_id on every inserted row is the caller\'s own id', () => {
  it('the consent row and the anchor row both carry the exact caller-supplied userId', async () => {
    const { client, calls } = makeFakeSupabase();
    await writeTapeAnchorFailOpen(client, {
      userId: 'own-row-user-42',
      region: 'calf',
      value: 15,
      unit: 'in',
      takenAt: '2026-07-13T00:00:00.000Z',
    });
    for (const call of calls) {
      expect((call.payload as Record<string, unknown>).user_id).toBe('own-row-user-42');
    }
  });
});

// ===========================================================================
// Fail-open: never throws, resolves false, logs
// ===========================================================================

describe('fail-open on write error: never throws, resolves false, logs via safeLog.warn', () => {
  it('an anchor insert error resolves false (not a throw)', async () => {
    const { client } = makeFakeSupabase({ anchorResult: { error: { message: 'connection reset' } } });
    await expect(
      writeTapeAnchorFailOpen(client, {
        userId: 'user-3',
        region: 'chest',
        value: 40,
        unit: 'in',
        takenAt: '2026-07-13T00:00:00.000Z',
      }),
    ).resolves.toBe(false);
  });

  it('logs the failure via safeLog.warn tagged with the anchor source', async () => {
    const { client } = makeFakeSupabase({ anchorResult: { error: { message: 'connection reset' } } });
    await writeTapeAnchorFailOpen(client, {
      userId: 'user-3',
      region: 'chest',
      value: 40,
      unit: 'in',
      takenAt: '2026-07-13T00:00:00.000Z',
    });
    expect(safeLog.warn).toHaveBeenCalledWith(
      'formavision.anchor-entry',
      expect.any(String),
      expect.objectContaining({ source: 'tape' }),
    );
  });

  it('a rejecting anchor insert also resolves false, never throws or hangs', async () => {
    const calls: RecordedInsert[] = [];
    const client = {
      from: (table: string) => {
        if (table === 'consent_ledger') {
          return {
            insert: (payload: unknown) => {
              calls.push({ table, payload });
              return { select: () => ({ single: () => Promise.resolve({ data: { id: 'c-1' }, error: null }) }) };
            },
          };
        }
        return {
          insert: (payload: unknown) => {
            calls.push({ table, payload });
            return Promise.reject(new Error('socket hang up'));
          },
        };
      },
    } as unknown as SupabaseClient;

    await expect(
      writeAnchorFailOpen(client, {
        userId: 'user-4',
        source: 'tape',
        region: 'bicep',
        valueCm: 30,
        weightKg: null,
        takenAt: '2026-07-13T00:00:00.000Z',
        consentType: 'tape_anchor',
        consentVersion: 'v1-2026-07',
      }),
    ).resolves.toBe(false);
  });

  it('a consent write failure does NOT block the anchor write (degrades to consent_ledger_id null)', async () => {
    const { client, calls } = makeFakeSupabase({
      consentResult: { data: null, error: { message: 'consent_ledger unavailable' } },
    });
    const ok = await writeTapeAnchorFailOpen(client, {
      userId: 'user-5',
      region: 'forearm',
      value: 10,
      unit: 'in',
      takenAt: '2026-07-13T00:00:00.000Z',
    });
    expect(ok).toBe(true);
    const anchorPayload = calls[1].payload as Record<string, unknown>;
    expect(anchorPayload.consent_ledger_id).toBeNull();
    expect(safeLog.warn).toHaveBeenCalledWith(
      'formavision.anchor-entry',
      expect.any(String),
      expect.objectContaining({ consentType: 'tape_anchor' }),
    );
  });
});

// ===========================================================================
// No fabricated / auto-filled value
// ===========================================================================

describe('no fabricated or auto-filled value: stored value is exactly what the caller passed', () => {
  it('value_cm is exactly the converted caller value across several inputs (no cherry-picked case)', async () => {
    const cases: Array<{ value: number; unit: 'in' | 'cm'; expected: number }> = [
      { value: 33, unit: 'in', expected: 83.82 },
      { value: 12, unit: 'in', expected: 30.48 },
      { value: 50, unit: 'cm', expected: 50 },
    ];
    for (const c of cases) {
      const { client, calls } = makeFakeSupabase();
      await writeTapeAnchorFailOpen(client, {
        userId: 'user-6',
        region: 'shoulder',
        value: c.value,
        unit: c.unit,
        takenAt: '2026-07-13T00:00:00.000Z',
      });
      const anchorPayload = calls[1].payload as Record<string, unknown>;
      expect(anchorPayload.value_cm).toBe(c.expected);
    }
  });

  it('a circumference anchor never carries a fabricated weight_kg value', async () => {
    const { client, calls } = makeFakeSupabase();
    await writeTapeAnchorFailOpen(client, {
      userId: 'user-6',
      region: 'waist_navel',
      value: 32,
      unit: 'in',
      takenAt: '2026-07-13T00:00:00.000Z',
    });
    const anchorPayload = calls[1].payload as Record<string, unknown>;
    expect(anchorPayload.weight_kg).toBeNull();
  });

  it('a weight-only anchor never carries a fabricated region or value_cm', async () => {
    const { client, calls } = makeFakeSupabase();
    await writeDexaWeightAnchorFailOpen(client, {
      userId: 'user-6',
      value: 70,
      unit: 'kg',
      takenAt: '2026-07-13T00:00:00.000Z',
    });
    const anchorPayload = calls[1].payload as Record<string, unknown>;
    expect(anchorPayload.region).toBeNull();
    expect(anchorPayload.value_cm).toBeNull();
  });
});

// ===========================================================================
// Low-level accessors exist and are wired as expected (sanity on the thin
// hand-written builder shape itself, matching personalPrecisionDb.ts's own
// accessor-level tests convention).
// ===========================================================================

describe('low-level accessors: insertAnchorConsent / insertMeasurementAnchor', () => {
  it('insertAnchorConsent resolves the inserted row id', async () => {
    const { client } = makeFakeSupabase({ consentResult: { data: { id: 'abc-123' }, error: null } });
    const result = await insertAnchorConsent(client, {
      user_id: 'user-7',
      consent_type: 'dexa_anchor',
      version: 'v1-2026-07',
      granted: true,
      granted_at: '2026-07-13T00:00:00.000Z',
      revoked_at: null,
    });
    expect(result.data?.id).toBe('abc-123');
    expect(result.error).toBeNull();
  });

  it('insertMeasurementAnchor resolves the write result', async () => {
    const { client } = makeFakeSupabase();
    const result = await insertMeasurementAnchor(client, {
      user_id: 'user-7',
      source: 'dexa',
      region: 'calf',
      value_cm: 40,
      weight_kg: null,
      stated_reliability: 'high',
      taken_at: '2026-07-13T00:00:00.000Z',
      consent_ledger_id: null,
    });
    expect(result.error).toBeNull();
  });
});

// ===========================================================================
// I6 (final whole-branch review): fusionTelemetry.emitAnchorAdopted fires
// after a SUCCESSFUL anchor write, for both tape and dexa, and carries no
// raw measurement (source only -- no PHI).
// ===========================================================================

describe('I6: emitAnchorAdopted fires on a successful anchor write, no PHI', () => {
  it('fires with source "tape" after a successful tape write', async () => {
    const { client } = makeFakeSupabase();
    await writeTapeAnchorFailOpen(client, {
      userId: 'user-8',
      region: 'waist_natural',
      value: 30,
      unit: 'in',
      takenAt: '2026-07-13T12:00:00.000Z',
    });
    expect(emitAnchorAdopted).toHaveBeenCalledWith('user-8', 'tape');
  });

  it('fires with source "dexa" after a successful DEXA region write', async () => {
    const { client } = makeFakeSupabase();
    await writeDexaRegionAnchorFailOpen(client, {
      userId: 'user-9',
      region: 'thigh',
      value: 22,
      unit: 'in',
      takenAt: '2026-07-13T09:00:00.000Z',
    });
    expect(emitAnchorAdopted).toHaveBeenCalledWith('user-9', 'dexa');
  });

  it('fires with source "dexa" after a successful DEXA weight-only write', async () => {
    const { client } = makeFakeSupabase();
    await writeDexaWeightAnchorFailOpen(client, {
      userId: 'user-10',
      value: 150,
      unit: 'lbs',
      takenAt: '2026-07-13T09:00:00.000Z',
    });
    expect(emitAnchorAdopted).toHaveBeenCalledWith('user-10', 'dexa');
  });

  it('does NOT fire when the anchor write itself fails', async () => {
    const { client } = makeFakeSupabase({ anchorResult: { error: { message: 'connection reset' } } });
    await writeTapeAnchorFailOpen(client, {
      userId: 'user-11',
      region: 'chest',
      value: 40,
      unit: 'in',
      takenAt: '2026-07-13T00:00:00.000Z',
    });
    expect(emitAnchorAdopted).not.toHaveBeenCalled();
  });

  it('every call carries only (userId, source) -- no cm/kg figure, no PHI', async () => {
    const { client } = makeFakeSupabase();
    await writeTapeAnchorFailOpen(client, {
      userId: 'user-12',
      region: 'hip',
      value: 95.5,
      unit: 'cm',
      takenAt: '2026-07-13T00:00:00.000Z',
    });
    const mockCalls = (emitAnchorAdopted as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(mockCalls.length).toBeGreaterThan(0);
    for (const args of mockCalls) {
      expect(args).toHaveLength(2);
      expect(typeof args[0]).toBe('string');
      expect(['scale', 'tape', 'dexa']).toContain(args[1]);
    }
  });
});
