// Prompt #97 Phase 6: pure tests for version diff + revision fee calculator.

import { describe, it, expect } from 'vitest';
import {
  computeVersionDiff,
  type VersionSnapshot,
} from '@/lib/custom-formulations/version-diff';
import { computeRevisionFees } from '@/lib/custom-formulations/revision-fees';

const baseSnapshot: VersionSnapshot = {
  internalName: 'Original',
  deliveryForm: 'capsule',
  unitsPerServing: 2,
  servingsPerContainer: 30,
  intendedAdultUse: true,
  intendedPediatricUse: false,
  intendedPregnancyUse: false,
  proposedClaims: ['immune_support'],
  ingredients: [
    { ingredientId: 'vitamin_c_ascorbic_acid', dosePerServing: 500, doseUnit: 'mg', isActive: true },
    { ingredientId: 'zinc_picolinate', dosePerServing: 15, doseUnit: 'mg', isActive: true },
  ],
};

function modify(changes: Partial<VersionSnapshot>): VersionSnapshot {
  return { ...baseSnapshot, ...changes };
}

// ---- computeVersionDiff -------------------------------------------------

describe('computeVersionDiff — identity', () => {
  it('identical snapshots produce empty diff', () => {
    const d = computeVersionDiff(baseSnapshot, baseSnapshot);
    expect(d.nameChanged).toBe(false);
    expect(d.deliveryFormChanged).toBe(false);
    expect(d.servingStructureChanged).toBe(false);
    expect(d.intendedUseChanged).toBe(false);
    expect(d.claimsChanged.added).toEqual([]);
    expect(d.claimsChanged.removed).toEqual([]);
    expect(d.ingredientDiff).toEqual([]);
    expect(d.summaryLines).toEqual([]);
  });
});

describe('computeVersionDiff — metadata changes', () => {
  it('detects name change', () => {
    const d = computeVersionDiff(baseSnapshot, modify({ internalName: 'Renamed' }));
    expect(d.nameChanged).toBe(true);
    expect(d.summaryLines[0]).toContain('Renamed');
  });

  it('detects delivery form change', () => {
    const d = computeVersionDiff(baseSnapshot, modify({ deliveryForm: 'powder' }));
    expect(d.deliveryFormChanged).toBe(true);
  });

  it('detects serving structure change', () => {
    const d = computeVersionDiff(baseSnapshot, modify({ unitsPerServing: 3 }));
    expect(d.servingStructureChanged).toBe(true);
  });

  it('detects intended use shift (pediatric)', () => {
    const d = computeVersionDiff(baseSnapshot, modify({ intendedPediatricUse: true }));
    expect(d.intendedUseChanged).toBe(true);
  });
});

describe('computeVersionDiff — claims', () => {
  it('detects claim added', () => {
    const d = computeVersionDiff(
      baseSnapshot,
      modify({ proposedClaims: ['immune_support', 'antioxidant_support'] }),
    );
    expect(d.claimsChanged.added).toEqual(['antioxidant_support']);
    expect(d.claimsChanged.removed).toEqual([]);
  });

  it('detects claim removed', () => {
    const d = computeVersionDiff(baseSnapshot, modify({ proposedClaims: [] }));
    expect(d.claimsChanged.removed).toEqual(['immune_support']);
    expect(d.claimsChanged.added).toEqual([]);
  });
});

describe('computeVersionDiff — ingredient changes', () => {
  it('detects ingredient added', () => {
    const d = computeVersionDiff(
      baseSnapshot,
      modify({
        ingredients: [
          ...baseSnapshot.ingredients,
          { ingredientId: 'magnesium_glycinate', dosePerServing: 400, doseUnit: 'mg', isActive: true },
        ],
      }),
    );
    expect(d.ingredientDiff.some((e) => e.kind === 'added' && e.ingredientId === 'magnesium_glycinate')).toBe(true);
  });

  it('detects ingredient removed', () => {
    const d = computeVersionDiff(
      baseSnapshot,
      modify({
        ingredients: [baseSnapshot.ingredients[0]],
      }),
    );
    expect(d.ingredientDiff.some((e) => e.kind === 'removed' && e.ingredientId === 'zinc_picolinate')).toBe(true);
  });

  it('detects dose change with percent delta', () => {
    const d = computeVersionDiff(
      baseSnapshot,
      modify({
        ingredients: [
          { ingredientId: 'vitamin_c_ascorbic_acid', dosePerServing: 1000, doseUnit: 'mg', isActive: true },
          baseSnapshot.ingredients[1],
        ],
      }),
    );
    const entry = d.ingredientDiff.find((e) => e.ingredientId === 'vitamin_c_ascorbic_acid');
    expect(entry?.kind).toBe('dose_changed');
    expect(entry?.dosePercentChange).toBeCloseTo(100, 1);
  });

  it('detects unit change separately from dose change', () => {
    const d = computeVersionDiff(
      baseSnapshot,
      modify({
        ingredients: [
          { ingredientId: 'vitamin_c_ascorbic_acid', dosePerServing: 0.5, doseUnit: 'g', isActive: true },
          baseSnapshot.ingredients[1],
        ],
      }),
    );
    const entry = d.ingredientDiff.find((e) => e.ingredientId === 'vitamin_c_ascorbic_acid');
    expect(entry?.kind).toBe('unit_changed');
  });

  it('detects activity change (active -> excipient)', () => {
    const d = computeVersionDiff(
      baseSnapshot,
      modify({
        ingredients: [
          { ...baseSnapshot.ingredients[0], isActive: false },
          baseSnapshot.ingredients[1],
        ],
      }),
    );
    const entry = d.ingredientDiff.find((e) => e.ingredientId === 'vitamin_c_ascorbic_acid');
    expect(entry?.kind).toBe('activity_changed');
  });

  it('going from 0 dose to positive renders as 100% change', () => {
    const zeroPrev = modify({
      ingredients: [
        { ingredientId: 'vitamin_c_ascorbic_acid', dosePerServing: 0, doseUnit: 'mg', isActive: true },
        baseSnapshot.ingredients[1],
      ],
    });
    const d = computeVersionDiff(zeroPrev, baseSnapshot);
    const entry = d.ingredientDiff.find((e) => e.ingredientId === 'vitamin_c_ascorbic_acid');
    expect(entry?.dosePercentChange).toBe(100);
  });
});

describe('computeVersionDiff — summary lines', () => {
  it('produces one summary line per change', () => {
    const d = computeVersionDiff(
      baseSnapshot,
      modify({
        internalName: 'New',
        deliveryForm: 'tablet',
        proposedClaims: ['energy_support'],
      }),
    );
    expect(d.summaryLines.length).toBeGreaterThanOrEqual(3);
  });
});

// ---- computeRevisionFees -----------------------------------------------

describe('computeRevisionFees', () => {
  const base = { developmentFeeCents: 388800, medicalReviewFeeCents: 88800 };

  it('minor -> 0 fees', () => {
    const r = computeRevisionFees({ ...base, classification: 'minor' });
    expect(r.totalCents).toBe(0);
    expect(r.medicalReviewFeeCents).toBe(0);
    expect(r.developmentFeePartialCents).toBe(0);
  });

  it('substantive -> medical review fee only', () => {
    const r = computeRevisionFees({ ...base, classification: 'substantive' });
    expect(r.medicalReviewFeeCents).toBe(88800);
    expect(r.developmentFeePartialCents).toBe(0);
    expect(r.totalCents).toBe(88800);
  });

  it('material -> medical review + 50% of development fee', () => {
    const r = computeRevisionFees({ ...base, classification: 'material' });
    // 388800/2 = 194400 (ceil)
    expect(r.medicalReviewFeeCents).toBe(88800);
    expect(r.developmentFeePartialCents).toBe(194400);
    expect(r.totalCents).toBe(88800 + 194400);
  });

  it('material rounding uses ceil on half-dev-fee', () => {
    const r = computeRevisionFees({
      classification: 'material',
      developmentFeeCents: 101,
      medicalReviewFeeCents: 0,
    });
    // 101/2 = 50.5 -> ceil 51
    expect(r.developmentFeePartialCents).toBe(51);
  });

  it('description text set per classification', () => {
    expect(computeRevisionFees({ ...base, classification: 'minor' }).description).toContain('Minor');
    expect(computeRevisionFees({ ...base, classification: 'substantive' }).description).toContain('Substantive');
    expect(computeRevisionFees({ ...base, classification: 'material' }).description).toContain('Material');
  });
});
