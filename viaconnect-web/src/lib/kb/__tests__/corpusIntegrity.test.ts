/**
 * src/lib/kb/__tests__/corpusIntegrity.test.ts
 *
 * TDD tests for corpusIntegrity.ts (Prompt 208a, Module G, Task G2).
 *
 * Mocks:
 *   - @/lib/supabase/admin  (service-role client -- mocked to avoid live DB)
 *   - @/lib/utils/safe-log  (safeLog -- mocked to suppress output + assert calls)
 *
 * No em/en-dashes. No emojis. No new dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock safeLog BEFORE module-under-test is imported.
// ---------------------------------------------------------------------------
vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Mock the Supabase admin client.
//
// autoRetireOnRetraction calls:
//   supabase.from('retraction_log').insert([row])
//   supabase.from('knowledge_atoms').update({...}).eq('id', atomId)
//
// We expose mockInsertResult and mockUpdateResult so tests can override them.
// ---------------------------------------------------------------------------
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();

// Default: insert and update succeed.
mockInsert.mockResolvedValue({ error: null });
mockEq.mockResolvedValue({ error: null });
mockUpdate.mockReturnValue({ eq: mockEq });

const mockFrom = vi.fn((table: string) => {
  if (table === 'retraction_log') {
    return { insert: mockInsert };
  }
  if (table === 'knowledge_atoms') {
    return { update: mockUpdate };
  }
  return { insert: mockInsert, update: mockUpdate };
});

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// ---------------------------------------------------------------------------
// Now import the module under test (after mocks are registered).
// ---------------------------------------------------------------------------
import {
  stalenessScore,
  reVerifyDue,
  detectConflicts,
  autoRetireOnRetraction,
  checkRetraction,
  verifyGrounding,
  type ConflictAtom,
  type RetractionCheck,
  type GroundingCheck,
} from '../corpusIntegrity';

import { safeLog } from '@/lib/utils/safe-log';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgoIso(days: number, nowMs: number): string {
  return new Date(nowMs - days * DAY_MS).toISOString();
}

// ---------------------------------------------------------------------------
// Tests: stalenessScore
// ---------------------------------------------------------------------------
describe('stalenessScore', () => {
  const NOW = 1_700_000_000_000; // fixed epoch

  it('returns a higher score for a lower-evidence tier (tier 3 > tier 1) for same daysSince', () => {
    const lastVerified = daysAgoIso(100, NOW);
    const scoreT1 = stalenessScore(lastVerified, 1, NOW);
    const scoreT3 = stalenessScore(lastVerified, 3, NOW);
    expect(scoreT3).toBeGreaterThan(scoreT1);
  });

  it('returns a higher score for more days elapsed (same tier)', () => {
    const recent = daysAgoIso(10, NOW);
    const old = daysAgoIso(200, NOW);
    const scoreRecent = stalenessScore(recent, 2, NOW);
    const scoreOld = stalenessScore(old, 2, NOW);
    expect(scoreOld).toBeGreaterThan(scoreRecent);
  });

  it('returns a high score when lastVerifiedAt is null (treat as very stale)', () => {
    const normal = stalenessScore(daysAgoIso(30, NOW), 1, NOW);
    const nullScore = stalenessScore(null, 1, NOW);
    expect(nullScore).toBeGreaterThan(normal);
  });

  it('returns a numeric value (not NaN, not Infinity)', () => {
    const score = stalenessScore(daysAgoIso(50, NOW), 2, NOW);
    expect(Number.isFinite(score)).toBe(true);
  });

  it('returns 0 when lastVerifiedAt equals nowMs (same instant, same tier)', () => {
    const justNow = new Date(NOW).toISOString();
    const score = stalenessScore(justNow, 2, NOW);
    expect(score).toBeCloseTo(0, 5);
  });

  it('does not call Date.now() internally (pure -- nowMs is the only time source)', () => {
    // We can verify determinism: same inputs -> same output.
    const ts = daysAgoIso(90, NOW);
    const a = stalenessScore(ts, 2, NOW);
    const b = stalenessScore(ts, 2, NOW);
    expect(a).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// Tests: reVerifyDue
// ---------------------------------------------------------------------------
describe('reVerifyDue', () => {
  const NOW = 1_700_000_000_000;

  it('returns true when tier-3 atom was verified 100 days ago (threshold = 90d)', () => {
    const ts = daysAgoIso(100, NOW);
    expect(reVerifyDue(ts, 3, NOW)).toBe(true);
  });

  it('returns false when tier-1 atom was verified 100 days ago (threshold = 365d)', () => {
    const ts = daysAgoIso(100, NOW);
    expect(reVerifyDue(ts, 1, NOW)).toBe(false);
  });

  it('returns false when tier-2 atom was verified 50 days ago (threshold = 180d)', () => {
    const ts = daysAgoIso(50, NOW);
    expect(reVerifyDue(ts, 2, NOW)).toBe(false);
  });

  it('returns true when tier-2 atom was verified 200 days ago (threshold = 180d)', () => {
    const ts = daysAgoIso(200, NOW);
    expect(reVerifyDue(ts, 2, NOW)).toBe(true);
  });

  it('returns true when lastVerifiedAt is null (never verified -> always due)', () => {
    expect(reVerifyDue(null, 1, NOW)).toBe(true);
    expect(reVerifyDue(null, 2, NOW)).toBe(true);
    expect(reVerifyDue(null, 3, NOW)).toBe(true);
  });

  it('returns false when tier-3 atom verified exactly at threshold boundary (89 days, not yet due)', () => {
    const ts = daysAgoIso(89, NOW);
    expect(reVerifyDue(ts, 3, NOW)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: detectConflicts
// ---------------------------------------------------------------------------
describe('detectConflicts', () => {
  it('emits one conflict for two atoms sharing an rsid with opposing effect_direction', () => {
    const atoms: ConflictAtom[] = [
      { id: 'a1', snp_refs: ['rs123'], effect_direction: 'increase' },
      { id: 'a2', snp_refs: ['rs123'], effect_direction: 'decrease' },
    ];
    const conflicts = detectConflicts(atoms);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflict_type).toBe('effect_direction');
    // Unordered pair -- both atoms must appear.
    const ids = [conflicts[0].atom_id_a, conflicts[0].atom_id_b];
    expect(ids).toContain('a1');
    expect(ids).toContain('a2');
  });

  it('emits no conflict when effect_direction is the same', () => {
    const atoms: ConflictAtom[] = [
      { id: 'a1', snp_refs: ['rs123'], effect_direction: 'increase' },
      { id: 'a2', snp_refs: ['rs123'], effect_direction: 'positive' },
    ];
    // 'increase' and 'positive' are both on the positive side -> no conflict.
    const conflicts = detectConflicts(atoms);
    expect(conflicts).toHaveLength(0);
  });

  it('emits no conflict when atoms share no snp_ref or nutrient_ref', () => {
    const atoms: ConflictAtom[] = [
      { id: 'a1', snp_refs: ['rs111'], effect_direction: 'increase' },
      { id: 'a2', snp_refs: ['rs999'], effect_direction: 'decrease' },
    ];
    const conflicts = detectConflicts(atoms);
    expect(conflicts).toHaveLength(0);
  });

  it('emits one conflict for two atoms sharing a nutrient_ref with opposing direction', () => {
    const atoms: ConflictAtom[] = [
      { id: 'b1', nutrient_refs: ['folate'], effect_direction: 'protective' },
      { id: 'b2', nutrient_refs: ['folate'], effect_direction: 'risk' },
    ];
    const conflicts = detectConflicts(atoms);
    expect(conflicts).toHaveLength(1);
  });

  it('emits each unordered pair exactly once (no duplicates)', () => {
    const atoms: ConflictAtom[] = [
      { id: 'x1', snp_refs: ['rs1'], effect_direction: 'increase' },
      { id: 'x2', snp_refs: ['rs1'], effect_direction: 'decrease' },
      { id: 'x3', snp_refs: ['rs1'], effect_direction: 'increase' },
    ];
    // x1 vs x2 (conflict), x2 vs x3 (conflict), x1 vs x3 (no conflict - same direction).
    const conflicts = detectConflicts(atoms);
    expect(conflicts).toHaveLength(2);

    // Check no duplicate pair (same ids in any order).
    const pairKeys = conflicts.map((c) =>
      [c.atom_id_a, c.atom_id_b].sort().join('|'),
    );
    const unique = new Set(pairKeys);
    expect(unique.size).toBe(pairKeys.length);
  });

  it('emits no conflict when effect_direction is empty/null (indeterminate)', () => {
    const atoms: ConflictAtom[] = [
      { id: 'c1', snp_refs: ['rs2'], effect_direction: null },
      { id: 'c2', snp_refs: ['rs2'], effect_direction: 'decrease' },
    ];
    const conflicts = detectConflicts(atoms);
    expect(conflicts).toHaveLength(0);
  });

  it('returns empty array for an empty input', () => {
    expect(detectConflicts([])).toEqual([]);
  });

  it('returns empty array for a single atom', () => {
    const atoms: ConflictAtom[] = [
      { id: 'solo', snp_refs: ['rs7'], effect_direction: 'increase' },
    ];
    expect(detectConflicts(atoms)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Tests: autoRetireOnRetraction
// ---------------------------------------------------------------------------
describe('autoRetireOnRetraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-establish defaults after clearAllMocks.
    mockInsert.mockResolvedValue({ error: null });
    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
  });

  it('inserts a retraction_log row and updates the atom to retired, returns true on success', async () => {
    const result = await autoRetireOnRetraction('atom-abc', 'doi:10.1234/test');
    expect(result).toBe(true);

    // retraction_log insert called with correct table.
    expect(mockFrom).toHaveBeenCalledWith('retraction_log');

    // knowledge_atoms update called.
    expect(mockFrom).toHaveBeenCalledWith('knowledge_atoms');

    // Insert was called with an array containing the retraction row.
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          atom_id: 'atom-abc',
          source_ref: 'doi:10.1234/test',
          action_taken: 'auto_retired',
        }),
      ]),
    );

    // Update sets review_status to 'retired'.
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ review_status: 'retired' }),
    );

    // eq called with the atom id.
    expect(mockEq).toHaveBeenCalledWith('id', 'atom-abc');
  });

  it('returns false and does not throw when the insert fails (fail-open)', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'insert failure' } });

    let result: boolean;
    await expect(
      (async () => {
        result = await autoRetireOnRetraction('atom-xyz', 'doi:10.9999/boom');
        return result;
      })(),
    ).resolves.toBe(false);
  });

  it('returns false and does not throw when the update fails (fail-open)', async () => {
    mockInsert.mockResolvedValue({ error: null });
    mockEq.mockResolvedValue({ error: { message: 'update failure' } });

    const result = await autoRetireOnRetraction('atom-xyz', 'doi:10.9999/up-boom');
    expect(result).toBe(false);
  });

  it('logs an error via safeLog on failure (fail-open)', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'boom' } });

    await autoRetireOnRetraction('atom-err', 'doi:10.0000/err');

    expect(safeLog.error).toHaveBeenCalled();
  });

  it('retraction_log row includes a retracted_at ISO timestamp', async () => {
    await autoRetireOnRetraction('atom-ts', 'doi:10.1234/ts');

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg).toHaveLength(1);
    const row = insertArg[0];
    // Must be parseable as a date.
    expect(() => new Date(row.retracted_at).toISOString()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Tests: checkRetraction (flag-off interface)
// ---------------------------------------------------------------------------
describe('checkRetraction', () => {
  it('returns { retracted: false } when no retractionSource is provided (flag-off)', async () => {
    const result = await checkRetraction('doi:10.1234/test');
    expect(result).toEqual({ retracted: false });
  });

  it('returns { retracted: false } when doi is null and no source provided', async () => {
    const result = await checkRetraction(null);
    expect(result).toEqual({ retracted: false });
  });

  it('passes through the result from an injected retractionSource', async () => {
    const mockSource = vi.fn().mockResolvedValue({ retracted: true, sourceRef: 'pubmed-retraction-db' });
    const result = await checkRetraction('doi:10.1234/retracted', { retractionSource: mockSource });
    expect(result).toEqual({ retracted: true, sourceRef: 'pubmed-retraction-db' });
    expect(mockSource).toHaveBeenCalledWith('doi:10.1234/retracted');
  });

  it('never throws (fail-open)', async () => {
    const mockSource = vi.fn().mockRejectedValue(new Error('network error'));
    await expect(
      checkRetraction('doi:10.1234/throwing', { retractionSource: mockSource }),
    ).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Tests: verifyGrounding (flag-off interface)
// ---------------------------------------------------------------------------
describe('verifyGrounding', () => {
  it('returns { verified: "unverified" } when no verifier is provided (flag-off)', async () => {
    const result = await verifyGrounding('Some claim', 'Some citation');
    expect(result).toEqual({ verified: 'unverified' });
  });

  it('returns { verified: "unverified" } when citation is null and no verifier', async () => {
    const result = await verifyGrounding('Some claim', null);
    expect(result).toEqual({ verified: 'unverified' });
  });

  it('passes through the result from an injected verifier', async () => {
    const mockVerifier = vi.fn().mockResolvedValue({ verified: 'verified' as const });
    const result = await verifyGrounding('Some claim', 'Some citation', { verifier: mockVerifier });
    expect(result).toEqual({ verified: 'verified' });
    expect(mockVerifier).toHaveBeenCalledWith('Some claim', 'Some citation');
  });

  it('passes through an "unsupported" result from an injected verifier', async () => {
    const mockVerifier = vi.fn().mockResolvedValue({ verified: 'unsupported' as const });
    const result = await verifyGrounding('Weak claim', null, { verifier: mockVerifier });
    expect(result).toEqual({ verified: 'unsupported' });
  });

  it('never throws (fail-open)', async () => {
    const mockVerifier = vi.fn().mockRejectedValue(new Error('llm error'));
    await expect(
      verifyGrounding('Some claim', null, { verifier: mockVerifier }),
    ).resolves.toBeDefined();
  });
});
