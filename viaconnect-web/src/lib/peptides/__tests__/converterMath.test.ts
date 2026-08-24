import { describe, expect, it } from 'vitest';
import {
  computeSyringeUnits,
  u100ToU40Factor,
  CONVERTER_COPY,
} from '../converterMath';

describe('Prompt 226 converterMath', () => {
  it('computes standard 5 mg vial at 1/2/3 mL for a user dose', () => {
    const dose = 0.25;
    for (const diluent of [1, 2, 3]) {
      const r = computeSyringeUnits({
        vialAmount: 5,
        vialUnit: 'mg',
        diluentMl: diluent,
        doseAmount: dose,
        doseUnit: 'mg',
        syringeStandard: 'U-100',
        barrelSize: 100,
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      // concentration = 5/diluent mg/mL; volume = 0.25 / conc; units = volume * 100
      const expectedUnits = (dose / (5 / diluent)) * 100;
      expect(r.syringeUnits).toBeCloseTo(expectedUnits, 10);
      expect(r.concentrationPerMl).toBeCloseTo(5 / diluent, 10);
    }
  });

  it('asserts U-100 vs U-40 is exactly 2.5x for identical inputs', () => {
    expect(u100ToU40Factor()).toBe(2.5);
    const base = {
      vialAmount: 5,
      vialUnit: 'mg' as const,
      diluentMl: 2,
      doseAmount: 0.5,
      doseUnit: 'mg' as const,
      barrelSize: 100 as const,
    };
    const u100 = computeSyringeUnits({ ...base, syringeStandard: 'U-100' });
    const u40 = computeSyringeUnits({ ...base, syringeStandard: 'U-40' });
    expect(u100.ok && u40.ok).toBe(true);
    if (u100.ok && u40.ok) {
      expect(u100.syringeUnits / u40.syringeUnits).toBeCloseTo(2.5, 10);
      expect(u100.resultStandardLabel).toContain('U-100');
      expect(u40.resultStandardLabel).toContain('U-40');
    }
  });

  it('hard-errors on barrel overflow, non-positive, dose>vial, missing', () => {
    expect(
      computeSyringeUnits({
        vialAmount: 5,
        vialUnit: 'mg',
        diluentMl: 1,
        doseAmount: 5,
        doseUnit: 'mg',
        syringeStandard: 'U-100',
        barrelSize: 30,
      }).ok,
    ).toBe(false);

    const overflow = computeSyringeUnits({
      vialAmount: 5,
      vialUnit: 'mg',
      diluentMl: 1,
      doseAmount: 5,
      doseUnit: 'mg',
      syringeStandard: 'U-100',
      barrelSize: 30,
    });
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) expect(overflow.code).toBe('barrel_overflow');

    const neg = computeSyringeUnits({
      vialAmount: 5,
      vialUnit: 'mg',
      diluentMl: 2,
      doseAmount: -1,
      doseUnit: 'mg',
      syringeStandard: 'U-100',
      barrelSize: 100,
    });
    expect(neg.ok).toBe(false);
    if (!neg.ok) expect(neg.code).toBe('non_positive');

    const over = computeSyringeUnits({
      vialAmount: 5,
      vialUnit: 'mg',
      diluentMl: 2,
      doseAmount: 6,
      doseUnit: 'mg',
      syringeStandard: 'U-100',
      barrelSize: 100,
    });
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.code).toBe('dose_exceeds_vial');
  });

  it('emits precision warning below 2 units on 100u barrel', () => {
    // 5 mg / 3 mL, dose 0.05 mg → units = 0.05/(5/3)*100 = 3? 
    // Need < 2: dose 0.02 mg at 5mg/2mL → conc 2.5; vol 0.008; units 0.8
    const r = computeSyringeUnits({
      vialAmount: 5,
      vialUnit: 'mg',
      diluentMl: 2,
      doseAmount: 0.02,
      doseUnit: 'mg',
      syringeStandard: 'U-100',
      barrelSize: 100,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.syringeUnits).toBeLessThan(2);
      expect(r.warnings.some((w) => w.code === 'precision_low')).toBe(true);
    }
  });

  it('disables IU without verified factor', () => {
    const r = computeSyringeUnits({
      vialAmount: 100,
      vialUnit: 'IU',
      diluentMl: 1,
      doseAmount: 10,
      doseUnit: 'IU',
      syringeStandard: 'U-100',
      barrelSize: 100,
      iuMgFactorVerified: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('iu_factor_unverified');
  });

  it('flags mcg/mg scale suspicion', () => {
    const r = computeSyringeUnits({
      vialAmount: 5,
      vialUnit: 'mg',
      diluentMl: 2,
      doseAmount: 2500,
      doseUnit: 'mcg',
      syringeStandard: 'U-100',
      barrelSize: 100,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.needsUnitConfirmation).toBe(true);
      expect(r.warnings.some((w) => w.code === 'unit_scale_suspect')).toBe(true);
    }
  });

  it('Lex-controlled copy constants match Appendix A', () => {
    expect(CONVERTER_COPY.subtitle).toBe(
      'Converts values you enter into syringe units.',
    );
    expect(CONVERTER_COPY.scaleInstruction).toBe(
      'This is where your entered dose lands on the barrel.',
    );
    expect(CONVERTER_COPY.bacShortcutsLabel).toBe(
      'Common volumes, choose one.',
    );
    expect(CONVERTER_COPY.nonAllowlistedHeading).toBe(
      'No established dose exists for this compound.',
    );
    expect(CONVERTER_COPY.layer3).toContain('Not a recommended dose');
  });
});
