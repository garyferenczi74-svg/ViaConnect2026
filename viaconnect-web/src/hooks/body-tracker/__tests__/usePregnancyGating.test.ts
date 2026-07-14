/**
 * Task 211b-W4b review fix: TDD coverage for the two Criticals + the
 * stale-snapshot Important flagged in the W4b review (task-211b-W4b-review-report.md).
 *
 * Node env (no jsdom / renderHook available in this project -- see
 * useCompositionHistory.test.ts for the established pattern). We test the
 * exported pure/async helpers (resolvePregnancyGating, deriveCompositionGate,
 * writePregnancyStatus) directly against a mocked Supabase client, which
 * exercises the real query shapes and every branch the thin usePregnancyGating
 * hook wrapper delegates to.
 *
 * Contract under test:
 *   C1 (fail-closed gate): a read error forces compositionSuppressed true with
 *     non-pregnancy-implying copy; combined with loading via deriveCompositionGate,
 *     "pregnancy active OR loading OR read-error" all suppress, and the loading
 *     case shows a NEUTRAL "checking" copy, never the pregnancy-suppression copy.
 *   C2 (PHI-safe read-modify-write): a toggle preserves pre-existing
 *     meds/allergies/conditions/goals, changing only pregnancy_status; a
 *     FAILED base read never inserts (no empty-fields row).
 *   Important (stale-snapshot): the write reads the FRESHEST row immediately
 *     before writing, so a concurrent edit made after mount is preserved, not
 *     clobbered by a caller-held stale snapshot.
 */

import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  resolvePregnancyGating,
  deriveCompositionGate,
  writePregnancyStatus,
  PREGNANCY_READ_ERROR_SUPPRESSED_COPY,
  COMPOSITION_GATE_CHECKING_COPY,
} from '../usePregnancyGating';
import { getCompositionGating } from '@/lib/formavision/pregnancy/pregnancyMode';
import type { HealthContextRow } from '@/lib/formavision/pregnancy/pregnancyContextDb';

// ---------------------------------------------------------------------------
// Mock Supabase client matching the exact chain shapes
// readOwnLatestHealthContext / insertOwnHealthContext use.
// ---------------------------------------------------------------------------

interface ReadConfig {
  data?: HealthContextRow | null;
  error?: { message: string } | null;
  reject?: boolean;
}

function makeClient(read: ReadConfig, insertError: { message: string } | null = null) {
  const insertCalls: Array<Record<string, unknown>> = [];
  const client = {
    from(_table: string) {
      return {
        select(_cols: string) {
          return {
            eq(_col: string, _val: string) {
              return {
                order(_col2: string, _opts: { ascending: boolean }) {
                  return {
                    limit(_n: number) {
                      return {
                        maybeSingle() {
                          if (read.reject) return Promise.reject(new Error('network failure'));
                          return Promise.resolve({
                            data: read.data ?? null,
                            error: read.error ?? null,
                          });
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
        insert(values: Record<string, unknown>) {
          insertCalls.push(values);
          return Promise.resolve({ error: insertError });
        },
      };
    },
  };
  return { client: client as unknown as SupabaseClient, insertCalls };
}

function existingRow(over: Partial<HealthContextRow> = {}): HealthContextRow {
  return {
    demographics: { age: 34 },
    conditions: ['hypothyroidism'],
    medications: ['levothyroxine'],
    allergies: ['penicillin'],
    pregnancy_status: null,
    goals: ['lose fat'],
    ...over,
  };
}

// ---------------------------------------------------------------------------
// C1: resolvePregnancyGating -- fail CLOSED on a read error, unmodified
// decision otherwise (delegates to the APPROVED getCompositionGating).
// ---------------------------------------------------------------------------

describe('resolvePregnancyGating (C1: fail-closed on read error)', () => {
  it('no read error, indication none: matches getCompositionGating unmodified (not suppressed)', () => {
    const gating = resolvePregnancyGating('none', false);
    expect(gating).toEqual(getCompositionGating({ pregnancyStatus: null }));
    expect(gating.compositionSuppressed).toBe(false);
  });

  it('no read error, indication pregnant: matches getCompositionGating unmodified (suppressed)', () => {
    const gating = resolvePregnancyGating('pregnant', false);
    expect(gating).toEqual(getCompositionGating({ pregnancyStatus: 'pregnant' }));
    expect(gating.compositionSuppressed).toBe(true);
  });

  it('read error, indication none: fails CLOSED (compositionSuppressed true) despite indication being none', () => {
    const gating = resolvePregnancyGating('none', true);
    expect(gating.compositionSuppressed).toBe(true);
    expect(gating.reason).toBe(PREGNANCY_READ_ERROR_SUPPRESSED_COPY);
  });

  it('read-error copy never implies the user is pregnant or lactating', () => {
    const gating = resolvePregnancyGating('none', true);
    expect(gating.reason?.toLowerCase()).not.toContain('pregnancy or lactation mode is active');
  });

  it('read-error copy contains no digits (no fabricated numeric precision)', () => {
    const gating = resolvePregnancyGating('none', true);
    expect(gating.reason ?? '').not.toMatch(/\d/);
  });

  it('read-error copy contains no em or en dashes (standing rule)', () => {
    const EM_DASH = String.fromCharCode(0x2014);
    const EN_DASH = String.fromCharCode(0x2013);
    const gating = resolvePregnancyGating('none', true);
    expect(gating.reason?.includes(EM_DASH)).toBe(false);
    expect(gating.reason?.includes(EN_DASH)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// C1: deriveCompositionGate -- combines gating + loading into the single
// value every composition-ESTIMATE call site must gate on.
// ---------------------------------------------------------------------------

describe('deriveCompositionGate (C1: compositionSuppressed OR loading, correct copy per cause)', () => {
  it('pregnancy active, not loading: active true, pregnancy-suppression copy', () => {
    const gating = getCompositionGating({ pregnancyStatus: 'pregnant' });
    const { active, copy } = deriveCompositionGate(gating, false);
    expect(active).toBe(true);
    expect(copy).toBe(gating.reason);
  });

  it('pregnancy inactive, loading true: active true (fail closed on loading), NEUTRAL checking copy (not pregnancy copy)', () => {
    const gating = getCompositionGating({ pregnancyStatus: null });
    const { active, copy } = deriveCompositionGate(gating, true);
    expect(active).toBe(true);
    expect(copy).toBe(COMPOSITION_GATE_CHECKING_COPY);
    expect(copy?.toLowerCase()).not.toContain('pregnancy or lactation mode is active');
  });

  it('read error (gating already suppressed) AND loading true: active true, error copy wins (not the loading copy)', () => {
    const gating = resolvePregnancyGating('none', true);
    const { active, copy } = deriveCompositionGate(gating, true);
    expect(active).toBe(true);
    expect(copy).toBe(PREGNANCY_READ_ERROR_SUPPRESSED_COPY);
  });

  it('pregnancy inactive, not loading: active false, copy null', () => {
    const gating = getCompositionGating({ pregnancyStatus: null });
    const { active, copy } = deriveCompositionGate(gating, false);
    expect(active).toBe(false);
    expect(copy).toBeNull();
  });

  it('checking copy contains no digits', () => {
    expect(COMPOSITION_GATE_CHECKING_COPY).not.toMatch(/\d/);
  });

  it('checking copy contains no em or en dashes', () => {
    const EM_DASH = String.fromCharCode(0x2014);
    const EN_DASH = String.fromCharCode(0x2013);
    expect(COMPOSITION_GATE_CHECKING_COPY.includes(EM_DASH)).toBe(false);
    expect(COMPOSITION_GATE_CHECKING_COPY.includes(EN_DASH)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// C2 + stale-snapshot Important: writePregnancyStatus is a blocking
// read-modify-write against the FRESHEST row.
// ---------------------------------------------------------------------------

describe('writePregnancyStatus (C2: PHI-safe read-modify-write)', () => {
  it('preserves pre-existing meds/allergies/conditions/goals, changing only pregnancy_status', async () => {
    const { client, insertCalls } = makeClient({ data: existingRow() });
    const result = await writePregnancyStatus(client, 'user-1', 'pregnant');

    expect(result.ok).toBe(true);
    expect(result.row).toEqual({
      demographics: { age: 34 },
      conditions: ['hypothyroidism'],
      medications: ['levothyroxine'],
      allergies: ['penicillin'],
      pregnancy_status: 'pregnant',
      goals: ['lose fat'],
    });
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toMatchObject({
      user_id: 'user-1',
      medications: ['levothyroxine'],
      allergies: ['penicillin'],
      conditions: ['hypothyroidism'],
      pregnancy_status: 'pregnant',
    });
  });

  it('toggling back to none via the same path still preserves clinical fields', async () => {
    const { client, insertCalls } = makeClient({
      data: existingRow({ pregnancy_status: 'pregnant' }),
    });
    const result = await writePregnancyStatus(client, 'user-1', 'none');

    expect(result.ok).toBe(true);
    expect(result.row?.pregnancy_status).toBeNull();
    expect(result.row?.medications).toEqual(['levothyroxine']);
    expect(insertCalls[0].pregnancy_status).toBeNull();
    expect(insertCalls[0].medications).toEqual(['levothyroxine']);
  });

  it('a genuinely first-time user (no prior row) writes empty fields honestly (nothing to preserve, not a failure)', async () => {
    const { client, insertCalls } = makeClient({ data: null, error: null });
    const result = await writePregnancyStatus(client, 'user-1', 'lactating');

    expect(result.ok).toBe(true);
    expect(result.row).toEqual({
      demographics: {},
      conditions: [],
      medications: [],
      allergies: [],
      pregnancy_status: 'lactating',
      goals: [],
    });
    expect(insertCalls).toHaveLength(1);
  });

  it('FAILED base read (Supabase-level error): does NOT insert, returns not-ok, never writes an empty-fields row', async () => {
    const { client, insertCalls } = makeClient({
      data: null,
      error: { message: 'permission denied' },
    });
    const result = await writePregnancyStatus(client, 'user-1', 'pregnant');

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    expect(insertCalls).toHaveLength(0);
  });

  it('FAILED base read (network rejection): does NOT insert, returns not-ok', async () => {
    const { client, insertCalls } = makeClient({ reject: true });
    const result = await writePregnancyStatus(client, 'user-1', 'pregnant');

    expect(result.ok).toBe(false);
    expect(insertCalls).toHaveLength(0);
  });

  it('a failed insert (write-side error) still surfaces not-ok (existing behavior preserved)', async () => {
    const { client, insertCalls } = makeClient(
      { data: existingRow() },
      { message: 'insert rejected by RLS' },
    );
    const result = await writePregnancyStatus(client, 'user-1', 'pregnant');

    expect(result.ok).toBe(false);
    // The base read DID succeed and the write WAS attempted (this is a
    // write-side failure, distinct from the base-read failure case above).
    expect(insertCalls).toHaveLength(1);
  });

  it('stale-snapshot mitigation: reads the FRESHEST row every call, never a caller-held snapshot', async () => {
    // Two sequential calls against a client whose "freshest" row differs
    // (simulating a concurrent edit made by another surface between calls).
    // Each call must independently re-read; nothing is cached across calls.
    const first = makeClient({ data: existingRow({ medications: ['levothyroxine'] }) });
    const firstResult = await writePregnancyStatus(first.client, 'user-1', 'pregnant');
    expect(firstResult.row?.medications).toEqual(['levothyroxine']);

    // A second, independent client simulating the row having since changed
    // (e.g. CAQ added a new medication after the first write).
    const second = makeClient({
      data: existingRow({ medications: ['levothyroxine', 'metformin'], pregnancy_status: 'pregnant' }),
    });
    const secondResult = await writePregnancyStatus(second.client, 'user-1', 'none');
    expect(secondResult.row?.medications).toEqual(['levothyroxine', 'metformin']);
  });
});
