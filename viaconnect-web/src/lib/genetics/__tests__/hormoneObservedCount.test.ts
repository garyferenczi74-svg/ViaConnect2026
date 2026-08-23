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

  it('does not count generic hormone names from a non-DUTCH lab', () => {
    const count = countHormoneMarkers([
      { name: 'Estradiol', lab_name: 'Quest' },
      { name: 'Cortisol', lab_name: 'Labcorp Hormone Panel' },
      { name: 'Cortisol', source_type: 'hormone' },
      { name: 'Glucose', lab_name: 'Quest' },
    ]);
    expect(count).toBe(0);
  });

  it('counts rows from an explicit hormone_iq or DUTCH source table', () => {
    const count = countHormoneMarkers([
      { name: '2-OH-E1', source_type: 'hormone_iq' },
      { name: 'a-THF', fromHormoneIqTable: true },
    ]);
    expect(count).toBe(2);
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
      { name: 'Cortisol', value: 12, unit: 'ug/dL', measured_at: '2026-08-01', source_type: 'dutch' },
      { name: 'cortisol', value: 9, unit: 'ug/dL', measured_at: '2026-01-01', source_type: 'dutch' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe(12);
  });
});
