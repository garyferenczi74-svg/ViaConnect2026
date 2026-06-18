import { describe, it, expect } from 'vitest';
import {
  normalizeVariantLabel,
  lookupMethylationVariant,
  isMethylationStatus,
  METHYLATION_BY_RSID,
  METHYLATION_VARIANTS,
} from '../methylationPanelMap';
import { mapMethylationRows, interpretMethylationByRsid } from '../extractMethylationReport';

describe('normalizeVariantLabel', () => {
  it('strips slashes, spaces, and case', () => {
    expect(normalizeVariantLabel('MTHFR/C677T')).toBe('MTHFRC677T');
    expect(normalizeVariantLabel('MTHFR C677T')).toBe('MTHFRC677T');
    expect(normalizeVariantLabel('mthfr c677t')).toBe('MTHFRC677T');
  });
});

describe('lookupMethylationVariant', () => {
  it('maps a report label to its rsID and gene', () => {
    expect(lookupMethylationVariant('MTHFR/C677T')).toMatchObject({ rsid: 'rs1801133', gene: 'MTHFR' });
    expect(lookupMethylationVariant('VDR Fok1')).toMatchObject({ rsid: 'rs2228570', gene: 'VDR' });
    expect(lookupMethylationVariant('COMT V158M')).toMatchObject({ rsid: 'rs4680', gene: 'COMT' });
  });
  it('returns null for a label not in the map (never guessed)', () => {
    expect(lookupMethylationVariant('SUOX S370S')).toBeNull();
    expect(lookupMethylationVariant('nonsense')).toBeNull();
  });
});

describe('isMethylationStatus', () => {
  it('accepts only the three printed statuses', () => {
    expect(isMethylationStatus('+/+')).toBe(true);
    expect(isMethylationStatus('+/-')).toBe(true);
    expect(isMethylationStatus('-/-')).toBe(true);
    expect(isMethylationStatus('Hetero')).toBe(false);
    expect(isMethylationStatus(null)).toBe(false);
  });
});

describe('METHYLATION_BY_RSID', () => {
  it('reverse-indexes every map entry by rsID', () => {
    expect(Object.keys(METHYLATION_BY_RSID).length).toBe(Object.keys(METHYLATION_VARIANTS).length);
    expect(METHYLATION_BY_RSID['rs1801133']).toMatchObject({ gene: 'MTHFR' });
  });
});

describe('mapMethylationRows', () => {
  it('keeps known labels with valid status, drops unknown and dupes', () => {
    const out = mapMethylationRows([
      { variant: 'MTHFR/C677T', status: '+/-' },
      { variant: 'VDR Fok1', status: '+/+' },
      { variant: 'SUOX S370S', status: '-/-' }, // not in map -> dropped
      { variant: 'MTHFR C677T', status: '-/-' }, // duplicate rsID -> dropped
      { variant: 'COMT V158M', status: 'Hetero' }, // invalid status -> dropped
    ]);
    expect(out.map((v) => v.rsid)).toEqual(['rs1801133', 'rs2228570']);
    expect(out[0]).toMatchObject({ gene: 'MTHFR', panel_key: 'methylation', status: '+/-', genotype: '' });
  });
});

describe('interpretMethylationByRsid', () => {
  it('re-derives gene, panel, and clinical from the rsID, keeping the verified status', () => {
    const v = interpretMethylationByRsid('rs4680', '+/+');
    expect(v).toMatchObject({ rsid: 'rs4680', gene: 'COMT', panel_key: 'methylation', status: '+/+' });
    expect(v?.clinical_significance).toContain('COMT');
  });
  it('returns null for an unknown rsID or invalid status', () => {
    expect(interpretMethylationByRsid('rs9999999', '+/-')).toBeNull();
    expect(interpretMethylationByRsid('rs4680', 'bad')).toBeNull();
  });
});
