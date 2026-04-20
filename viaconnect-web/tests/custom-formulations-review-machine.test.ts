// Prompt #97 Phase 4 (review state machine + duplicate + revision): 90%+ coverage gate.

import { describe, it, expect } from 'vitest';
import {
  applyDevelopmentFeeCaptured,
  applyReviewDecision,
  finalApprovalStatus,
} from '@/lib/custom-formulations/review-state-machine';
import {
  computeSimilarity,
  detectDuplicates,
  type FormulationSnapshot,
} from '@/lib/custom-formulations/duplicate-detection';
import { classifyRevision } from '@/lib/custom-formulations/revision-classification';

// ---- Review state machine ------------------------------------------------

describe('applyReviewDecision — rejections are terminal', () => {
  it('medical reject from ready_for_review -> rejected', () => {
    const r = applyReviewDecision(
      { formulationStatus: 'ready_for_review', medical: null, regulatory: null },
      'medical',
      'rejected',
    );
    expect(r.kind).toBe('advance');
    if (r.kind === 'advance') expect(r.next).toBe('rejected');
  });

  it('regulatory reject from under_medical_review -> rejected', () => {
    const r = applyReviewDecision(
      { formulationStatus: 'under_medical_review', medical: null, regulatory: null },
      'regulatory',
      'rejected',
    );
    expect(r.kind).toBe('advance');
    if (r.kind === 'advance') expect(r.next).toBe('rejected');
  });
});

describe('applyReviewDecision — revision requests are terminal for version', () => {
  it('medical revision -> revision_requested', () => {
    const r = applyReviewDecision(
      { formulationStatus: 'ready_for_review', medical: null, regulatory: null },
      'medical',
      'revision_requested',
    );
    expect(r.kind).toBe('advance');
    if (r.kind === 'advance') expect(r.next).toBe('revision_requested');
  });

  it('regulatory revision with prior medical approval -> revision_requested', () => {
    const r = applyReviewDecision(
      { formulationStatus: 'under_regulatory_review', medical: 'approved', regulatory: null },
      'regulatory',
      'revision_requested',
    );
    expect(r.kind).toBe('advance');
    if (r.kind === 'advance') expect(r.next).toBe('revision_requested');
  });
});

describe('applyReviewDecision — approvals', () => {
  it('first approval advances to under_<other>_review (medical first)', () => {
    const r = applyReviewDecision(
      { formulationStatus: 'ready_for_review', medical: null, regulatory: null },
      'medical',
      'approved',
    );
    expect(r.kind).toBe('advance');
    if (r.kind === 'advance') expect(r.next).toBe('under_regulatory_review');
  });

  it('first approval advances to under_<other>_review (regulatory first)', () => {
    const r = applyReviewDecision(
      { formulationStatus: 'ready_for_review', medical: null, regulatory: null },
      'regulatory',
      'approved',
    );
    expect(r.kind).toBe('advance');
    if (r.kind === 'advance') expect(r.next).toBe('under_medical_review');
  });

  it('second approval from both -> approved_pending_development_fee', () => {
    const r = applyReviewDecision(
      { formulationStatus: 'under_regulatory_review', medical: 'approved', regulatory: null },
      'regulatory',
      'approved',
    );
    expect(r.kind).toBe('advance');
    if (r.kind === 'advance') expect(r.next).toBe('approved_pending_development_fee');
  });
});

describe('applyReviewDecision — invalid entry status', () => {
  it('cannot record review from draft', () => {
    const r = applyReviewDecision(
      { formulationStatus: 'draft', medical: null, regulatory: null },
      'medical',
      'approved',
    );
    expect(r.kind).toBe('error');
  });

  it('cannot record review from terminal / post-review statuses', () => {
    const terminal: Array<'approved_production_ready' | 'rejected' | 'archived' | 'revision_requested'> = [
      'approved_production_ready',
      'rejected',
      'archived',
      'revision_requested',
    ];
    for (const s of terminal) {
      const r = applyReviewDecision(
        { formulationStatus: s, medical: null, regulatory: null },
        'medical',
        'approved',
      );
      expect(r.kind).toBe('error');
    }
  });
});

describe('finalApprovalStatus aggregation', () => {
  it('either rejection -> rejected', () => {
    expect(finalApprovalStatus('rejected', 'approved')).toBe('rejected');
    expect(finalApprovalStatus('approved', 'rejected')).toBe('rejected');
    expect(finalApprovalStatus('rejected', 'rejected')).toBe('rejected');
  });
  it('either revision -> revision_requested', () => {
    expect(finalApprovalStatus('revision_requested', 'approved')).toBe('revision_requested');
    expect(finalApprovalStatus('approved', 'revision_requested')).toBe('revision_requested');
  });
  it('both approved -> approved_pending_development_fee', () => {
    expect(finalApprovalStatus('approved', 'approved')).toBe('approved_pending_development_fee');
  });
  it('one approved, one pending -> under_<pending>_review', () => {
    expect(finalApprovalStatus('approved', null)).toBe('under_regulatory_review');
    expect(finalApprovalStatus(null, 'approved')).toBe('under_medical_review');
  });
  it('both null -> ready_for_review', () => {
    expect(finalApprovalStatus(null, null)).toBe('ready_for_review');
  });
});

describe('applyDevelopmentFeeCaptured', () => {
  it('approved_pending_development_fee -> approved_production_ready', () => {
    expect(applyDevelopmentFeeCaptured('approved_pending_development_fee')).toBe(
      'approved_production_ready',
    );
  });
  it('any other status returns null (no-op)', () => {
    expect(applyDevelopmentFeeCaptured('draft')).toBeNull();
    expect(applyDevelopmentFeeCaptured('activated' as never)).toBeNull();
    expect(applyDevelopmentFeeCaptured('approved_production_ready')).toBeNull();
  });
});

// ---- Duplicate detection -------------------------------------------------

function snap(overrides: Partial<FormulationSnapshot> = {}): FormulationSnapshot {
  return {
    id: 'f1',
    practitionerId: 'p1',
    internalName: 'Test',
    ingredients: [{ ingredientId: 'a', dosePerServing: 100 }],
    ...overrides,
  };
}

describe('computeSimilarity', () => {
  it('identical formulations score 1.0', () => {
    const a = snap();
    const b = snap({ id: 'f2' });
    expect(computeSimilarity(a, b)).toBe(1);
  });

  it('disjoint ingredient sets score 0', () => {
    const a = snap({ ingredients: [{ ingredientId: 'a', dosePerServing: 100 }] });
    const b = snap({ id: 'f2', ingredients: [{ ingredientId: 'z', dosePerServing: 100 }] });
    expect(computeSimilarity(a, b)).toBe(0);
  });

  it('half-overlap ingredient set with identical doses', () => {
    const a = snap({
      ingredients: [
        { ingredientId: 'a', dosePerServing: 100 },
        { ingredientId: 'b', dosePerServing: 200 },
      ],
    });
    const b = snap({
      id: 'f2',
      ingredients: [
        { ingredientId: 'a', dosePerServing: 100 },
        { ingredientId: 'c', dosePerServing: 300 },
      ],
    });
    // jaccard = 1/3, doseSim = 1.0 (identical on 'a'); score = 1/3*0.6 + 1*0.4 = 0.6
    expect(computeSimilarity(a, b)).toBeCloseTo(0.6, 2);
  });

  it('same ingredients but different doses scores lower than 1', () => {
    const a = snap({ ingredients: [{ ingredientId: 'a', dosePerServing: 100 }] });
    const b = snap({
      id: 'f2',
      ingredients: [{ ingredientId: 'a', dosePerServing: 50 }],
    });
    // jaccard=1, doseSim=0.5; score=0.6 + 0.2 = 0.8
    expect(computeSimilarity(a, b)).toBeCloseTo(0.8, 2);
  });

  it('empty ingredient set returns 0', () => {
    const a = snap({ ingredients: [] });
    const b = snap({ id: 'f2', ingredients: [] });
    expect(computeSimilarity(a, b)).toBe(0);
  });
});

describe('detectDuplicates', () => {
  it('flags identical formulations above threshold', () => {
    const target = snap();
    const others = [snap({ id: 'f2', practitionerId: 'p2' })];
    const r = detectDuplicates(target, others);
    expect(r.isDuplicate).toBe(true);
    expect(r.similarFormulations[0].id).toBe('f2');
  });

  it('does not flag below threshold', () => {
    const target = snap({
      ingredients: [
        { ingredientId: 'a', dosePerServing: 100 },
        { ingredientId: 'b', dosePerServing: 200 },
      ],
    });
    const others = [
      snap({
        id: 'f2',
        practitionerId: 'p2',
        ingredients: [{ ingredientId: 'c', dosePerServing: 50 }],
      }),
    ];
    const r = detectDuplicates(target, others);
    expect(r.isDuplicate).toBe(false);
  });

  it('excludes same-practitioner matches (same practitioner revising their own formulation is not a duplicate)', () => {
    const target = snap({ practitionerId: 'p1' });
    const others = [snap({ id: 'f2', practitionerId: 'p1' })];
    const r = detectDuplicates(target, others);
    expect(r.isDuplicate).toBe(false);
  });

  it('returns similar formulations sorted by similarity descending', () => {
    const target = snap();
    const others = [
      snap({
        id: 'f2',
        practitionerId: 'p2',
        ingredients: [{ ingredientId: 'a', dosePerServing: 90 }],
      }), // jaccard=1, doseSim=90/100=0.9; score = 0.6 + 0.4*0.9 = 0.96
      snap({ id: 'f3', practitionerId: 'p3' }), // similarity 1.0
    ];
    const r = detectDuplicates(target, others);
    expect(r.similarFormulations).toHaveLength(2);
    expect(r.similarFormulations[0].id).toBe('f3');
    expect(r.similarFormulations[1].id).toBe('f2');
  });

  it('threshold is configurable', () => {
    const target = snap({
      ingredients: [
        { ingredientId: 'a', dosePerServing: 100 },
        { ingredientId: 'b', dosePerServing: 200 },
      ],
    });
    const others = [
      snap({
        id: 'f2',
        practitionerId: 'p2',
        ingredients: [
          { ingredientId: 'a', dosePerServing: 100 },
          { ingredientId: 'c', dosePerServing: 200 },
        ],
      }),
    ];
    // similarity ~0.6 at identical doses; below default 0.85 but above 0.5
    const rDefault = detectDuplicates(target, others);
    expect(rDefault.isDuplicate).toBe(false);
    const rLoose = detectDuplicates(target, others, 0.5);
    expect(rLoose.isDuplicate).toBe(true);
  });
});

// ---- Revision classification --------------------------------------------

describe('classifyRevision', () => {
  const baseIngredients = [
    { ingredientId: 'a', dosePerServing: 100, isActive: true },
    { ingredientId: 'b', dosePerServing: 50, isActive: true },
  ];
  const baseClaims = ['immune_support'];

  const prev = {
    intendedAdultUse: true,
    intendedPediatricUse: false,
    intendedPregnancyUse: false,
    deliveryForm: 'capsule',
    proposedClaims: baseClaims,
    ingredients: baseIngredients,
  };

  it('no change -> minor', () => {
    const r = classifyRevision({ previous: prev, next: { ...prev } });
    expect(r.classification).toBe('minor');
  });

  it('small dose change (<=10%) -> minor', () => {
    const r = classifyRevision({
      previous: prev,
      next: {
        ...prev,
        ingredients: [
          { ingredientId: 'a', dosePerServing: 105, isActive: true },
          { ingredientId: 'b', dosePerServing: 50, isActive: true },
        ],
      },
    });
    expect(r.classification).toBe('minor');
  });

  it('dose change >10% on active ingredient -> substantive', () => {
    const r = classifyRevision({
      previous: prev,
      next: {
        ...prev,
        ingredients: [
          { ingredientId: 'a', dosePerServing: 150, isActive: true },
          { ingredientId: 'b', dosePerServing: 50, isActive: true },
        ],
      },
    });
    expect(r.classification).toBe('substantive');
  });

  it('single ingredient added -> substantive', () => {
    const r = classifyRevision({
      previous: prev,
      next: {
        ...prev,
        ingredients: [
          ...baseIngredients,
          { ingredientId: 'c', dosePerServing: 25, isActive: true },
        ],
      },
    });
    expect(r.classification).toBe('substantive');
  });

  it('claims changed -> substantive', () => {
    const r = classifyRevision({
      previous: prev,
      next: { ...prev, proposedClaims: ['energy_support'] },
    });
    expect(r.classification).toBe('substantive');
  });

  it('intended use shift -> material', () => {
    const r = classifyRevision({
      previous: prev,
      next: { ...prev, intendedPediatricUse: true },
    });
    expect(r.classification).toBe('material');
  });

  it('delivery form change -> material', () => {
    const r = classifyRevision({
      previous: prev,
      next: { ...prev, deliveryForm: 'powder' },
    });
    expect(r.classification).toBe('material');
  });

  it('3+ ingredient changes -> material', () => {
    const r = classifyRevision({
      previous: prev,
      next: {
        ...prev,
        ingredients: [
          { ingredientId: 'x', dosePerServing: 10, isActive: true },
          { ingredientId: 'y', dosePerServing: 20, isActive: true },
          { ingredientId: 'z', dosePerServing: 30, isActive: true },
        ],
      },
    });
    expect(r.classification).toBe('material');
  });

  it('inactive ingredient (excipient) changes do not affect classification', () => {
    const r = classifyRevision({
      previous: prev,
      next: {
        ...prev,
        ingredients: [
          ...baseIngredients,
          { ingredientId: 'cellulose', dosePerServing: 100, isActive: false },
        ],
      },
    });
    expect(r.classification).toBe('minor');
  });

  it('accepts going from 0 dose to positive as a big dose change (material regression guard)', () => {
    const r = classifyRevision({
      previous: {
        ...prev,
        ingredients: [
          { ingredientId: 'a', dosePerServing: 0, isActive: true },
          { ingredientId: 'b', dosePerServing: 50, isActive: true },
        ],
      },
      next: prev,
    });
    expect(r.classification).toBe('substantive');
  });
});
