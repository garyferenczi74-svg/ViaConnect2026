import { describe, it, expect } from 'vitest';
import { parseLabReportText } from '../parseLabReportText';

describe('parseLabReportText', () => {
  it('parses name, value, unit, and a plain reference range', () => {
    const [b] = parseLabReportText('Vitamin D 45 ng/mL 30-100');
    expect(b).toMatchObject({
      name: 'Vitamin D', value: 45, unit: 'ng/mL', referenceLow: 30, referenceHigh: 100, flag: 'normal',
    });
    expect(b.context).toBe('Vitamin D 45 ng/mL 30-100');
  });

  it('handles bracketed ranges and a colon after the name', () => {
    const [b] = parseLabReportText('Glucose, Fasting: 92 mg/dL [70-99]');
    expect(b).toMatchObject({ name: 'Glucose, Fasting', value: 92, unit: 'mg/dL', flag: 'normal' });
  });

  it('handles parenthesized ranges and decimals', () => {
    const [b] = parseLabReportText('TSH 2.1 mIU/L (0.4-4.0)');
    expect(b).toMatchObject({ name: 'TSH', value: 2.1, referenceLow: 0.4, referenceHigh: 4, flag: 'normal' });
  });

  it('flags out-of-range values low and high', () => {
    expect(parseLabReportText('Ferritin 8 ng/mL 30-400')[0].flag).toBe('low');
    expect(parseLabReportText('LDL 190 mg/dL 0-100')[0].flag).toBe('high');
  });

  it('accepts the word "to" as a range separator', () => {
    const [b] = parseLabReportText('HDL 55 mg/dL 40 to 60');
    expect(b).toMatchObject({ name: 'HDL', value: 55, referenceLow: 40, referenceHigh: 60 });
  });

  it('accepts a real unit with no range, and leaves flag null', () => {
    const [b] = parseLabReportText('Sodium 140 mmol/L');
    expect(b).toMatchObject({ name: 'Sodium', value: 140, unit: 'mmol/L', flag: null });
  });

  it('parses comma-thousands values and a slash-leading unit', () => {
    const [b] = parseLabReportText('Platelets 250,000 /uL');
    expect(b).toMatchObject({ name: 'Platelets', value: 250000, unit: '/uL' });
  });

  it('rejects noise lines that are not biomarkers', () => {
    expect(parseLabReportText('Page 2 of 5')).toEqual([]);
    expect(parseLabReportText('Collected 2026-01-01 at 8am')).toEqual([]);
    expect(parseLabReportText('Report for John Smith')).toEqual([]);
  });

  it('parses a multi-line report and dedupes repeated names', () => {
    const text = 'Vitamin D 45 ng/mL 30-100\nTSH 2.1 mIU/L 0.4-4.0\nVitamin D 45 ng/mL 30-100';
    const out = parseLabReportText(text);
    expect(out.map((b) => b.name)).toEqual(['Vitamin D', 'TSH']);
  });
});
