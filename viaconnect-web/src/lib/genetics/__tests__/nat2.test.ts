// Prompt 204 follow-up (go-live blocker 2): tests for the NAT2 composite
// acetylator resolver. They lock the slow-allele count rule (3 slow-defining tag
// SNPs), the rapid / intermediate / slow thresholds, the required-SNP null guard,
// order independence, the rs1208 functional tag being ignored, and the
// untiered (null) severity posture.

import { describe, it, expect } from 'vitest';
import {
  nat2AcetylatorPhenotype,
  nat2PhenotypeLabel,
  nat2SeverityTier,
} from '../nat2';

// All three slow-defining SNPs homozygous reference (rs1801280 ref T, rs1799930
// ref G, rs1799931 ref G): zero slow alleles -> rapid.
const ALL_REFERENCE = {
  rs1801280: 'TT',
  rs1799930: 'GG',
  rs1799931: 'GG',
};

describe('nat2AcetylatorPhenotype', () => {
  it('rapid: zero slow alleles across the three tag SNPs', () => {
    expect(nat2AcetylatorPhenotype(ALL_REFERENCE)).toBe('rapid');
  });

  it('intermediate: exactly one slow allele (a single heterozygous tag)', () => {
    expect(
      nat2AcetylatorPhenotype({ ...ALL_REFERENCE, rs1801280: 'TC' }),
    ).toBe('intermediate');
    expect(
      nat2AcetylatorPhenotype({ ...ALL_REFERENCE, rs1799930: 'GA' }),
    ).toBe('intermediate');
  });

  it('slow: two slow alleles, whether one homozygous variant or two heterozygous tags', () => {
    // Homozygous variant at one tag = 2 slow alleles.
    expect(
      nat2AcetylatorPhenotype({ ...ALL_REFERENCE, rs1801280: 'CC' }),
    ).toBe('slow');
    // Two different heterozygous tags = 2 slow alleles.
    expect(
      nat2AcetylatorPhenotype({ ...ALL_REFERENCE, rs1801280: 'TC', rs1799931: 'GA' }),
    ).toBe('slow');
  });

  it('caps the slow-allele count at 2 (more than two variant alleles still slow)', () => {
    // Three heterozygous tags = 3 variant alleles, capped at 2 -> slow.
    expect(
      nat2AcetylatorPhenotype({ rs1801280: 'TC', rs1799930: 'GA', rs1799931: 'GA' }),
    ).toBe('slow');
  });

  it('is order-independent on the genotype call (GA == AG)', () => {
    expect(nat2AcetylatorPhenotype({ ...ALL_REFERENCE, rs1799930: 'AG' })).toBe('intermediate');
  });

  it('returns null when any required slow-defining SNP is missing', () => {
    expect(nat2AcetylatorPhenotype({ rs1801280: 'TT', rs1799930: 'GG' })).toBeNull();
    expect(nat2AcetylatorPhenotype({})).toBeNull();
  });

  it('returns null when a required SNP is not a clean two-base call', () => {
    expect(nat2AcetylatorPhenotype({ ...ALL_REFERENCE, rs1799931: 'Slow' })).toBeNull();
    expect(nat2AcetylatorPhenotype({ ...ALL_REFERENCE, rs1799931: '' })).toBeNull();
  });

  it('ignores rs1208 (the NAT2*12 functional tag), which never adds a slow allele', () => {
    // rs1208 present as homozygous variant does not change a rapid call.
    expect(
      nat2AcetylatorPhenotype({ ...ALL_REFERENCE, rs1208: 'GG' }),
    ).toBe('rapid');
  });
});

describe('nat2PhenotypeLabel', () => {
  it('gives a descriptive acetylator label, never a severity word', () => {
    expect(nat2PhenotypeLabel('rapid')).toBe('Rapid acetylator');
    expect(nat2PhenotypeLabel('intermediate')).toBe('Intermediate acetylator');
    expect(nat2PhenotypeLabel('slow')).toBe('Slow acetylator');
  });
});

describe('nat2SeverityTier', () => {
  it('is UNTIERED: returns null for every phenotype (no invented score)', () => {
    expect(nat2SeverityTier('rapid')).toBeNull();
    expect(nat2SeverityTier('intermediate')).toBeNull();
    expect(nat2SeverityTier('slow')).toBeNull();
  });
});
