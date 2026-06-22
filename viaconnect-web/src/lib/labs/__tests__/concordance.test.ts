import { describe, it, expect } from 'vitest';
import {
  concordanceState,
  buildConcordances,
  variantPresent,
  CONCORDANCE_RULES,
  symptomReported,
  buildTriangulatedConcordances,
  RULE_SYMPTOMS,
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
    // discordant: low-risk biomarker pushed HIGH instead
    expect(concordanceState(true, 1200, b12, 'low')).toEqual({
      state: 'discordant',
      confidence: 'low',
    });
  });

  it('treats values exactly at the range bounds as in-range (predisposition_only)', () => {
    const r = { low: 5, high: 10 };
    expect(concordanceState(true, 5, r, 'high')).toEqual({
      state: 'predisposition_only',
      confidence: 'moderate',
    });
    expect(concordanceState(true, 10, r, 'high')).toEqual({
      state: 'predisposition_only',
      confidence: 'moderate',
    });
  });

  it('treats -/+ as present', () => {
    expect(concordanceState(false, 14, { low: 5, high: 10 }, 'high')).toBeNull();
    // variantPresent('-/+') is true, so a -/+ carrier with an elevated marker is concordant
    const r = buildConcordances(
      [{ gene: 'MTHFR', status: '-/+' }],
      [{ biomarker: 'homocysteine', value: 14, range: { low: 5, high: 10 } }],
    );
    expect(r.find((x) => x.gene === 'MTHFR')?.state).toBe('concordant');
  });
});

describe('buildConcordances case-insensitivity', () => {
  it('matches gene and biomarker regardless of case', () => {
    const records = buildConcordances(
      [{ gene: 'mthfr', status: '+/+' }],
      [{ biomarker: 'HOMOCYSTEINE', value: 14, range: { low: 5, high: 10 } }],
    );
    expect(records.find((r) => r.gene === 'MTHFR')?.state).toBe('concordant');
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

// ===========================================================================
// Prompt 208b 4.3: triangulated (three-way) concordance.
// ===========================================================================

describe('symptomReported', () => {
  it('matches when a keyword is a substring of a user symptom (case-insensitive)', () => {
    expect(symptomReported(['fatigue'], ['Chronic Fatigue and tiredness'])).toBe(true);
  });

  it('matches when a user symptom is a substring of a keyword (reverse direction)', () => {
    expect(symptomReported(['joint pain'], ['pain'])).toBe(true);
  });

  it('is case-insensitive both ways', () => {
    expect(symptomReported(['BRAIN FOG'], ['i have some brain fog lately'])).toBe(true);
    expect(symptomReported(['low mood'], ['MOOD'])).toBe(true);
  });

  it('returns false when there is no overlap', () => {
    expect(symptomReported(['inflammation'], ['headache', 'nausea'])).toBe(false);
  });

  it('returns false for an empty user symptom list', () => {
    expect(symptomReported(['fatigue'], [])).toBe(false);
  });

  it('returns false for an empty keyword list', () => {
    expect(symptomReported([], ['fatigue'])).toBe(false);
  });

  it('ignores empty or whitespace-only entries (no false positive)', () => {
    expect(symptomReported(['fatigue'], ['', '   '])).toBe(false);
    expect(symptomReported(['', '  '], ['fatigue'])).toBe(false);
  });
});

describe('RULE_SYMPTOMS', () => {
  it('keys every gene and biomarker in the rules with lowercased keywords', () => {
    for (const rule of CONCORDANCE_RULES) {
      const byGene = RULE_SYMPTOMS[rule.gene];
      const byBiomarker = RULE_SYMPTOMS[rule.biomarker];
      const keywords = byGene ?? byBiomarker;
      expect(Array.isArray(keywords)).toBe(true);
      expect((keywords ?? []).length).toBeGreaterThan(0);
      for (const k of keywords ?? []) {
        expect(k).toBe(k.toLowerCase());
      }
    }
  });
});

describe('buildTriangulatedConcordances', () => {
  const homoRange = { low: 5, high: 12 };

  it('variant + confirming lab + reported symptom -> dimensions 3, high, symptom_ref set', () => {
    const records = buildTriangulatedConcordances(
      [{ gene: 'MTHFR', status: '+/+' }],
      [{ biomarker: 'homocysteine', value: 18, range: homoRange }],
      ['persistent fatigue'],
    );
    const mthfr = records.find((r) => r.gene === 'MTHFR');
    expect(mthfr).toBeDefined();
    expect(mthfr?.state).toBe('concordant');
    expect(mthfr?.concordance_dimensions).toBe(3);
    expect(mthfr?.confidence).toBe('high');
    expect(mthfr?.symptom_ref).toBe('fatigue');
  });

  it('variant + confirming lab + NO symptom -> dimensions 2, moderate, symptom_ref null', () => {
    const records = buildTriangulatedConcordances(
      [{ gene: 'MTHFR', status: '+/+' }],
      [{ biomarker: 'homocysteine', value: 18, range: homoRange }],
      ['unrelated headache'],
    );
    const mthfr = records.find((r) => r.gene === 'MTHFR');
    expect(mthfr?.state).toBe('concordant');
    expect(mthfr?.concordance_dimensions).toBe(2);
    expect(mthfr?.confidence).toBe('moderate');
    expect(mthfr?.symptom_ref).toBeNull();
  });

  it('variant only (in-range lab, no symptom) -> dimensions 1, low', () => {
    const records = buildTriangulatedConcordances(
      [{ gene: 'MTHFR', status: '+/+' }],
      [{ biomarker: 'homocysteine', value: 8, range: homoRange }],
      [],
    );
    const mthfr = records.find((r) => r.gene === 'MTHFR');
    expect(mthfr?.state).toBe('predisposition_only');
    expect(mthfr?.concordance_dimensions).toBe(1);
    expect(mthfr?.confidence).toBe('low');
    expect(mthfr?.symptom_ref).toBeNull();
  });

  it('a 3-way reads HIGHER confidence than the same case without the symptom', () => {
    const withSymptom = buildTriangulatedConcordances(
      [{ gene: 'MTHFR', status: '+/+' }],
      [{ biomarker: 'homocysteine', value: 18, range: homoRange }],
      ['brain fog'],
    ).find((r) => r.gene === 'MTHFR');
    const withoutSymptom = buildTriangulatedConcordances(
      [{ gene: 'MTHFR', status: '+/+' }],
      [{ biomarker: 'homocysteine', value: 18, range: homoRange }],
      [],
    ).find((r) => r.gene === 'MTHFR');

    const rank = { low: 1, moderate: 2, high: 3 } as const;
    expect(withSymptom).toBeDefined();
    expect(withoutSymptom).toBeDefined();
    expect(rank[withSymptom!.confidence]).toBeGreaterThan(rank[withoutSymptom!.confidence]);
    expect(withSymptom!.concordance_dimensions).toBeGreaterThan(
      withoutSymptom!.concordance_dimensions,
    );
  });

  it('counts the biomarker dimension ONLY on genuine confirmation, not mere presence', () => {
    // In-range lab (predisposition_only) + a reported symptom: variant (1) + symptom (1) = 2.
    // The lab is present but does NOT confirm, so it must NOT add a dimension.
    const records = buildTriangulatedConcordances(
      [{ gene: 'MTHFR', status: '+/+' }],
      [{ biomarker: 'homocysteine', value: 8, range: homoRange }],
      ['fatigue'],
    );
    const mthfr = records.find((r) => r.gene === 'MTHFR');
    expect(mthfr?.state).toBe('predisposition_only');
    expect(mthfr?.concordance_dimensions).toBe(2);
    expect(mthfr?.confidence).toBe('moderate');
    expect(mthfr?.symptom_ref).toBe('fatigue');
  });

  it('a discordant lab does NOT count as a confirming dimension', () => {
    // Variant present, lab pushed the OPPOSITE way (discordant), symptom reported.
    // Only variant (1) + symptom (1) = 2; the discordant lab adds nothing.
    const records = buildTriangulatedConcordances(
      [{ gene: 'MTHFR', status: '+/+' }],
      [{ biomarker: 'homocysteine', value: 2, range: homoRange }],
      ['fatigue'],
    );
    const mthfr = records.find((r) => r.gene === 'MTHFR');
    expect(mthfr?.state).toBe('discordant');
    expect(mthfr?.concordance_dimensions).toBe(2);
  });

  it('preserves the underlying ConcordanceRecord fields and never throws on bad input', () => {
    expect(() =>
      buildTriangulatedConcordances(
        [{ gene: null, status: null }],
        [{ biomarker: 'homocysteine', value: null, range: null }],
        ['fatigue'],
      ),
    ).not.toThrow();
  });

  it('clamps dimensions into 1..3 and the base record still carries gene + biomarker', () => {
    const records = buildTriangulatedConcordances(
      [{ gene: 'VDR', status: '+/-' }],
      [{ biomarker: 'vitamin_d', value: 15, range: { low: 40, high: 80 } }],
      ['bone pain'],
    );
    const vdr = records.find((r) => r.gene === 'VDR');
    expect(vdr?.gene).toBe('VDR');
    expect(vdr?.biomarker).toBe('vitamin_d');
    expect(vdr?.concordance_dimensions).toBe(3);
    expect(vdr?.concordance_dimensions).toBeGreaterThanOrEqual(1);
    expect(vdr?.concordance_dimensions).toBeLessThanOrEqual(3);
  });
});
