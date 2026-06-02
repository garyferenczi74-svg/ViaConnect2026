// Prompt 172 Phase 2 (172b): resolveBosLine unit tests.
//
// Pure function tests. No React, no real Supabase. The resolver takes a
// SupabaseClient by injection so we stub the .from().select().eq().order
// chain inline; the surface area is small and the chain matches the live
// shape used by bio-optimization-score.ts.
//
// Contract under test (resolver.ts header comment is the spec):
//   - read order: latest first via (date desc, compute_seq desc), limit 2.
//   - rows.length === 0 -> returns null (slot hides).
//   - rows.length === 1 -> kind = 'learning'.
//   - rows.length === 2 with both scores numeric:
//        delta >= +0.5  -> 'positive_delta'
//        delta <= -0.5  -> 'gentle_caution'
//        otherwise      -> 'neutral'
//   - on Supabase error -> null.
//   - score column null in either row -> kind = 'learning'.
//   - safety mode flips microcopy variant to safety_mode without changing
//     the kind selection logic.
//   - mealId is mirrored verbatim on the returned BosLine.
//   - generatedAt is a valid ISO 8601 string.

import { describe, it, expect, vi } from 'vitest';
import {
  resolveBosLine,
  classifyDelta,
  buildBosLine,
  BOS_LINE_NOISE_BAND,
} from '../resolver';
import { MICROCOPY_STRINGS } from '@/lib/nutrition/microcopy';

interface StubRow {
  score: number | null;
}

interface StubChain {
  data: StubRow[] | null;
  error: { message: string } | null;
}

function makeSupabase(chain: StubChain) {
  const limit = vi.fn().mockResolvedValue(chain);
  const order2 = vi.fn(() => ({ limit }));
  const order1 = vi.fn(() => ({ order: order2 }));
  const eq = vi.fn(() => ({ order: order1 }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stub = { from } as any;
  return { stub, from, select, eq, order1, order2, limit };
}

describe('classifyDelta', () => {
  it('returns positive_delta when delta is exactly the noise band threshold', () => {
    expect(classifyDelta(BOS_LINE_NOISE_BAND)).toBe('positive_delta');
  });

  it('returns positive_delta when delta is above the noise band', () => {
    expect(classifyDelta(1.2)).toBe('positive_delta');
  });

  it('returns gentle_caution when delta is exactly the negative noise band threshold', () => {
    expect(classifyDelta(-BOS_LINE_NOISE_BAND)).toBe('gentle_caution');
  });

  it('returns gentle_caution when delta is below the negative noise band', () => {
    expect(classifyDelta(-3.7)).toBe('gentle_caution');
  });

  it('returns neutral when delta sits inside the noise band', () => {
    expect(classifyDelta(0)).toBe('neutral');
    expect(classifyDelta(0.49)).toBe('neutral');
    expect(classifyDelta(-0.49)).toBe('neutral');
  });
});

describe('buildBosLine', () => {
  it('resolves microcopy through the 172a layer for the normal variant', () => {
    const line = buildBosLine({
      kind: 'positive_delta',
      mealId: 'meal-1',
      safetyMode: false,
      generatedAt: '2026-06-02T12:00:00.000Z',
    });
    expect(line.copy).toBe(MICROCOPY_STRINGS['bos.positive_delta'].normal);
    expect(line.kind).toBe('positive_delta');
    expect(line.mealId).toBe('meal-1');
    expect(line.generatedAt).toBe('2026-06-02T12:00:00.000Z');
  });

  it('flips to the safety_mode variant when safetyMode is true', () => {
    const line = buildBosLine({
      kind: 'gentle_caution',
      mealId: 'meal-2',
      safetyMode: true,
    });
    expect(line.copy).toBe(MICROCOPY_STRINGS['bos.gentle_caution'].safety_mode);
  });

  it('defaults generatedAt to a valid ISO 8601 string when omitted', () => {
    const line = buildBosLine({
      kind: 'neutral',
      mealId: 'meal-3',
      safetyMode: false,
    });
    expect(typeof line.generatedAt).toBe('string');
    expect(Number.isNaN(Date.parse(line.generatedAt))).toBe(false);
  });
});

describe('resolveBosLine read shape', () => {
  it('selects from bio_optimization_history filtered by user_id with the correct order chain', async () => {
    const { stub, from, select, eq, order1, order2, limit } = makeSupabase({
      data: [{ score: 70 }, { score: 68 }],
      error: null,
    });
    await resolveBosLine(stub, { mealId: 'm-1', userId: 'u-1', safetyMode: false });
    expect(from).toHaveBeenCalledWith('bio_optimization_history');
    expect(select).toHaveBeenCalledWith('score');
    expect(eq).toHaveBeenCalledWith('user_id', 'u-1');
    expect(order1).toHaveBeenCalledWith('date', { ascending: false });
    expect(order2).toHaveBeenCalledWith('compute_seq', { ascending: false });
    expect(limit).toHaveBeenCalledWith(2);
  });
});

describe('resolveBosLine kind mapping', () => {
  it('returns null when the read returns zero rows', async () => {
    const { stub } = makeSupabase({ data: [], error: null });
    const line = await resolveBosLine(stub, {
      mealId: 'm-1',
      userId: 'u-1',
      safetyMode: false,
    });
    expect(line).toBeNull();
  });

  it('returns learning when the user has exactly one row', async () => {
    const { stub } = makeSupabase({ data: [{ score: 60 }], error: null });
    const line = await resolveBosLine(stub, {
      mealId: 'm-1',
      userId: 'u-1',
      safetyMode: false,
    });
    expect(line).not.toBeNull();
    expect(line?.kind).toBe('learning');
    expect(line?.mealId).toBe('m-1');
  });

  it('returns positive_delta when latest score is above noise band over previous', async () => {
    const { stub } = makeSupabase({
      data: [{ score: 72 }, { score: 70 }],
      error: null,
    });
    const line = await resolveBosLine(stub, {
      mealId: 'm-positive',
      userId: 'u-1',
      safetyMode: false,
    });
    expect(line?.kind).toBe('positive_delta');
  });

  it('returns gentle_caution when latest score is below noise band under previous', async () => {
    const { stub } = makeSupabase({
      data: [{ score: 68 }, { score: 72 }],
      error: null,
    });
    const line = await resolveBosLine(stub, {
      mealId: 'm-down',
      userId: 'u-1',
      safetyMode: false,
    });
    expect(line?.kind).toBe('gentle_caution');
  });

  it('returns neutral when the delta sits inside the noise band', async () => {
    const { stub } = makeSupabase({
      data: [{ score: 70.2 }, { score: 70 }],
      error: null,
    });
    const line = await resolveBosLine(stub, {
      mealId: 'm-flat',
      userId: 'u-1',
      safetyMode: false,
    });
    expect(line?.kind).toBe('neutral');
  });

  it('returns learning when either score column is null', async () => {
    const { stub } = makeSupabase({
      data: [{ score: 70 }, { score: null }],
      error: null,
    });
    const line = await resolveBosLine(stub, {
      mealId: 'm-null',
      userId: 'u-1',
      safetyMode: false,
    });
    expect(line?.kind).toBe('learning');
  });
});

describe('resolveBosLine error posture', () => {
  it('returns null when Supabase returns an error', async () => {
    const { stub } = makeSupabase({
      data: null,
      error: { message: 'permission denied' },
    });
    const line = await resolveBosLine(stub, {
      mealId: 'm-err',
      userId: 'u-1',
      safetyMode: false,
    });
    expect(line).toBeNull();
  });
});

describe('resolveBosLine safety mode', () => {
  it('flips microcopy to safety_mode variant without changing kind selection', async () => {
    const { stub } = makeSupabase({
      data: [{ score: 75 }, { score: 70 }],
      error: null,
    });
    const line = await resolveBosLine(stub, {
      mealId: 'm-sm',
      userId: 'u-1',
      safetyMode: true,
    });
    expect(line?.kind).toBe('positive_delta');
    expect(line?.copy).toBe(MICROCOPY_STRINGS['bos.positive_delta'].safety_mode);
  });
});
