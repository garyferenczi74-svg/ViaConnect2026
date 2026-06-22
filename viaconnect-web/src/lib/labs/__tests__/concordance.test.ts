import { describe, it, expect } from 'vitest';
import {
  concordanceState,
  buildConcordances,
  variantPresent,
  CONCORDANCE_RULES,
} from '../concordance';

describe('variantPresent', () => {
  it('treats +/+ and +/- as present, -/- and null as absent', () => {
    expect(variantPresent('+/+')).toBe(true);
    expect(variantPresent('+/-')).toBe(true);
    expect(variantPresent('-/-')).toBe(false);
    expect(variantPresent(null)).toBe(false);
  });
});

describe('concordanceState', () => {
  const range = { low: 5, high: 10 };

  it('MTHFR variant + elevated homocysteine is concordant / high confidence', () => {
    expect(concordanceState(true, 14, range, 'high')).toEqual({
      state: 'concordant',
      confidence: 'high',
    });
  });

  it('MTHFR variant + normal homocysteine is predisposition_only / moderate (softened)', () => {
    expect(concordanceState(true, 8, range, 'high')).toEqual({
      state: 'predisposition_only',
      confidence: 'moderate',
    });
  });

  it('variant + biomarker pushed the opposite way is discordant / low (surface it)', () => {
    expect(concordanceState(true, 3, range, 'high')).toEqual({
      state: 'discordant',
      confidence: 'low',
    });
  });

  it('returns null when the variant is absent', () => {
    expect(concordanceState(false, 14, range, 'high')).toBeNull();
  });

  it('softens to predisposition_only when there is no measured value or range', () => {
    expect(concordanceState(true, null, range, 'high')).toEqual({
      state: 'predisposition_only',
      confidence: 'moderate',
    });
    expect(concordanceState(true, 14, null, 'high')).toEqual({
      state: 'predisposition_only',
      confidence: 'moderate',
    });
  });

  it('handles low-risk-direction biomarkers (e.g. MTR -> low B12)', () => {
    const b12 = { low: 400, high: 1000 };
    expect(concordanceState(true, 300, b12, 'low')).toEqual({
      state: 'concordant',
      confidence: 'high',
    });
    expect(concordanceState(true, 600, b12, 'low')).toEqual({
      state: 'predisposition_only',
      confidence: 'moderate',
    });
  });
});

describe('buildConcordances', () => {
  it('matches gene+lab pairs and classifies them', () => {
    const records = buildConcordances(
      [
        { gene: 'MTHFR', status: '+/+' },
        { gene: 'VDR', status: '+/-' },
      ],
      [
        { biomarker: 'homocysteine', value: 14, range: { low: 5, high: 10 } },
        { biomarker: 'vitamin_d', value: 60, range: { low: 40, high: 80 } },
      ],
    );
    const mthfr = records.find((r) => r.gene === 'MTHFR');
    expect(mthfr?.state).toBe('concordant');
    const vdr = records.find((r) => r.gene === 'VDR');
    expect(vdr?.state).toBe('predisposition_only');
  });

  it('skips a rule when the user lacks the gene or the lab', () => {
    const records = buildConcordances(
      [{ gene: 'MTHFR', status: '+/+' }],
      [], // no labs
    );
    expect(records).toEqual([]);
  });

  it('has well-formed rules', () => {
    expect(CONCORDANCE_RULES.length).toBeGreaterThan(0);
    for (const r of CONCORDANCE_RULES) {
      expect(r.gene).toBeTruthy();
      expect(r.biomarker).toBeTruthy();
      expect(['high', 'low']).toContain(r.riskDirection);
    }
  });
});
