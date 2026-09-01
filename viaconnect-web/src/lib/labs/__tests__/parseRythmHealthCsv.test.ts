import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dropRythmDerivedScores, parseRythmHealthCsv } from '../parseRythmHealthCsv';
import {
  RYTHM_HEALTH_LAB_NAME,
  RYTHM_HEALTH_SOURCE,
  isRythmDerivedScoreName,
  isRythmHealthLabName,
  rythmHealthFromLabChip,
} from '../rythmHealth';
import { matchBiomarker, panelGroupFor } from '../biomarkerDictionary';
import { matchRythmHealthMarker } from '../rythmHealth';

const fixture = readFileSync(
  join(process.cwd(), 'src/lib/labs/__fixtures__/rythm-health-export.csv'),
  'utf8',
);

describe('parseRythmHealthCsv', () => {
  it('maps the documented panel fixture into lab rows and skips derived scores', () => {
    const parsed = parseRythmHealthCsv(fixture);
    expect(parsed.collectionDate).toBe('2026-08-12');
    expect(parsed.skippedDerived).toEqual(expect.arrayContaining(['Rythm Score', 'Biological Age']));
    expect(parsed.biomarkers.map((b) => b.name)).not.toEqual(
      expect.arrayContaining(['Rythm Score', 'Biological Age']),
    );
    expect(parsed.biomarkers.length).toBeGreaterThanOrEqual(20);
    const byName = Object.fromEntries(parsed.biomarkers.map((b) => [b.name, b]));
    expect(byName['Testosterone']?.value).toBe(512);
    expect(byName['Free testosterone']?.value).toBe(12.4);
    expect(byName['Estradiol']?.value).toBe(22);
    expect(byName['SHBG']?.value).toBe(28);
    expect(byName['ApoB']?.value).toBe(80);
    expect(byName['hs-CRP']?.value).toBe(0.6);
    expect(byName['Vitamin D, 25-OH']?.value).toBe(42);
    expect(parsed.biomarkers.every((b) => Number.isFinite(b.value))).toBe(true);
  });

  it('parses a wide export whose headers are documented marker names', () => {
    const csv = [
      'Collection Date,Total Testosterone,Free Testosterone,Estradiol,SHBG,hs-CRP,Rythm Score,Biological Age',
      '2026-07-04,480,11.2,19,31,0.4,81,39',
    ].join('\n');
    const parsed = parseRythmHealthCsv(csv);
    expect(parsed.collectionDate).toBe('2026-07-04');
    expect(parsed.biomarkers.map((b) => b.name)).toEqual(
      expect.arrayContaining(['Testosterone', 'Free testosterone', 'Estradiol', 'SHBG', 'hs-CRP']),
    );
    expect(parsed.skippedDerived.join(' ')).toMatch(/Rythm Score|Biological Age/);
    expect(parsed.biomarkers.some((b) => /score|biological age/i.test(b.name))).toBe(false);
  });

  it('returns empty biomarkers for an unreadable file and never invents 0', () => {
    const parsed = parseRythmHealthCsv('hello,world\nfoo,bar');
    expect(parsed.biomarkers).toEqual([]);
    expect(parsed.biomarkers).not.toHaveLength(1);
    expect(parsed.biomarkers.reduce((sum, row) => sum + row.value, 0)).toBe(0);
  });

  it('skips non-numeric pending rows', () => {
    const csv = 'Biomarker,Result,Unit\nTSH,pending,uIU/mL\nCortisol,12,ug/dL';
    const parsed = parseRythmHealthCsv(csv);
    expect(parsed.biomarkers).toHaveLength(1);
    expect(parsed.biomarkers[0].name).toBe('Cortisol');
  });
});

describe('Rythm Health derived scores stay off the lab spine', () => {
  it('drops Rythm Score and Biological Age from persist candidates', () => {
    const kept = dropRythmDerivedScores([
      { name: 'Estradiol', value: 22 },
      { name: 'Rythm Score', value: 78 },
      { name: 'Biological Age', value: 41 },
    ]);
    expect(kept).toEqual([{ name: 'Estradiol', value: 22 }]);
    expect(isRythmDerivedScoreName('Rythm Score')).toBe(true);
    expect(isRythmDerivedScoreName('Biological Age')).toBe(true);
    expect(isRythmDerivedScoreName('Estradiol')).toBe(false);
  });
});

describe('Rythm Health provenance', () => {
  it('uses Rythm Health lab_name and rythm_health source id', () => {
    expect(RYTHM_HEALTH_LAB_NAME).toBe('Rythm Health');
    expect(RYTHM_HEALTH_SOURCE).toBe('rythm_health');
    expect(isRythmHealthLabName('Rythm Health')).toBe(true);
    expect(isRythmHealthLabName('Rhythm Software')).toBe(false);
  });

  it('Brief 49 from lab chip only when rows persist', () => {
    expect(rythmHealthFromLabChip(null)).toBeNull();
    expect(rythmHealthFromLabChip(0)).toBeNull();
    expect(rythmHealthFromLabChip(4)).toBe('from lab');
  });
});

describe('Rythm Health dictionary coverage', () => {
  it('matches documented blood markers without guessing unknown names', () => {
    expect(matchRythmHealthMarker('Free Testosterone')?.key).toBe('free_testosterone');
    expect(matchRythmHealthMarker('SHBG')?.key).toBe('shbg');
    expect(matchRythmHealthMarker('Remnant Cholesterol')?.key).toBe('remnant_cholesterol');
    expect(matchBiomarker('Fructosamine')?.key).toBe('fructosamine');
    expect(matchBiomarker('Uric Acid')?.key).toBe('uric_acid');
    expect(matchBiomarker('Alkaline Phosphatase')?.key).toBe('alp');
    expect(matchBiomarker('Gamma Glutamyl Transferase')?.key).toBe('ggt');
    expect(panelGroupFor('Free Testosterone')).toBe('Hormones');
    expect(matchBiomarker('Rythm Score')).toBeNull();
    expect(matchBiomarker('Biological Age')).toBeNull();
  });
});
