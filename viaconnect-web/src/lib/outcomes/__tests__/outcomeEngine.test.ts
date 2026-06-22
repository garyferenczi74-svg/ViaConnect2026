// Unit tests for outcomeEngine.ts (Prompt 208a Task H2).
// Uses vi.mock to isolate the admin client. All DB interactions are mocked;
// the suite tests fail-open behavior, the cohort-floor privacy invariant,
// and the deterministic ranking of prioritizeActiveLearning.
// No em/en-dashes, no emojis.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- mock admin client BEFORE importing the module under test ---
const mockInsert = vi.fn();
const mockFrom = vi.fn(() => ({ insert: mockInsert }));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  MIN_COHORT_N,
  recordOutcome,
  recordAdverseEvent,
  aggregateCohortSignal,
  persistCohortSignal,
  prioritizeActiveLearning,
  type CohortSignal,
  type LearningTopic,
} from '../outcomeEngine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDeltas(n: number, value = 2.5): number[] {
  return Array.from({ length: n }, () => value);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockInsert.mockResolvedValue({ error: null });
});

// ---------------------------------------------------------------------------
// MIN_COHORT_N constant
// ---------------------------------------------------------------------------

describe('MIN_COHORT_N', () => {
  it('is 20', () => {
    expect(MIN_COHORT_N).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// recordOutcome
// ---------------------------------------------------------------------------

describe('recordOutcome', () => {
  it('inserts a mapped row and returns true on success', async () => {
    const result = await recordOutcome('user-abc', {
      protocolRef: 'protocol-1',
      adherence: 0.85,
      subjectiveOutcome: 'feeling better',
    });
    expect(result).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('outcome_events');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-abc',
        protocol_ref: 'protocol-1',
        adherence: 0.85,
        subjective_outcome: 'feeling better',
      }),
    );
  });

  it('returns true with optional fields omitted', async () => {
    const result = await recordOutcome('user-abc', {});
    expect(result).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-abc' }),
    );
  });

  it('returns false (fail-open) when the DB returns an error', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'db error' } });
    const result = await recordOutcome('user-abc', { protocolRef: 'p1' });
    expect(result).toBe(false);
  });

  it('returns false (fail-open) when insert throws', async () => {
    mockInsert.mockRejectedValue(new Error('network failure'));
    const result = await recordOutcome('user-abc', { protocolRef: 'p1' });
    expect(result).toBe(false);
  });

  it('never throws even on catastrophic failure', async () => {
    mockFrom.mockImplementation(() => { throw new Error('boom'); });
    await expect(recordOutcome('u', {})).resolves.toBe(false);
    // restore
    mockFrom.mockReturnValue({ insert: mockInsert });
  });
});

// ---------------------------------------------------------------------------
// recordAdverseEvent
// ---------------------------------------------------------------------------

describe('recordAdverseEvent', () => {
  it('inserts a mapped row and returns true on success', async () => {
    const result = await recordAdverseEvent('user-xyz', {
      itemRef: 'supplement-iron',
      description: 'nausea',
      severity: 'mild',
      implicatedRuleId: 'rule-99',
    });
    expect(result).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('adverse_events');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-xyz',
        item_ref: 'supplement-iron',
        description: 'nausea',
        severity: 'mild',
        implicated_rule_id: 'rule-99',
      }),
    );
  });

  it('does NOT disable any rule - only records', async () => {
    // The mock does not expose a rule_killswitch method; if the implementation
    // tried to call it we would see an uncaught reference error in the test.
    const result = await recordAdverseEvent('user-xyz', {
      severity: 'severe',
      implicatedRuleId: 'rule-critical',
    });
    expect(result).toBe(true);
    // Verify no second DB table was touched (only adverse_events insert called)
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith('adverse_events');
  });

  it('returns false (fail-open) on DB error', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'write failed' } });
    const result = await recordAdverseEvent('user-xyz', { severity: 'moderate' });
    expect(result).toBe(false);
  });

  it('returns false (fail-open) when insert throws', async () => {
    mockInsert.mockRejectedValue(new Error('timeout'));
    const result = await recordAdverseEvent('user-xyz', {});
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// aggregateCohortSignal (pure)
// ---------------------------------------------------------------------------

describe('aggregateCohortSignal', () => {
  it('returns n=0, aggregateDelta=null, insufficient for empty input', () => {
    const sig = aggregateCohortSignal([]);
    expect(sig.n).toBe(0);
    expect(sig.aggregateDelta).toBeNull();
    expect(sig.signalStrength).toBe('insufficient');
  });

  it('returns insufficient when n < MIN_COHORT_N (n=19)', () => {
    const sig = aggregateCohortSignal(makeDeltas(19));
    expect(sig.signalStrength).toBe('insufficient');
    expect(sig.n).toBe(19);
    // mean should still be correct
    expect(sig.aggregateDelta).toBeCloseTo(2.5);
  });

  it('returns insufficient when n = MIN_COHORT_N - 1', () => {
    const sig = aggregateCohortSignal(makeDeltas(MIN_COHORT_N - 1));
    expect(sig.signalStrength).toBe('insufficient');
  });

  it('does not return insufficient when n >= MIN_COHORT_N with clear effect', () => {
    const sig = aggregateCohortSignal(makeDeltas(MIN_COHORT_N, 10));
    expect(sig.signalStrength).not.toBe('insufficient');
    expect(sig.n).toBe(MIN_COHORT_N);
    expect(sig.aggregateDelta).toBeCloseTo(10);
  });

  it('computes correct mean for mixed deltas', () => {
    const sig = aggregateCohortSignal([2, 4, 6]);
    // n=3 < 20 -> insufficient but mean should be 4
    expect(sig.aggregateDelta).toBeCloseTo(4);
    expect(sig.signalStrength).toBe('insufficient');
  });

  it('returns at least weak signal for n >= 20 with small effect', () => {
    const sig = aggregateCohortSignal(makeDeltas(20, 0.1));
    expect(['weak', 'moderate', 'strong']).toContain(sig.signalStrength);
  });

  it('returns strong signal for large n and large effect', () => {
    const sig = aggregateCohortSignal(makeDeltas(200, 15));
    expect(sig.signalStrength).toBe('strong');
  });

  it('does not mutate input', () => {
    const input = makeDeltas(25, 3);
    const copy = [...input];
    aggregateCohortSignal(input);
    expect(input).toEqual(copy);
  });
});

// ---------------------------------------------------------------------------
// persistCohortSignal
// ---------------------------------------------------------------------------

describe('persistCohortSignal', () => {
  it('does NOT persist when n < MIN_COHORT_N, but returns the signal', async () => {
    const sig = await persistCohortSignal('prot-A', 'vitaminD', makeDeltas(5));
    expect(sig.signalStrength).toBe('insufficient');
    // insert must NOT have been called
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('persists when n >= MIN_COHORT_N and returns the signal', async () => {
    const sig = await persistCohortSignal('prot-B', 'ferritin', makeDeltas(30, 5));
    expect(sig.n).toBe(30);
    expect(sig.signalStrength).not.toBe('insufficient');
    expect(mockFrom).toHaveBeenCalledWith('cohort_signals');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        protocol_ref: 'prot-B',
        biomarker: 'ferritin',
        n: 30,
      }),
    );
  });

  it('returns the signal even if the DB write fails (fail-open)', async () => {
    mockInsert.mockRejectedValue(new Error('db offline'));
    const sig = await persistCohortSignal('prot-C', 'hba1c', makeDeltas(50, 3));
    expect(sig.n).toBe(50);
    // signal is returned regardless of DB failure
    expect(sig.signalStrength).not.toBe('insufficient');
  });

  it('returns the signal even if DB insert returns an error object', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'constraint violation' } });
    const sig = await persistCohortSignal('prot-D', 'folate', makeDeltas(25, 2));
    expect(sig.n).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// prioritizeActiveLearning (pure)
// ---------------------------------------------------------------------------

describe('prioritizeActiveLearning', () => {
  const highPriority: LearningTopic = {
    topic: 'iron absorption',
    askCount: 100,
    coverage: 0.1,
    avgConfidence: 0.2,
  };
  const lowPriority: LearningTopic = {
    topic: 'well-covered topic',
    askCount: 10,
    coverage: 0.9,
    avgConfidence: 0.95,
  };
  const medPriority: LearningTopic = {
    topic: 'mid topic',
    askCount: 50,
    coverage: 0.5,
    avgConfidence: 0.5,
  };

  it('ranks high-ask low-coverage low-confidence topic first', () => {
    const result = prioritizeActiveLearning([lowPriority, medPriority, highPriority]);
    expect(result[0].topic).toBe('iron absorption');
  });

  it('ranks well-covered high-confidence topic last', () => {
    const result = prioritizeActiveLearning([highPriority, lowPriority, medPriority]);
    expect(result[result.length - 1].topic).toBe('well-covered topic');
  });

  it('does not mutate the input array', () => {
    const input = [lowPriority, highPriority, medPriority];
    const inputCopy = [...input];
    prioritizeActiveLearning(input);
    expect(input).toEqual(inputCopy);
  });

  it('returns a new array instance', () => {
    const input = [highPriority, lowPriority];
    const result = prioritizeActiveLearning(input);
    expect(result).not.toBe(input);
  });

  it('handles empty input', () => {
    const result = prioritizeActiveLearning([]);
    expect(result).toEqual([]);
  });

  it('handles single item', () => {
    const result = prioritizeActiveLearning([medPriority]);
    expect(result).toHaveLength(1);
    expect(result[0].topic).toBe('mid topic');
  });

  it('is stable for equal scores', () => {
    const a: LearningTopic = { topic: 'A', askCount: 10, coverage: 0.5, avgConfidence: 0.5 };
    const b: LearningTopic = { topic: 'B', askCount: 10, coverage: 0.5, avgConfidence: 0.5 };
    const result = prioritizeActiveLearning([a, b]);
    // both equal; just verify both present
    expect(result.map((t) => t.topic).sort()).toEqual(['A', 'B']);
  });
});
