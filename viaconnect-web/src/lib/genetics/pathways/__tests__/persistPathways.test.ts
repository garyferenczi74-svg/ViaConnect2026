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

import { computeAndPersistPathways } from '../persistPathways';

beforeEach(() => {
  vi.clearAllMocks();
  mockInsert.mockResolvedValue({ error: null });
});

describe('computeAndPersistPathways', () => {
  it('computes a methylation pathway score and persists it', async () => {
    mockGetQualifiedUserVariants.mockResolvedValue([
      { rsid: 'rs1801133', genotype: 'TT', status: '+/+' },
      { rsid: 'rs1801394', genotype: 'GG', status: '+/+' },
    ]);
    const scores = await computeAndPersistPathways('u1');
    const methylation = scores.find((s) => s.pathway === 'methylation');
    expect(methylation).toBeDefined();
    expect(methylation!.composite_score).toBe(4);
    expect(methylation!.severity_band).toBe('high');
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('returns [] and does not insert when there are no pathway variants', async () => {
    mockGetQualifiedUserVariants.mockResolvedValue([{ rsid: 'rs9999999', status: '+/+' }]);
    const scores = await computeAndPersistPathways('u1');
    expect(scores).toEqual([]);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('fails open to [] when getQualifiedUserVariants throws', async () => {
    mockGetQualifiedUserVariants.mockRejectedValue(new Error('db down'));
    const scores = await computeAndPersistPathways('u1');
    expect(scores).toEqual([]);
  });

  it('still returns the scores when the persist insert errors (fail-open persist)', async () => {
    mockGetQualifiedUserVariants.mockResolvedValue([{ rsid: 'rs1801133', status: '+/+' }]);
    mockInsert.mockResolvedValue({ error: { message: 'insert failed' } });
    const scores = await computeAndPersistPathways('u1');
    expect(scores.find((s) => s.pathway === 'methylation')).toBeDefined();
  });

  it('still returns the scores when createAdminClient throws', async () => {
    mockGetQualifiedUserVariants.mockResolvedValue([{ rsid: 'rs1801133', status: '+/+' }]);
    mockCreateAdminClient.mockImplementationOnce(() => {
      throw new Error('no admin client');
    });
    const scores = await computeAndPersistPathways('u1');
    expect(scores.find((s) => s.pathway === 'methylation')).toBeDefined();
  });
});
