/**
 * src/lib/journey/__tests__/selection.test.ts
 *
 * Unit tests for the pure selection/relatedness module (Prompt 208c, Phase 1, Task P1-T2).
 * TDD: tests written first (RED -> GREEN).
 *
 * No DB, no React, no Supabase. Pure deterministic logic only.
 * No em/en-dashes. No emojis.
 */

import { describe, it, expect } from 'vitest';
import {
  refOf,
  relatedRefs,
  isRelated,
  RELATION_GRAPH,
  type SelectionType,
  type Selection,
} from '../selection';

// ---------------------------------------------------------------------------
// refOf
// ---------------------------------------------------------------------------

describe('refOf', () => {
  it('lowercases the id', () => {
    expect(refOf('supplement', 'Iron')).toBe('supplement:iron');
  });

  it('trims whitespace from id', () => {
    expect(refOf('gene', '  HFE  ')).toBe('gene:hfe');
  });

  it('lowercases and trims combined', () => {
    expect(refOf('node', '  My-Genetics  ')).toBe('node:my-genetics');
  });

  it('produces type:id form', () => {
    expect(refOf('phase', 'Baseline')).toBe('phase:baseline');
  });

  it('handles already-lowercase id unchanged', () => {
    expect(refOf('symptom', 'fatigue')).toBe('symptom:fatigue');
  });
});

// ---------------------------------------------------------------------------
// RELATION_GRAPH - structural checks
// ---------------------------------------------------------------------------

describe('RELATION_GRAPH', () => {
  it('is an array', () => {
    expect(Array.isArray(RELATION_GRAPH)).toBe(true);
  });

  it('contains at least the activate-foundation-stack <-> my-genetics edge', () => {
    const hasEdge = RELATION_GRAPH.some(
      (e) =>
        (e.a === refOf('accelerator', 'activate-foundation-stack') &&
          e.b === refOf('node', 'my-genetics')) ||
        (e.b === refOf('accelerator', 'activate-foundation-stack') &&
          e.a === refOf('node', 'my-genetics')),
    );
    expect(hasEdge).toBe(true);
  });

  it('contains the iron <-> hfe safety edge', () => {
    const hasEdge = RELATION_GRAPH.some(
      (e) =>
        (e.a === refOf('supplement', 'iron') && e.b === refOf('gene', 'hfe')) ||
        (e.b === refOf('supplement', 'iron') && e.a === refOf('gene', 'hfe')),
    );
    expect(hasEdge).toBe(true);
  });

  it('contains the build-lean-mass <-> lean-mass bodycomp edge', () => {
    const hasEdge = RELATION_GRAPH.some(
      (e) =>
        (e.a === refOf('goal', 'build-lean-mass') &&
          e.b === refOf('bodycomp', 'lean-mass')) ||
        (e.b === refOf('goal', 'build-lean-mass') &&
          e.a === refOf('bodycomp', 'lean-mass')),
    );
    expect(hasEdge).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// relatedRefs - foundation-stack accelerator selection
// ---------------------------------------------------------------------------

describe('relatedRefs - activate-foundation-stack', () => {
  const sel: Selection = {
    type: 'accelerator',
    id: 'activate-foundation-stack',
    label: 'Activate Foundation Stack',
  };

  it('includes the selection own ref', () => {
    const refs = relatedRefs(sel);
    expect(refs.has(refOf('accelerator', 'activate-foundation-stack'))).toBe(true);
  });

  it('includes methylfolate-b-complex supplement ref', () => {
    const refs = relatedRefs(sel);
    expect(refs.has(refOf('supplement', 'methylfolate-b-complex'))).toBe(true);
  });

  it('includes magnesium supplement ref', () => {
    const refs = relatedRefs(sel);
    expect(refs.has(refOf('supplement', 'magnesium'))).toBe(true);
  });

  it('includes fatigue symptom ref', () => {
    const refs = relatedRefs(sel);
    expect(refs.has(refOf('symptom', 'fatigue'))).toBe(true);
  });

  it('includes my-genetics node ref', () => {
    const refs = relatedRefs(sel);
    expect(refs.has(refOf('node', 'my-genetics'))).toBe(true);
  });

  it('does NOT include unrelated supplement fish-oil', () => {
    const refs = relatedRefs(sel);
    expect(refs.has(refOf('supplement', 'fish-oil'))).toBe(false);
  });

  it('accepts a custom edges array', () => {
    const customEdges = [
      { a: refOf('accelerator', 'activate-foundation-stack'), b: refOf('supplement', 'vitamin-c') },
    ];
    const refs = relatedRefs(sel, customEdges);
    expect(refs.has(refOf('supplement', 'vitamin-c'))).toBe(true);
    // magnesium not in custom edges
    expect(refs.has(refOf('supplement', 'magnesium'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// relatedRefs - iron supplement (safety edge)
// ---------------------------------------------------------------------------

describe('relatedRefs - iron supplement', () => {
  const sel: Selection = { type: 'supplement', id: 'iron' };

  it('includes the hfe gene ref (safety cross-check)', () => {
    const refs = relatedRefs(sel);
    expect(refs.has(refOf('gene', 'hfe'))).toBe(true);
  });

  it('includes the my-genetics node ref', () => {
    const refs = relatedRefs(sel);
    expect(refs.has(refOf('node', 'my-genetics'))).toBe(true);
  });

  it('includes own ref', () => {
    const refs = relatedRefs(sel);
    expect(refs.has(refOf('supplement', 'iron'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isRelated - basic cases
// ---------------------------------------------------------------------------

describe('isRelated - null selection', () => {
  it('returns false when selection is null', () => {
    expect(isRelated(null, 'supplement', 'magnesium')).toBe(false);
  });
});

describe('isRelated - foundation-stack', () => {
  const sel: Selection = { type: 'accelerator', id: 'activate-foundation-stack' };

  it('returns true for magnesium supplement', () => {
    expect(isRelated(sel, 'supplement', 'magnesium')).toBe(true);
  });

  it('returns false for fish-oil supplement', () => {
    expect(isRelated(sel, 'supplement', 'fish-oil')).toBe(false);
  });

  it('is case-insensitive: MAGNESIUM matches magnesium', () => {
    expect(isRelated(sel, 'supplement', 'MAGNESIUM')).toBe(true);
  });

  it('is case-insensitive: MethylFolate-B-Complex matches', () => {
    expect(isRelated(sel, 'supplement', 'MethylFolate-B-Complex')).toBe(true);
  });

  it('returns true for the own entity', () => {
    expect(isRelated(sel, 'accelerator', 'activate-foundation-stack')).toBe(true);
  });

  it('returns true for my-genetics node', () => {
    expect(isRelated(sel, 'node', 'my-genetics')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isRelated - iron safety edge
// ---------------------------------------------------------------------------

describe('isRelated - iron safety edge', () => {
  const sel: Selection = { type: 'supplement', id: 'iron' };

  it('returns true for gene HFE (case-insensitive)', () => {
    expect(isRelated(sel, 'gene', 'HFE')).toBe(true);
  });

  it('returns true for node my-genetics', () => {
    expect(isRelated(sel, 'node', 'my-genetics')).toBe(true);
  });

  it('returns false for unrelated supplement magnesium', () => {
    expect(isRelated(sel, 'supplement', 'magnesium')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isRelated - never throws guarantee
// ---------------------------------------------------------------------------

describe('isRelated - never throws', () => {
  it('does not throw for null selection', () => {
    expect(() => isRelated(null, 'supplement', 'iron')).not.toThrow();
  });

  it('does not throw for valid selection with valid args', () => {
    const sel: Selection = { type: 'goal', id: 'build-lean-mass' };
    expect(() => isRelated(sel, 'bodycomp', 'lean-mass')).not.toThrow();
  });

  it('does not throw for unknown entity types or ids', () => {
    const sel: Selection = { type: 'node', id: 'my-genetics' };
    // @ts-expect-error intentionally unknown type to test runtime safety
    expect(() => isRelated(sel, 'unknown-type' as SelectionType, 'some-id')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// isRelated - build-lean-mass goal
// ---------------------------------------------------------------------------

describe('isRelated - build-lean-mass goal', () => {
  const sel: Selection = { type: 'goal', id: 'build-lean-mass' };

  it('returns true for my-biology node', () => {
    expect(isRelated(sel, 'node', 'my-biology')).toBe(true);
  });

  it('returns true for lean-mass bodycomp', () => {
    expect(isRelated(sel, 'bodycomp', 'lean-mass')).toBe(true);
  });

  it('returns true for zone-2-movement-block accelerator', () => {
    expect(isRelated(sel, 'accelerator', 'zone-2-movement-block')).toBe(true);
  });

  it('returns false for unrelated node my-genetics', () => {
    // my-genetics is not seeded as related to build-lean-mass
    expect(isRelated(sel, 'node', 'my-genetics')).toBe(false);
  });
});
