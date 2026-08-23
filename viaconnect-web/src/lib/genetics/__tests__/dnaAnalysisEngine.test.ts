import { describe, it, expect } from 'vitest';
import {
  computeStatus,
  analyzeVariants,
  groupVariantsByPanel,
  type ParsedSnpRow,
} from '../dnaAnalysisEngine';
import {
  resolvePanelLabel,
  panelKeyForProductCode,
  panelKeyForSlug,
  PANEL_LABELS,
} from '../panelLabels';

describe('computeStatus', () => {
  it('returns -/- for homozygous wild type (zero risk alleles)', () => {
    expect(computeStatus('CC', 'T')).toBe('-/-');
  });
  it('returns +/- for heterozygous (one risk allele)', () => {
    expect(computeStatus('CT', 'T')).toBe('+/-');
    expect(computeStatus('TC', 'T')).toBe('+/-');
  });
  it('returns +/+ for homozygous variant (two risk alleles)', () => {
    expect(computeStatus('TT', 'T')).toBe('+/+');
  });
  it('is case and whitespace tolerant', () => {
    expect(computeStatus(' ct ', 't')).toBe('+/-');
  });
  it('returns null for a no-call or malformed genotype', () => {
    expect(computeStatus('--', 'T')).toBeNull();
    expect(computeStatus('00', 'T')).toBeNull();
    expect(computeStatus('I', 'T')).toBeNull();
    expect(computeStatus('CTA', 'T')).toBeNull();
    expect(computeStatus('', 'T')).toBeNull();
  });
});

describe('analyzeVariants', () => {
  const rows: ParsedSnpRow[] = [
    { rsid: 'rs1801133', chromosome: '1', position: '11856378', genotype: 'TT' }, // MTHFR methylation +/+
    { rsid: 'rs9939609', chromosome: '16', position: '53820527', genotype: 'AT' }, // FTO nutrition +/-
    { rsid: 'rs1815739', chromosome: '11', position: '66560624', genotype: 'CC' }, // ACTN3 nutrition -/-
    { rsid: 'rs0000000', chromosome: '9', position: '1', genotype: 'AA' }, // not annotated -> dropped
    { rsid: 'rs1544410', chromosome: '12', position: '1', genotype: '--' }, // no-call -> dropped
  ];

  it('interprets only annotated, clean-call rows', () => {
    const out = analyzeVariants(rows);
    expect(out).toHaveLength(3);
    expect(out.map((v) => v.rsid)).toEqual(['rs1801133', 'rs9939609', 'rs1815739']);
  });

  it('assigns status, panel, gene, and alleles deterministically', () => {
    const out = analyzeVariants(rows);
    expect(out[0]).toMatchObject({
      rsid: 'rs1801133', gene: 'MTHFR', panel_key: 'methylation', status: '+/+', allele1: 'T', allele2: 'T',
    });
    expect(out[1]).toMatchObject({ gene: 'FTO', panel_key: 'nutrition', status: '+/-' });
    expect(out[2]).toMatchObject({ gene: 'ACTN3', panel_key: 'nutrition', status: '-/-' });
  });

  it('drops unannotated rsIDs and no-calls rather than guessing', () => {
    const out = analyzeVariants(rows);
    expect(out.find((v) => v.rsid === 'rs0000000')).toBeUndefined();
    expect(out.find((v) => v.rsid === 'rs1544410')).toBeUndefined();
  });

  it('carries clinical_significance straight from the annotation set', () => {
    const out = analyzeVariants([rows[0]]);
    expect(out[0].clinical_significance).toContain('MTHFR C677T');
  });
});

describe('groupVariantsByPanel', () => {
  it('groups by panel_key', () => {
    const grouped = groupVariantsByPanel(analyzeVariants([
      { rsid: 'rs1801133', chromosome: '1', position: '1', genotype: 'TT' },
      { rsid: 'rs9939609', chromosome: '16', position: '2', genotype: 'AA' },
      { rsid: 'rs1815739', chromosome: '11', position: '3', genotype: 'CT' },
    ]));
    expect(grouped.methylation).toHaveLength(1);
    expect(grouped.nutrition).toHaveLength(2);
    expect(grouped.hormone).toBeUndefined();
  });
});

describe('resolvePanelLabel', () => {
  it('returns the generic label by default (competitor upload, no branded test)', () => {
    expect(resolvePanelLabel('methylation', false)).toBe('Genetic Methylation');
    expect(resolvePanelLabel('nutrition', false)).toBe('Genetic Nutrition');
    expect(resolvePanelLabel('cannabis', false)).toBe('Cannabis Response');
  });

  it('returns the branded label when a branded test backs the panel', () => {
    expect(resolvePanelLabel('methylation', true)).toBe('GeneXM');
    expect(resolvePanelLabel('nutrition', true, 'NUTRIGENDX')).toBe('NutrigenDX');
  });

  it('does not flip to branded when the product code is for a different panel', () => {
    expect(resolvePanelLabel('methylation', true, 'NUTRIGENDX')).toBe('Genetic Methylation');
  });
});

describe('panel lookups', () => {
  it('maps a product code to its panel_key', () => {
    expect(panelKeyForProductCode('GENEXM')).toBe('methylation');
    expect(panelKeyForProductCode(' nutrigendx ')).toBe('nutrition');
    expect(panelKeyForProductCode('UNKNOWN')).toBeNull();
    expect(panelKeyForProductCode(null)).toBeNull();
  });
  it('maps a panel slug to its panel_key', () => {
    expect(panelKeyForSlug('genex-m')).toBe('methylation');
    expect(panelKeyForSlug('cannabis-iq')).toBe('cannabis');
    expect(panelKeyForSlug('nope')).toBeNull();
  });
  it('every panel has all six distinct generic labels', () => {
    const generics = Object.values(PANEL_LABELS).map((p) => p.generic_label);
    expect(new Set(generics).size).toBe(6);
  });
});
