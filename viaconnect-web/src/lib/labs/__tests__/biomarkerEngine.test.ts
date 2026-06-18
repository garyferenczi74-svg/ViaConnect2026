import { describe, it, expect } from 'vitest';
import { matchBiomarker, panelGroupFor, biomarkerKeyFor } from '../biomarkerDictionary';
import { determineStatus, applicableRange } from '../biomarkerStatus';

describe('matchBiomarker', () => {
  it('matches varied report names to canonical entries', () => {
    expect(matchBiomarker('Vitamin D, 25-Hydroxy')?.key).toBe('vitamin_d');
    expect(matchBiomarker('LDL Cholesterol')?.key).toBe('ldl');
    expect(matchBiomarker('Free T3')?.key).toBe('free_t3');
    expect(matchBiomarker('Glucose, Fasting')?.key).toBe('glucose');
    expect(matchBiomarker('hs-CRP')?.key).toBe('hscrp');
  });
  it('returns null for an unknown marker (never guessed)', () => {
    expect(matchBiomarker('Some Unlisted Analyte')).toBeNull();
    expect(matchBiomarker('')).toBeNull();
  });
});

describe('panelGroupFor', () => {
  it('groups markers into panels', () => {
    expect(panelGroupFor('TSH')).toBe('Hormones');
    expect(panelGroupFor('LDL')).toBe('Lipids');
    expect(panelGroupFor('Hemoglobin')).toBe('Complete blood count');
    expect(panelGroupFor('Homocysteine')).toBe('Inflammatory');
    expect(panelGroupFor('Ferritin')).toBe('Vitamins and minerals');
    expect(panelGroupFor('Glucose')).toBe('Metabolic');
  });
  it('falls back to Other for unmatched markers', () => {
    expect(panelGroupFor('Mystery Marker')).toBe('Other');
  });
});

describe('biomarkerKeyFor', () => {
  it('uses the canonical key when matched, else a slug', () => {
    expect(biomarkerKeyFor('hs-CRP')).toBe('hscrp');
    expect(biomarkerKeyFor('Mystery Marker 2')).toBe('mystery_marker_2');
  });
});

describe('applicableRange', () => {
  it('prefers the printed range when valid', () => {
    expect(applicableRange({ low: 30, high: 100 }, { low: 40, high: 80 })).toEqual({ low: 30, high: 100 });
  });
  it('falls back to canonical when printed is missing or invalid', () => {
    expect(applicableRange(null, { low: 40, high: 80 })).toEqual({ low: 40, high: 80 });
    expect(applicableRange({ low: 100, high: 30 }, { low: 40, high: 80 })).toEqual({ low: 40, high: 80 });
  });
  it('returns null when neither is usable', () => {
    expect(applicableRange(null, null)).toBeNull();
  });
});

describe('determineStatus', () => {
  const range = { low: 30, high: 100 }; // width 70, monitor margin 0.5 -> 35

  it('is optimal within the range', () => {
    expect(determineStatus(60, range)).toEqual({ tier: 'optimal', direction: 'within' });
    expect(determineStatus(30, range)).toEqual({ tier: 'optimal', direction: 'within' });
  });
  it('is monitor when mildly out of range', () => {
    expect(determineStatus(110, range)).toEqual({ tier: 'monitor', direction: 'above' });
    expect(determineStatus(20, range)).toEqual({ tier: 'monitor', direction: 'below' });
  });
  it('is consult when far out of range', () => {
    expect(determineStatus(200, range)).toEqual({ tier: 'consult', direction: 'above' });
    expect(determineStatus(-20, range)).toEqual({ tier: 'consult', direction: 'below' });
  });
  it('is unknown with no value or no range', () => {
    expect(determineStatus(null, range)).toEqual({ tier: 'unknown', direction: 'unknown' });
    expect(determineStatus(60, null)).toEqual({ tier: 'unknown', direction: 'unknown' });
  });
});
