// Prompt 208a Module B (2026-06-22): unit tests for persistDiplotypes.
// No em/en-dashes. No emojis.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetQualifiedUserVariants = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn(() => ({ insert: mockInsert }));
const mockCreateAdminClient = vi.fn(() => ({ from: mockFrom }));

vi.mock('@/lib/genetics/qc/qualifiedVariants', () => ({
  getQualifiedUserVariants: (userId: string) => mockGetQualifiedUserVariants(userId),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));
vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { computeAndPersistDiplotypes } from '../persistDiplotypes';

beforeEach(() => {
  vi.clearAllMocks();
  mockInsert.mockResolvedValue({ error: null });
});

describe('computeAndPersistDiplotypes', () => {
  it('CYP2C19 poor-metabolizer variant set -> inserts with metabolizer_phenotype poor', async () => {
    // rs4244285 AA = *2 homozygous -> poor
    mockGetQualifiedUserVariants.mockResolvedValue([
      { rsid: 'rs4244285', genotype: 'AA', status: null, gene: 'CYP2C19', panel_key: 'methylation' },
      { rsid: 'rs4986893', genotype: 'GG', status: null, gene: 'CYP2C19', panel_key: 'methylation' },
    ]);
    const calls = await computeAndPersistDiplotypes('u1');
    const cyp2c19 = calls.find((c) => c.gene === 'CYP2C19');
    expect(cyp2c19).toBeDefined();
    expect(cyp2c19!.metabolizer).toBe('poor');
    expect(mockInsert).toHaveBeenCalledTimes(1);
    const insertArg = mockInsert.mock.calls[0][0] as Record<string, unknown>[];
    const row = insertArg.find((r) => r.gene === 'CYP2C19');
    expect(row).toBeDefined();
    expect(row!.metabolizer_phenotype).toBe('poor');
  });

  it('returns [] and does not insert when no diplotype rsIDs are present', async () => {
    mockGetQualifiedUserVariants.mockResolvedValue([
      { rsid: 'rs9999999', genotype: 'AA', status: null, gene: 'UNKNOWN', panel_key: 'methylation' },
    ]);
    const calls = await computeAndPersistDiplotypes('u1');
    expect(calls).toEqual([]);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('fails open to [] when getQualifiedUserVariants throws', async () => {
    mockGetQualifiedUserVariants.mockRejectedValue(new Error('db down'));
    const calls = await computeAndPersistDiplotypes('u1');
    expect(calls).toEqual([]);
  });

  it('still returns calls when the persist insert errors (fail-open)', async () => {
    mockGetQualifiedUserVariants.mockResolvedValue([
      { rsid: 'rs4244285', genotype: 'GA', status: null, gene: 'CYP2C19', panel_key: 'methylation' },
    ]);
    mockInsert.mockResolvedValue({ error: { message: 'insert failed' } });
    const calls = await computeAndPersistDiplotypes('u1');
    expect(calls.find((c) => c.gene === 'CYP2C19')).toBeDefined();
  });

  it('still returns calls when createAdminClient throws (fail-open)', async () => {
    mockGetQualifiedUserVariants.mockResolvedValue([
      { rsid: 'rs3892097', genotype: 'GA', status: null, gene: 'CYP2D6', panel_key: 'methylation' },
    ]);
    mockCreateAdminClient.mockImplementationOnce(() => {
      throw new Error('no admin client');
    });
    const calls = await computeAndPersistDiplotypes('u1');
    expect(calls.find((c) => c.gene === 'CYP2D6')).toBeDefined();
  });

  it('CYP2D6 intermediate (rs3892097 GA) -> insert has metabolizer_phenotype intermediate', async () => {
    mockGetQualifiedUserVariants.mockResolvedValue([
      { rsid: 'rs3892097', genotype: 'GA', status: null, gene: 'CYP2D6', panel_key: 'methylation' },
    ]);
    await computeAndPersistDiplotypes('u2');
    const insertArg = mockInsert.mock.calls[0][0] as Record<string, unknown>[];
    const row = insertArg.find((r) => r.gene === 'CYP2D6');
    expect(row!.metabolizer_phenotype).toBe('intermediate');
  });
});
