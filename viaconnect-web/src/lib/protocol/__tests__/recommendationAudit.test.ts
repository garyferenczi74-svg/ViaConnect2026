/**
 * Unit tests for recommendationAudit.ts
 * TDD: written RED first, then implementation makes them GREEN.
 *
 * Prompt 208a Module J Task J2 (2026-06-22).
 * No em/en-dashes. No emojis.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock admin client and corpus readers.
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/kb/knowledgeAtoms', () => ({
  getPublishedAtoms: vi.fn(),
}));

vi.mock('@/lib/kb/ruleKillswitch', () => ({
  getActivePublishedRules: vi.fn(),
}));

import {
  stableInputsHash,
  snapshotCorpus,
  recordRecommendationAudit,
  getActiveEmbeddingVersion,
} from '../recommendationAudit';

import { createAdminClient } from '@/lib/supabase/admin';
import { getPublishedAtoms } from '@/lib/kb/knowledgeAtoms';
import { getActivePublishedRules } from '@/lib/kb/ruleKillswitch';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInsertMock(error: unknown = null) {
  return {
    insert: vi.fn().mockResolvedValue({ data: null, error }),
  };
}

function makeSelectSingleMock(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: data ? [data] : [], error }),
  };
}

// ---------------------------------------------------------------------------
// stableInputsHash
// ---------------------------------------------------------------------------

describe('stableInputsHash', () => {
  it('returns the same hash for identical objects regardless of key order', () => {
    const a = { userId: 'u1', variants: [{ rsid: 'rs123', genotype: 'TT' }], ruleIds: ['r1', 'r2'], supplements: ['folic acid'] };
    const b = { ruleIds: ['r1', 'r2'], supplements: ['folic acid'], userId: 'u1', variants: [{ rsid: 'rs123', genotype: 'TT' }] };
    expect(stableInputsHash(a)).toBe(stableInputsHash(b));
  });

  it('returns different hashes for different values', () => {
    const a = { userId: 'u1', ruleIds: ['r1'] };
    const b = { userId: 'u2', ruleIds: ['r1'] };
    expect(stableInputsHash(a)).not.toBe(stableInputsHash(b));
  });

  it('is deterministic across multiple calls', () => {
    const input = { userId: 'u99', variants: [{ rsid: 'rs1801133', genotype: 'CT' }], ruleIds: ['rule-001'], supplements: [] };
    const h1 = stableInputsHash(input);
    const h2 = stableInputsHash(input);
    const h3 = stableInputsHash(input);
    expect(h1).toBe(h2);
    expect(h2).toBe(h3);
  });

  it('returns a non-empty string', () => {
    const h = stableInputsHash({ x: 1 });
    expect(typeof h).toBe('string');
    expect(h.length).toBeGreaterThan(0);
  });

  it('handles nested key ordering consistently', () => {
    const a = { outer: { z: 2, a: 1 } };
    const b = { outer: { a: 1, z: 2 } };
    expect(stableInputsHash(a)).toBe(stableInputsHash(b));
  });

  it('handles arrays as ordered (array order matters)', () => {
    const a = { ids: ['r1', 'r2'] };
    const b = { ids: ['r2', 'r1'] };
    expect(stableInputsHash(a)).not.toBe(stableInputsHash(b));
  });
});

// ---------------------------------------------------------------------------
// snapshotCorpus
// ---------------------------------------------------------------------------

describe('snapshotCorpus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('counts atoms and rules, inserts a row, returns the values', async () => {
    const atoms = [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }];
    const rules = [{ id: 'r1' }, { id: 'r2' }];

    (getPublishedAtoms as ReturnType<typeof vi.fn>).mockResolvedValue(atoms);
    (getActivePublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue(rules);

    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: insertMock }),
    });

    const result = await snapshotCorpus();

    expect(result).not.toBeNull();
    expect(result!.atom_count).toBe(3);
    expect(result!.rule_count).toBe(2);
    expect(typeof result!.snapshot_hash).toBe('string');
    expect(result!.snapshot_hash.length).toBeGreaterThan(0);
    expect(insertMock).toHaveBeenCalledOnce();

    // Verify the inserted row contains the expected fields
    const insertedRow = insertMock.mock.calls[0][0];
    expect(Array.isArray(insertedRow) ? insertedRow[0] : insertedRow).toMatchObject({
      atom_count: 3,
      rule_count: 2,
      snapshot_hash: result!.snapshot_hash,
    });
  });

  it('returns null when getPublishedAtoms throws (fail-open)', async () => {
    (getPublishedAtoms as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'));
    (getActivePublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue({ data: null, error: null }) }),
    });

    const result = await snapshotCorpus();
    expect(result).toBeNull();
  });

  it('returns null when insert fails (fail-open)', async () => {
    (getPublishedAtoms as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 'a1' }]);
    (getActivePublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 'r1' }]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } }),
      }),
    });

    const result = await snapshotCorpus();
    expect(result).toBeNull();
  });

  it('snapshot_hash is consistent: same counts -> same hash', async () => {
    (getPublishedAtoms as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 'a1' }, { id: 'a2' }]);
    (getActivePublishedRules as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 'r1' }]);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue({ data: null, error: null }) }),
    });

    const r1 = await snapshotCorpus();
    const r2 = await snapshotCorpus();
    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();
    expect(r1!.snapshot_hash).toBe(r2!.snapshot_hash);
  });
});

// ---------------------------------------------------------------------------
// recordRecommendationAudit
// ---------------------------------------------------------------------------

describe('recordRecommendationAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts the mapped row and returns true on success', async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: insertMock }),
    });

    const input = {
      inputsHash: 'abc123',
      ruleIds: ['rule-001', 'rule-hfe'],
      snapshotRef: 'snap-uuid',
      disclaimerVersion: 'dshea-2026-06',
    };

    const result = await recordRecommendationAudit('user-a', input);
    expect(result).toBe(true);
    expect(insertMock).toHaveBeenCalledOnce();

    const insertArg = insertMock.mock.calls[0][0];
    const row = Array.isArray(insertArg) ? insertArg[0] : insertArg;
    expect(row).toMatchObject({
      user_id: 'user-a',
      inputs_hash: 'abc123',
      disclaimer_version: 'dshea-2026-06',
    });
    expect(row.rule_ids).toEqual(['rule-001', 'rule-hfe']);
    expect(row.snapshot_ref).toBe('snap-uuid');
  });

  it('sets snapshot_ref to null when not provided', async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: insertMock }),
    });

    const input = {
      inputsHash: 'def456',
      ruleIds: [],
      disclaimerVersion: 'dshea-2026-06',
    };

    await recordRecommendationAudit('user-b', input);
    const row = insertMock.mock.calls[0][0];
    const r = Array.isArray(row) ? row[0] : row;
    expect(r.snapshot_ref).toBeNull();
  });

  it('returns false and does not throw when insert fails (fail-open)', async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'insert error' } });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: insertMock }),
    });

    const result = await recordRecommendationAudit('user-c', {
      inputsHash: 'xyz',
      ruleIds: [],
      disclaimerVersion: 'dshea-2026-06',
    });
    expect(result).toBe(false);
  });

  it('returns false and does not throw when insert throws (fail-open)', async () => {
    const insertMock = vi.fn().mockRejectedValue(new Error('unexpected crash'));
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: insertMock }),
    });

    const result = await recordRecommendationAudit('user-d', {
      inputsHash: 'xyz',
      ruleIds: [],
      disclaimerVersion: 'dshea-2026-06',
    });
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getActiveEmbeddingVersion
// ---------------------------------------------------------------------------

describe('getActiveEmbeddingVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the active embedding version row', async () => {
    const row = { model: 'text-embedding-3-small', version: 'v1', dimension: 1536 };
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [row], error: null }),
      }),
    });

    const result = await getActiveEmbeddingVersion();
    expect(result).not.toBeNull();
    expect(result!.model).toBe('text-embedding-3-small');
    expect(result!.version).toBe('v1');
    expect(result!.dimension).toBe(1536);
  });

  it('returns null when no active row exists (fail-open)', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const result = await getActiveEmbeddingVersion();
    expect(result).toBeNull();
  });

  it('returns null when query errors (fail-open)', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'query error' } }),
      }),
    });

    const result = await getActiveEmbeddingVersion();
    expect(result).toBeNull();
  });

  it('returns null when query throws (fail-open)', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error('crash')),
      }),
    });

    const result = await getActiveEmbeddingVersion();
    expect(result).toBeNull();
  });
});
