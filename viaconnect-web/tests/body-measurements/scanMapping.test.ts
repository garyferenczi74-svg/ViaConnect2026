import { describe, it, expect } from 'vitest';
import { mapScanRowToCircumferenceCm, mappedSiteCount } from '@/lib/body-measurements/scanMapping';
import { ALL_SITES, SITE_TO_COLUMN, SCAN_GIRTH_TO_SITE } from '@/lib/body-measurements/sites';

describe('mapScanRowToCircumferenceCm', () => {
  it('maps every canonical girth to its circumference column in cm and ignores non-canonical fields', () => {
    const row = {
      neck_circ_cm: 38,
      shoulder_circ_cm: 120,
      chest_circ_cm: 100,
      waist_natural_circ_cm: 85,
      hip_circ_cm: 98,
      left_bicep_circ_cm: 33,
      right_bicep_circ_cm: 33.4,
      left_forearm_circ_cm: 27,
      right_forearm_circ_cm: 27,
      left_thigh_circ_cm: 56,
      right_thigh_circ_cm: 56,
      left_calf_circ_cm: 38,
      right_calf_circ_cm: 38,
      // no canonical key -> ignored (Section 5)
      under_bust_circ_cm: 90,
      waist_navel_circ_cm: 88,
      // not girths -> ignored
      ffmi: 22,
      torso_length_cm: 50,
    };
    const out = mapScanRowToCircumferenceCm(row);
    expect(out.waist).toBe(85); // waist_natural -> waist column
    expect(out.hip).toBe(98); // hip_circ -> hip column
    expect(out.shoulder_width).toBe(120); // shoulder -> shoulder_width
    expect(out.left_upper_arm).toBe(33); // left_bicep -> left_upper_arm
    expect(out.right_upper_thigh).toBe(56); // right_thigh -> right_upper_thigh
    expect(out).not.toHaveProperty('under_bust');
    expect(out).not.toHaveProperty('waist_navel');
    expect(mappedSiteCount(out)).toBe(13); // all 13 canonical sites present
  });

  it('omits a site when its girth is null, missing, or non-positive (missing, never 0)', () => {
    const out = mapScanRowToCircumferenceCm({
      neck_circ_cm: 38,
      waist_natural_circ_cm: null,
      hip_circ_cm: 0,
      chest_circ_cm: -1,
    });
    expect(out.neck).toBe(38);
    expect(out).not.toHaveProperty('waist');
    expect(out).not.toHaveProperty('hip');
    expect(out).not.toHaveProperty('chest');
    expect(mappedSiteCount(out)).toBe(1);
  });

  it('rounds girths to one decimal place', () => {
    const out = mapScanRowToCircumferenceCm({ neck_circ_cm: 38.04, waist_natural_circ_cm: 84.96 });
    expect(out.neck).toBe(38);
    expect(out.waist).toBe(85);
  });
});

describe('site mapping integrity', () => {
  it('every canonical site has a circumference column and every scan girth maps to a known site', () => {
    for (const site of ALL_SITES) {
      expect(typeof SITE_TO_COLUMN[site]).toBe('string');
    }
    for (const girth of Object.keys(SCAN_GIRTH_TO_SITE)) {
      expect(ALL_SITES).toContain(SCAN_GIRTH_TO_SITE[girth]);
    }
    expect(ALL_SITES).toHaveLength(13);
  });
});
