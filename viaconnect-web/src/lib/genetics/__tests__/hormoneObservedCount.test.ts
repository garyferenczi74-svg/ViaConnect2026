import { describe, expect, it } from 'vitest';
import {
  countHormoneMarkers,
  uniqueHormoneMarkers,
} from '../hormoneObservedCount';

describe('countHormoneMarkers', () => {
  it('counts DUTCH metabolites even when the name is not a classic hormone word', () => {
    const count = countHormoneMarkers([
      { name: '2-OH-E1', lab_name: 'Precision Analytical (DUTCH)' },
      { name: 'a-THF', source_filename: 'dutch-complete.pdf' },
      { name: '2-OH-E1', lab_name: 'DUTCH Complete' },
    ]);
    expect(count).toBe(2);
  });

  it('counts hormone-like markers from a non-DUTCH lab upload', () => {
    const count = countHormoneMarkers([
      { name: 'Estradiol', lab_name: 'Quest' },
      { name: 'Glucose', lab_name: 'Quest' },
    ]);
    expect(count).toBe(1);
  });

  it('never uses a user_variants SNP length as the HormoneIQ count', () => {
    const snpLength = 14;
    const hormoneRows = [
      { name: 'Cortisol', source_type: 'dutch' },
      { name: 'Melatonin', source_type: 'dutch' },
    ];
    expect(countHormoneMarkers(hormoneRows)).toBe(2);
    expect(countHormoneMarkers(hormoneRows)).not.toBe(snpLength);
  });
});

describe('uniqueHormoneMarkers', () => {
  it('keeps the first (latest) reading per distinct marker', () => {
    const rows = uniqueHormoneMarkers([
      { name: 'Cortisol', value: 12, unit: 'ug/dL', measured_at: '2026-08-01' },
      { name: 'cortisol', value: 9, unit: 'ug/dL', measured_at: '2026-01-01' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe(12);
  });
});
