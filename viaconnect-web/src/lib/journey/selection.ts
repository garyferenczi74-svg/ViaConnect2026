/**
 * src/lib/journey/selection.ts
 *
 * PURE shared selection and relatedness model (Prompt 208c, Phase 1, Task P1-T2).
 *
 * Provides:
 *   - SelectionType union + Selection interface
 *   - EntityRef canonical form ("type:id" lowercased)
 *   - RELATION_GRAPH: bidirectional edge seed (extend in place from later wiring tasks)
 *   - relatedRefs: Set of all refs sharing an edge with the current selection
 *   - isRelated: boolean predicate for highlight/dim decisions
 *
 * PURE/DETERMINISTIC. No DB. No React. No Supabase. Never throws.
 * No em/en-dashes. No emojis. No new dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SelectionType =
  | 'phase'
  | 'goal'
  | 'accelerator'
  | 'node'
  | 'symptom'
  | 'supplement'
  | 'pillar'
  | 'bodycomp'
  | 'gene'
  | 'variant';

export interface Selection {
  type: SelectionType;
  id: string;
  label?: string;
}

/**
 * EntityRef is the canonical "type:id" form with a lowercased, trimmed id.
 * Always use refOf() to construct one -- never build the string manually.
 */
export type EntityRef = string;

// ---------------------------------------------------------------------------
// refOf
//
// Canonical EntityRef builder. PURE: never throws.
// The id is lowercased and trimmed so lookups are always case-insensitive.
// ---------------------------------------------------------------------------

export function refOf(type: SelectionType, id: string): EntityRef {
  return `${type}:${id.toLowerCase().trim()}`;
}

// ---------------------------------------------------------------------------
// RelationEdge
// ---------------------------------------------------------------------------

export interface RelationEdge {
  a: EntityRef;
  b: EntityRef;
}

// ---------------------------------------------------------------------------
// RELATION_GRAPH
//
// Seed relations worked out in Prompt 208c Phase 1 brief. Each edge is
// bidirectional: relatedRefs() checks both directions.
//
// This is a plain exported array -- extend it from any later wiring task
// by pushing additional RelationEdge objects or spreading in a sub-array.
// ---------------------------------------------------------------------------

export const RELATION_GRAPH: RelationEdge[] = [
  // accelerator 'activate-foundation-stack' <-> nodes, symptoms, supplements, pillars
  {
    a: refOf('accelerator', 'activate-foundation-stack'),
    b: refOf('node', 'my-genetics'),
  },
  {
    a: refOf('accelerator', 'activate-foundation-stack'),
    b: refOf('node', 'lab-results'),
  },
  {
    a: refOf('accelerator', 'activate-foundation-stack'),
    b: refOf('symptom', 'fatigue'),
  },
  {
    a: refOf('accelerator', 'activate-foundation-stack'),
    b: refOf('symptom', 'stress'),
  },
  {
    a: refOf('accelerator', 'activate-foundation-stack'),
    b: refOf('supplement', 'methylfolate-b-complex'),
  },
  {
    a: refOf('accelerator', 'activate-foundation-stack'),
    b: refOf('supplement', 'magnesium'),
  },
  {
    a: refOf('accelerator', 'activate-foundation-stack'),
    b: refOf('pillar', 'supplement-adherence'),
  },
  {
    a: refOf('accelerator', 'activate-foundation-stack'),
    b: refOf('pillar', 'sleep-quality'),
  },

  // supplement 'iron' <-> node 'my-genetics', gene 'hfe' (safety cross-check)
  {
    a: refOf('supplement', 'iron'),
    b: refOf('node', 'my-genetics'),
  },
  {
    a: refOf('supplement', 'iron'),
    b: refOf('gene', 'hfe'),
  },

  // goal 'build-lean-mass' <-> nodes, bodycomp, accelerator
  {
    a: refOf('goal', 'build-lean-mass'),
    b: refOf('node', 'my-biology'),
  },
  {
    a: refOf('goal', 'build-lean-mass'),
    b: refOf('node', 'my-nutrition'),
  },
  {
    a: refOf('goal', 'build-lean-mass'),
    b: refOf('node', 'my-supplements'),
  },
  {
    a: refOf('goal', 'build-lean-mass'),
    b: refOf('bodycomp', 'lean-mass'),
  },
  {
    a: refOf('goal', 'build-lean-mass'),
    b: refOf('accelerator', 'zone-2-movement-block'),
  },
];

// ---------------------------------------------------------------------------
// relatedRefs
//
// Returns the Set of EntityRefs that share an edge with the selection's own ref,
// PLUS the selection's own ref itself.
//
// edges defaults to RELATION_GRAPH; pass a custom array for testing or
// per-panel overrides.
//
// PURE. Never throws.
// ---------------------------------------------------------------------------

export function relatedRefs(
  sel: Selection,
  edges: RelationEdge[] = RELATION_GRAPH,
): Set<EntityRef> {
  const own = refOf(sel.type, sel.id);
  const result = new Set<EntityRef>([own]);

  for (const edge of edges) {
    if (edge.a === own) {
      result.add(edge.b);
    } else if (edge.b === own) {
      result.add(edge.a);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// isRelated
//
// Returns true when the given entity is in the related-refs set for sel.
// If sel is null, returns false (neutral state: no dimming, no highlighting).
// Case-insensitive via refOf.
//
// PURE. Never throws.
// ---------------------------------------------------------------------------

export function isRelated(
  sel: Selection | null,
  entityType: SelectionType,
  entityId: string,
  edges: RelationEdge[] = RELATION_GRAPH,
): boolean {
  if (sel === null) return false;

  try {
    const related = relatedRefs(sel, edges);
    return related.has(refOf(entityType, entityId));
  } catch {
    // Defensive: relatedRefs and refOf are pure and should never throw,
    // but guard here to honour the never-throws contract at this boundary.
    return false;
  }
}
