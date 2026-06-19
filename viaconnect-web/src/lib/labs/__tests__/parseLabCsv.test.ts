import { describe, it, expect } from 'vitest';
import { parseLabCsv } from '../parseLabCsv';

describe('parseLabCsv', () => {
  it('parses a name/value/unit/range CSV', () => {
    const csv = 'Biomarker,Value,Unit,Reference Range\nVitamin D,35,ng/mL,30-100\nTSH,2.1,uIU/mL,0.4-4.0';
    const out = parseLabCsv(csv);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ name: 'Vitamin D', value: 35, unit: 'ng/mL', referenceLow: 30, referenceHigh: 100, flag: 'normal' });
    expect(out[1]).toMatchObject({ name: 'TSH', value: 2.1, referenceLow: 0.4, referenceHigh: 4 });
  });

  it('parses separate Low/High columns and computes flags', () => {
    const csv = 'Test,Result,Units,Low,High\nGlucose,110,mg/dL,70,99\nFerritin,8,ng/mL,30,400';
    const out = parseLabCsv(csv);
    expect(out[0]).toMatchObject({ name: 'Glucose', value: 110, flag: 'high' });
    expect(out[1]).toMatchObject({ name: 'Ferritin', value: 8, flag: 'low' });
  });

  it('honors quoted fields containing commas', () => {
    const csv = 'Name,Value,Unit\n"Glucose, Fasting",92,mg/dL';
    const out = parseLabCsv(csv);
    expect(out[0]).toMatchObject({ name: 'Glucose, Fasting', value: 92, unit: 'mg/dL' });
  });

  it('skips rows with no name or a non-numeric value, and dedupes', () => {
    const csv = 'Marker,Value,Unit\nVitamin D,35,ng/mL\n,50,ng/mL\nTSH,pending,uIU/mL\nVitamin D,40,ng/mL';
    const out = parseLabCsv(csv);
    expect(out.map((b) => b.name)).toEqual(['Vitamin D']);
  });

  it('returns empty when there is no recognizable header', () => {
    expect(parseLabCsv('foo,bar\n1,2')).toEqual([]);
    expect(parseLabCsv('')).toEqual([]);
  });
});
