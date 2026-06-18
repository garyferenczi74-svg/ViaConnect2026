import { describe, it, expect } from 'vitest';
import { statusToImpact, buildEnrichedResults } from '../enrichBiomarkers';
import { getGeneticOptimalRange, geneForBiomarker, type GeneticProfile } from '@/lib/api/lab-service';

describe('statusToImpact', () => {
  it('maps our status notation to impact levels', () => {
    expect(statusToImpact('+/+')).toBe('high');
    expect(statusToImpact('+/-')).toBe('moderate');
    expect(statusToImpact('-/-')).toBe('low');
    expect(statusToImpact(null)).toBe('low');
  });
});

describe('geneForBiomarker', () => {
  it('attributes each genetic biomarker to its driving gene', () => {
    expect(geneForBiomarker('Vitamin D, 25-Hydroxy')).toBe('VDR');
    expect(geneForBiomarker('Homocysteine')).toBe('MTHFR');
    expect(geneForBiomarker('hs-CRP')).toBe('IL6');
    expect(geneForBiomarker('Glucose')).toBeNull();
  });
});

describe('getGeneticOptimalRange', () => {
  const vdrHigh: GeneticProfile[] = [
    { gene: 'VDR', variant: '', rs_id: 'rs2228570', genotype: '', impact: 'high', category: '' },
  ];

  it('matches varied vitamin D report names via alias', () => {
    expect(getGeneticOptimalRange('25-OH Vitamin D', vdrHigh)).toEqual({ low: 60, high: 80 });
    expect(getGeneticOptimalRange('Vitamin D, 25-Hydroxy', vdrHigh)).toEqual({ low: 60, high: 80 });
  });

  it('uses the impact fallback for homocysteine when no literal genotype exists', () => {
    const mthfrHigh: GeneticProfile[] = [
      { gene: 'MTHFR', variant: '', rs_id: 'rs1801133', genotype: '', impact: 'high', category: '' },
    ];
    expect(getGeneticOptimalRange('Homocysteine', mthfrHigh)).toEqual({ low: 5, high: 8 });
  });

  it('returns null when the member has no relevant variant', () => {
    expect(getGeneticOptimalRange('Vitamin D', [])).toBeNull();
  });
});

describe('buildEnrichedResults', () => {
  it('enriches a biomarker with the genetic optimal and a below-optimal status', () => {
    const out = buildEnrichedResults(
      [{ name: 'Vitamin D, 25-Hydroxy', value: 35, unit: 'ng/mL', reference_low: 30, reference_high: 100 }],
      [{ rsid: 'rs2228570', gene: 'VDR', genotype: null, status: '+/+' }],
    );
    expect(out[0]).toMatchObject({
      genetic_optimal_low: 60, genetic_optimal_high: 80, status: 'below_genetic_optimal',
    });
  });

  it('leaves the genetic optimal null when no variant applies', () => {
    const out = buildEnrichedResults(
      [{ name: 'Sodium', value: 140, unit: 'mmol/L', reference_low: 135, reference_high: 145 }],
      [{ rsid: 'rs2228570', gene: 'VDR', genotype: null, status: '+/+' }],
    );
    expect(out[0].genetic_optimal_low).toBeNull();
    expect(out[0].status).toBe('within_standard');
  });
});
