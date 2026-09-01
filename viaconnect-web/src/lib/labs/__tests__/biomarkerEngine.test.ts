import { describe, it, expect } from 'vitest';
import { matchBiomarker, panelGroupFor, biomarkerKeyFor } from '../biomarkerDictionary';
import { determineStatus, applicableRange, isCriticalValue, statusForBiomarker } from '../biomarkerStatus';

describe('matchBiomarker', () => {
  it('matches varied report names to canonical entries', () => {
    expect(matchBiomarker('Vitamin D, 25-Hydroxy')?.key).toBe('vitamin_d');
    expect(matchBiomarker('LDL Cholesterol')?.key).toBe('ldl');
    expect(matchBiomarker('Free T3')?.key).toBe('free_t3');
    expect(matchBiomarker('Glucose, Fasting')?.key).toBe('glucose');
    expect(matchBiomarker('hs-CRP')?.key).toBe('hscrp');
    expect(matchBiomarker('Free Testosterone')?.key).toBe('free_testosterone');
    expect(matchBiomarker('sex hormone binding globulin')?.key).toBe('shbg');
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

describe('isCriticalValue', () => {
  it('fires on an established critical threshold with a matching unit (all five markers)', () => {
    expect(isCriticalValue('potassium', 6.5, 'mmol/L')).toBe(true);
    expect(isCriticalValue('potassium', 2.7, 'mEq/L')).toBe(true); // tightened low 2.8
    expect(isCriticalValue('sodium', 118, 'mmol/L')).toBe(true);
    expect(isCriticalValue('glucose', 48, 'mg/dL')).toBe(true); // tightened low 50
    expect(isCriticalValue('calcium', 13.5, 'mg/dL')).toBe(true);
    expect(isCriticalValue('platelets', 15, 'K/uL')).toBe(true);
    expect(isCriticalValue('platelets', 15, 'K/mm3')).toBe(true); // equivalent-scale synonym
  });
  it('does not fire in the normal range', () => {
    expect(isCriticalValue('potassium', 4.0, 'mmol/L')).toBe(false);
    expect(isCriticalValue('glucose', 95, 'mg/dL')).toBe(false);
  });
  it('does not fire when the unit does not match (avoids scale false-positives)', () => {
    expect(isCriticalValue('platelets', 250000, '/uL')).toBe(false);
    expect(isCriticalValue('potassium', 6.5, 'mg/dL')).toBe(false);
  });
  it('does not fire for a marker with no critical thresholds', () => {
    expect(isCriticalValue('ldl', 9999, 'mg/dL')).toBe(false);
    expect(isCriticalValue('potassium', null, 'mmol/L')).toBe(false);
  });
});

describe('statusForBiomarker', () => {
  it('forces consult on a critical value, even with no printed range', () => {
    expect(statusForBiomarker('potassium', 6.5, 'mmol/L', null)).toEqual({ tier: 'consult', direction: 'above' });
    expect(statusForBiomarker('glucose', 500, 'mg/dL', null)).toEqual({ tier: 'consult', direction: 'above' });
    expect(statusForBiomarker('potassium', 2.0, 'mmol/L', { low: 3.5, high: 5.0 })).toEqual({ tier: 'consult', direction: 'below' });
  });
  it('falls back to the range tier for a non-critical value', () => {
    expect(statusForBiomarker('potassium', 4.0, 'mmol/L', { low: 3.5, high: 5.0 })).toEqual({ tier: 'optimal', direction: 'within' });
    expect(statusForBiomarker('ldl', 60, 'mg/dL', null)).toEqual({ tier: 'unknown', direction: 'unknown' });
  });
});
