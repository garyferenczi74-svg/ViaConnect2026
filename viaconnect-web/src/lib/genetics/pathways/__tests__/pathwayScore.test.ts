import { describe, it, expect } from 'vitest';
import {
  PATHWAY_DEFINITIONS,
  statusWeight,
  computePathwayScores,
} from '../pathwayScore';

describe('statusWeight', () => {
  it('weights zygosity by risk-allele copies', () => {
    expect(statusWeight('+/+')).toBe(2);
    expect(statusWeight('+/-')).toBe(1);
    expect(statusWeight('-/+')).toBe(1);
    expect(statusWeight('-/-')).toBe(0);
    expect(statusWeight(null)).toBe(0);
    expect(statusWeight('')).toBe(0);
    expect(statusWeight(' +/+ ')).toBe(2);
  });
});

describe('PATHWAY_DEFINITIONS', () => {
  it('includes the canonical methylation markers and has no empty rsIDs', () => {
    const methylation = PATHWAY_DEFINITIONS.find((p) => p.key === 'methylation');
    expect(methylation).toBeDefined();
    expect(methylation!.componentRsids).toContain('rs1801133');
    for (const def of PATHWAY_DEFINITIONS) {
      expect(def.componentRsids.length).toBeGreaterThan(0);
      for (const rsid of def.componentRsids) {
        expect(rsid).toMatch(/^rs\d+$/);
      }
    }
  });

  it('has no duplicate pathway keys', () => {
    const keys = PATHWAY_DEFINITIONS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('computePathwayScores', () => {
  it('aggregates a multi-variant methylation load to a high band', () => {
    const scores = computePathwayScores([
      { rsid: 'rs1801133', status: '+/+' }, // MTHFR, weight 2
      { rsid: 'rs1801394', status: '+/+' }, // MTRR, weight 2
      { rsid: 'rs4680', status: '+/-' }, // COMT, weight 1
    ]);
    const methylation = scores.find((s) => s.pathway === 'methylation');
    expect(methylation).toBeDefined();
    expect(methylation!.composite_score).toBe(5);
    expect(methylation!.severity_band).toBe('high');
    expect(methylation!.component_variants).toHaveLength(3);
  });

  it('scores a single heterozygous variant as low (aggregate, not single-variant, drives the band)', () => {
    const scores = computePathwayScores([{ rsid: 'rs1801133', status: '+/-' }]);
    const methylation = scores.find((s) => s.pathway === 'methylation');
    expect(methylation).toBeDefined();
    expect(methylation!.composite_score).toBe(1);
    expect(methylation!.severity_band).toBe('low');
  });

  it('reaches moderate as the aggregate load climbs', () => {
    const scores = computePathwayScores([
      { rsid: 'rs1801133', status: '+/+' }, // weight 2
    ]);
    expect(scores.find((s) => s.pathway === 'methylation')!.severity_band).toBe('moderate');
  });

  it('omits pathways with no component variants present', () => {
    const scores = computePathwayScores([{ rsid: 'rs1801133', status: '+/+' }]);
    expect(scores.find((s) => s.pathway === 'detox_antioxidant')).toBeUndefined();
    expect(scores.find((s) => s.pathway === 'vitamin_d')).toBeUndefined();
  });

  it('returns an empty array when no known pathway variants are present', () => {
    expect(computePathwayScores([{ rsid: 'rs9999999', status: '+/+' }])).toEqual([]);
    expect(computePathwayScores([])).toEqual([]);
  });

  it('counts -/- present components as zero load (low)', () => {
    const scores = computePathwayScores([
      { rsid: 'rs2228570', status: '-/-' },
      { rsid: 'rs1544410', status: '-/-' },
    ]);
    const vd = scores.find((s) => s.pathway === 'vitamin_d');
    expect(vd).toBeDefined();
    expect(vd!.composite_score).toBe(0);
    expect(vd!.severity_band).toBe('low');
  });
});
