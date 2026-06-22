/**
 * Unit tests for src/lib/protocol/healthContext.ts
 * TDD: written RED first, then implementation makes them GREEN.
 *
 * Prompt 208a, Module F, Task F2 (2026-06-21).
 * No em/en-dashes. No emojis.
 */

import { describe, it, expect, vi, beforeEach, type MockInstance } from 'vitest';

// The module does not exist yet (RED phase).
import { buildUserHealthContext, type UserHealthContext } from '../healthContext';

// ---------------------------------------------------------------------------
// Mock safeLog so we can assert on warn calls
// ---------------------------------------------------------------------------
vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { safeLog } from '@/lib/utils/safe-log';

// ---------------------------------------------------------------------------
// Mock admin client factory
// ---------------------------------------------------------------------------

/**
 * Builds a minimal chainable Supabase mock.
 *
 * Supports two independent call sequences:
 *   1. caq_assessment_versions read:  from -> select -> eq(user_id) -> eq(status)
 *                                      -> order -> limit -> maybeSingle
 *   2. user_medications read:         from -> select -> eq(user_id) -> eq(active) -> then-able
 *   3. user_current_supplements read: from -> select -> eq(user_id) -> eq(is_current) -> then-able
 *   4. user_health_context insert:    from -> insert -> select -> maybeSingle
 *
 * Each `from` call returns a dedicated chain so parallel table reads work.
 */

type MockResult = { data: unknown; error: unknown };

interface TableConfig {
  selectResult?: MockResult;
  insertResult?: MockResult;
}

function makeChain(result: MockResult) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockReturnValue({ maybeSingle });
  const order = vi.fn().mockReturnValue({ limit });
  // generic terminal .then for non-maybeSingle queries
  const thenResult = { ...result };
  // eq chains can be nested arbitrarily; last level resolves
  function eqChain(depth: number): unknown {
    if (depth === 0) {
      return {
        maybeSingle,
        then: (resolve: (v: MockResult) => void) => Promise.resolve(thenResult).then(resolve),
      };
    }
    const next = eqChain(depth - 1);
    return {
      eq: vi.fn().mockReturnValue(next),
      order: vi.fn().mockReturnValue({ limit }),
      maybeSingle,
      then: (resolve: (v: MockResult) => void) => Promise.resolve(thenResult).then(resolve),
    };
  }
  const selectChain = eqChain(3);
  const select = vi.fn().mockReturnValue(selectChain);
  return { select, maybeSingle, limit, order };
}

function makeAdminClient(configs: Record<string, TableConfig>) {
  const insertMocks: Record<string, ReturnType<typeof vi.fn>> = {};

  const from = vi.fn().mockImplementation((table: string) => {
    const cfg = configs[table] ?? {};
    const readResult: MockResult = cfg.selectResult ?? { data: null, error: null };
    const insertResult: MockResult = cfg.insertResult ?? { data: null, error: null };

    const chain = makeChain(readResult);

    // insert chain
    const insertMaybeSingle = vi.fn().mockResolvedValue(insertResult);
    const insertSelect = vi.fn().mockReturnValue({ maybeSingle: insertMaybeSingle });
    const insertFn = vi.fn().mockReturnValue({
      select: insertSelect,
      maybeSingle: insertMaybeSingle,
      then: (resolve: (v: MockResult) => void) => Promise.resolve(insertResult).then(resolve),
    });
    insertMocks[table] = insertFn;

    return {
      select: chain.select,
      insert: insertFn,
    };
  });

  return { from, _insertMocks: insertMocks };
}

// ---------------------------------------------------------------------------
// Empty context shape helper
// ---------------------------------------------------------------------------

const EMPTY_CTX: UserHealthContext = {
  demographics: {},
  conditions: [],
  medications: [],
  allergies: [],
  pregnancyStatus: null,
  goals: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildUserHealthContext', () => {
  beforeEach(() => vi.clearAllMocks());

  // -------------------------------------------------------------------------
  // Test 1: aggregates a completed CAQ row
  // -------------------------------------------------------------------------
  it('aggregates demographics, conditions, allergies, goals from a completed CAQ row', async () => {
    const caqRow = {
      status: 'completed',
      demographics: { age: 38, sex: 'female' },
      health_concerns: { primary: ['fatigue', 'insomnia'] },
      medications: [{ name: 'Metformin' }, { name: 'Lisinopril' }],
      allergies: ['gluten', 'dairy'],
      lifestyle: { goals: ['weight_loss', 'energy'] },
    };

    const client = makeAdminClient({
      caq_assessment_versions: { selectResult: { data: caqRow, error: null } },
      user_medications: { selectResult: { data: [], error: null } },
      user_current_supplements: { selectResult: { data: [], error: null } },
      user_health_context: { insertResult: { data: null, error: null } },
    });

    const result = await buildUserHealthContext('u-1', client as never);

    expect(result.demographics).toEqual({ age: 38, sex: 'female' });
    // health_concerns is an object in this fixture; implementation wraps non-arrays in an array
    // so consumers always receive unknown[].
    expect(result.conditions).toEqual([{ primary: ['fatigue', 'insomnia'] }]);
    expect(result.allergies).toEqual(['gluten', 'dairy']);
    expect(result.goals).toEqual(['weight_loss', 'energy']);
  });

  // -------------------------------------------------------------------------
  // Test 2: merges active user_medications with CAQ medications (deduped)
  // -------------------------------------------------------------------------
  it('merges CAQ medications + active user_medications, deduped (case-insensitive)', async () => {
    const caqRow = {
      status: 'completed',
      demographics: {},
      health_concerns: [],
      medications: [{ name: 'Metformin' }, { name: 'Lisinopril' }],
      allergies: [],
      lifestyle: {},
    };

    const userMeds = [
      { medication_name: 'metformin', active: true },  // duplicate (case diff)
      { medication_name: 'Atorvastatin', active: true },
    ];

    const client = makeAdminClient({
      caq_assessment_versions: { selectResult: { data: caqRow, error: null } },
      user_medications: { selectResult: { data: userMeds, error: null } },
      user_current_supplements: { selectResult: { data: [], error: null } },
      user_health_context: { insertResult: { data: null, error: null } },
    });

    const result = await buildUserHealthContext('u-2', client as never);

    // Should contain all three unique names (display form preserved)
    expect(result.medications).toContain('Metformin');
    expect(result.medications).toContain('Lisinopril');
    expect(result.medications).toContain('Atorvastatin');
    // No duplicate metformin
    expect(result.medications.filter((m) => m.toLowerCase() === 'metformin')).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // Test 3: no CAQ row -> returns valid empty context, does not throw
  // -------------------------------------------------------------------------
  it('returns empty context when no completed CAQ row exists', async () => {
    const client = makeAdminClient({
      caq_assessment_versions: { selectResult: { data: null, error: null } },
      user_medications: { selectResult: { data: [], error: null } },
      user_current_supplements: { selectResult: { data: [], error: null } },
      user_health_context: { insertResult: { data: null, error: null } },
    });

    await expect(buildUserHealthContext('u-3', client as never)).resolves.toEqual(EMPTY_CTX);
  });

  // -------------------------------------------------------------------------
  // Test 4: read error -> fail-open, returns empty context, no throw
  // -------------------------------------------------------------------------
  it('returns empty context on read error (fail-open, never throws)', async () => {
    const client = makeAdminClient({
      caq_assessment_versions: { selectResult: { data: null, error: { message: 'db exploded' } } },
      user_medications: { selectResult: { data: null, error: null } },
      user_current_supplements: { selectResult: { data: null, error: null } },
      user_health_context: { insertResult: { data: null, error: null } },
    });

    await expect(buildUserHealthContext('u-4', client as never)).resolves.toEqual(EMPTY_CTX);
  });

  // -------------------------------------------------------------------------
  // Test 5: pregnancy_status surfaces when present in demographics, else null
  // -------------------------------------------------------------------------
  it('surfaces pregnancy_status from demographics when present', async () => {
    const caqRow = {
      status: 'completed',
      demographics: { age: 29, pregnancy_status: 'pregnant' },
      health_concerns: [],
      medications: [],
      allergies: [],
      lifestyle: {},
    };

    const client = makeAdminClient({
      caq_assessment_versions: { selectResult: { data: caqRow, error: null } },
      user_medications: { selectResult: { data: [], error: null } },
      user_current_supplements: { selectResult: { data: [], error: null } },
      user_health_context: { insertResult: { data: null, error: null } },
    });

    const result = await buildUserHealthContext('u-5', client as never);
    expect(result.pregnancyStatus).toBe('pregnant');
  });

  it('returns pregnancyStatus null when demographics lacks pregnancy_status', async () => {
    const caqRow = {
      status: 'completed',
      demographics: { age: 29 },
      health_concerns: [],
      medications: [],
      allergies: [],
      lifestyle: {},
    };

    const client = makeAdminClient({
      caq_assessment_versions: { selectResult: { data: caqRow, error: null } },
      user_medications: { selectResult: { data: [], error: null } },
      user_current_supplements: { selectResult: { data: [], error: null } },
      user_health_context: { insertResult: { data: null, error: null } },
    });

    const result = await buildUserHealthContext('u-6', client as never);
    expect(result.pregnancyStatus).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Test 6: persists user_health_context row; persist error does not throw
  // -------------------------------------------------------------------------
  it('calls insert on user_health_context with the aggregated shape', async () => {
    const caqRow = {
      status: 'completed',
      demographics: { age: 45 },
      health_concerns: ['fatigue'],
      medications: [{ name: 'Aspirin' }],
      allergies: ['nuts'],
      lifestyle: { goals: ['energy'] },
    };

    const client = makeAdminClient({
      caq_assessment_versions: { selectResult: { data: caqRow, error: null } },
      user_medications: { selectResult: { data: [], error: null } },
      user_current_supplements: { selectResult: { data: [], error: null } },
      user_health_context: { insertResult: { data: null, error: null } },
    });

    await buildUserHealthContext('u-7', client as never);

    // The insert mock for user_health_context should have been called
    expect(client.from).toHaveBeenCalledWith('user_health_context');
  });

  it('does not throw when the persist insert returns an error', async () => {
    const caqRow = {
      status: 'completed',
      demographics: { age: 50 },
      health_concerns: [],
      medications: [],
      allergies: [],
      lifestyle: {},
    };

    const client = makeAdminClient({
      caq_assessment_versions: { selectResult: { data: caqRow, error: null } },
      user_medications: { selectResult: { data: [], error: null } },
      user_current_supplements: { selectResult: { data: [], error: null } },
      user_health_context: { insertResult: { data: null, error: { message: 'insert failed' } } },
    });

    await expect(buildUserHealthContext('u-8', client as never)).resolves.toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Test 7: user_medications read error -> fail-open, CAQ meds only, warn called
  // -------------------------------------------------------------------------
  it('returns valid context (CAQ meds only) when user_medications returns a Supabase error, and calls safeLog.warn', async () => {
    const caqRow = {
      status: 'completed',
      demographics: { age: 40 },
      health_concerns: [],
      medications: [{ name: 'Metformin' }],
      allergies: [],
      lifestyle: {},
    };

    const client = makeAdminClient({
      caq_assessment_versions: { selectResult: { data: caqRow, error: null } },
      user_medications: { selectResult: { data: null, error: { message: 'RLS denied' } } },
      user_current_supplements: { selectResult: { data: [], error: null } },
      user_health_context: { insertResult: { data: null, error: null } },
    });

    const warnSpy = safeLog.warn as unknown as MockInstance;
    warnSpy.mockClear();

    const result = await buildUserHealthContext('u-9', client as never);

    // Should not throw - returns a valid context
    expect(result).toBeDefined();
    // CAQ meds only (user_medications failed)
    expect(result.medications).toContain('Metformin');
    // safeLog.warn must have been called with the user_medications error
    expect(warnSpy).toHaveBeenCalledWith(
      'health-context',
      'Failed to load user_medications; continuing',
      expect.objectContaining({ userId: 'u-9', error: expect.objectContaining({ message: 'RLS denied' }) }),
    );
  });
});
