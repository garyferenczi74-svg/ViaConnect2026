/**
 * Unit tests for secondaryFindings.ts
 * TDD: written RED first, then implementation makes them GREEN.
 *
 * Prompt 208a, Module I, Task I2 (2026-06-21).
 * No em/en-dashes. No emojis.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock admin client
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/admin';
import { getSecondaryFindingsGenes, isSecondaryFindingGene } from '../secondaryFindings';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDbMock(rows: Array<{ gene: string }> | null, error: object | null = null) {
  const result = { data: rows, error };
  const chain = {
    select: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => void) => resolve(result),
  };
  return {
    from: vi.fn().mockReturnValue(chain),
  };
}

// ---------------------------------------------------------------------------
// Tests: getSecondaryFindingsGenes
// ---------------------------------------------------------------------------

describe('getSecondaryFindingsGenes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a Set of uppercased gene names from the DB rows', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeDbMock([
        { gene: 'BRCA1' },
        { gene: 'BRCA2' },
        { gene: 'Lynch' },
      ]),
    );

    const result = await getSecondaryFindingsGenes();

    expect(result).toBeInstanceOf(Set);
    expect(result.has('BRCA1')).toBe(true);
    expect(result.has('BRCA2')).toBe(true);
    expect(result.has('LYNCH')).toBe(true);
  });

  it('uppercases gene names before adding to the Set', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeDbMock([{ gene: 'brca1' }, { gene: 'Tp53' }]),
    );

    const result = await getSecondaryFindingsGenes();
    expect(result.has('BRCA1')).toBe(true);
    expect(result.has('TP53')).toBe(true);
    expect(result.has('brca1')).toBe(false);
  });

  it('returns empty Set on DB error (fail-open)', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeDbMock(null, { message: 'relation does not exist' }),
    );

    const result = await getSecondaryFindingsGenes();
    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });

  it('returns empty Set when createAdminClient throws (fail-open)', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('env not configured');
    });

    const result = await getSecondaryFindingsGenes();
    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });

  it('returns empty Set when data is null but no error (fail-open)', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(makeDbMock(null));

    const result = await getSecondaryFindingsGenes();
    expect(result.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: isSecondaryFindingGene
// ---------------------------------------------------------------------------

describe('isSecondaryFindingGene', () => {
  const sfGenes = new Set(['BRCA1', 'BRCA2', 'TP53', 'LYNCH']);

  it('returns true for a gene that is in the SF set (exact case)', () => {
    expect(isSecondaryFindingGene('BRCA1', sfGenes)).toBe(true);
  });

  it('returns true for a gene in lowercase (case-insensitive)', () => {
    expect(isSecondaryFindingGene('brca1', sfGenes)).toBe(true);
    expect(isSecondaryFindingGene('brca2', sfGenes)).toBe(true);
    expect(isSecondaryFindingGene('tp53', sfGenes)).toBe(true);
  });

  it('returns false for a gene not in the SF set', () => {
    expect(isSecondaryFindingGene('MTHFR', sfGenes)).toBe(false);
    expect(isSecondaryFindingGene('HFE', sfGenes)).toBe(false);
    expect(isSecondaryFindingGene('COMT', sfGenes)).toBe(false);
  });

  it('returns false for null gene (fail-safe)', () => {
    expect(isSecondaryFindingGene(null, sfGenes)).toBe(false);
  });

  it('returns false for empty string gene', () => {
    expect(isSecondaryFindingGene('', sfGenes)).toBe(false);
  });

  it('returns false when sfGenes is empty', () => {
    expect(isSecondaryFindingGene('BRCA1', new Set())).toBe(false);
  });
});
