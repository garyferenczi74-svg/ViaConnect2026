/**
 * src/lib/journey/connectionGraph.ts
 *
 * PURE derivation and layout helpers for the section 3.8 "Connection map"
 * (Prompt 208d, Task D-T7).
 *
 * Exposes:
 *   - ConnectionNode: a typed, labelled node derived from a RelationEdge set
 *   - buildConnectionGraph: collect distinct nodes from edge refs, dedup,
 *     humanize labels, echo edges back. One source for the ConnectionMap component.
 *   - nodeLayout: deterministic circular layout for ConnectionNode[].
 *
 * Contract:
 *   - PURE: no DB, no React, no Supabase, no side effects.
 *   - DETERMINISTIC: same input -> identical output.
 *   - NEVER THROWS: all error paths are guarded.
 *   - Coordinates rounded to at most 3 decimal places.
 *   - No em/en-dashes. No emojis. TypeScript strict (no any).
 */

import {
  RELATION_GRAPH,
  type EntityRef,
  type RelationEdge,
  type SelectionType,
} from './selection';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConnectionNode {
  /** Canonical "type:id" EntityRef. */
  ref: EntityRef;
  /** The parsed SelectionType from the left of the first colon. */
  type: SelectionType;
  /** The parsed id from the right of the first colon (already lowercased). */
  id: string;
  /** Human-readable label: dashes replaced with spaces, first char uppercased. */
  label: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Round to at most 3 decimal places, guarding NaN/Infinity -> 0. */
function safe3(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 1000) / 1000;
}

/**
 * Humanize an id for display: replace '-' with ' ', then capitalize the
 * first character. Simple and deterministic; no hand-mapped special cases.
 *
 * Examples:
 *   'my-genetics'             -> 'My genetics'
 *   'hfe'                     -> 'Hfe'
 *   'zone-2-movement-block'   -> 'Zone 2 movement block'
 *   'activate-foundation-stack' -> 'Activate foundation stack'
 */
function humanize(id: string): string {
  if (!id) return '';
  const spaced = id.replace(/-/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Parse a ref ("type:id") into { type, id }.
 * Guards malformed refs (no ':'): type = whole string cast, id = ''.
 * Never throws.
 */
function parseRef(ref: EntityRef): { type: SelectionType; id: string } {
  const colonIdx = ref.indexOf(':');
  if (colonIdx === -1) {
    // Malformed ref: use the whole string as type, empty id.
    return { type: ref as SelectionType, id: '' };
  }
  return {
    type: ref.slice(0, colonIdx) as SelectionType,
    id: ref.slice(colonIdx + 1),
  };
}

// ---------------------------------------------------------------------------
// buildConnectionGraph
// ---------------------------------------------------------------------------

/**
 * Derive a deduplicated node list from the relation edge set and echo the
 * edges back so the component has a single coherent source.
 *
 * Node order: first appearance while scanning edges in order, with `a` before
 * `b` within each edge. Duplicate refs are silently dropped (only the first
 * occurrence is kept).
 *
 * Never throws. Returns { nodes: [], edges: [] } for an empty edge array.
 */
export function buildConnectionGraph(
  edges: RelationEdge[] = RELATION_GRAPH,
): { nodes: ConnectionNode[]; edges: RelationEdge[] } {
  const safeEdges = Array.isArray(edges) ? edges : [];

  const seen = new Set<EntityRef>();
  const nodes: ConnectionNode[] = [];

  for (const edge of safeEdges) {
    for (const ref of [edge.a, edge.b] as EntityRef[]) {
      if (seen.has(ref)) continue;
      seen.add(ref);

      const { type, id } = parseRef(ref);
      nodes.push({
        ref,
        type,
        id,
        label: humanize(id),
      });
    }
  }

  return { nodes, edges: safeEdges };
}

// ---------------------------------------------------------------------------
// nodeLayout
// ---------------------------------------------------------------------------

export interface NodePosition {
  ref: EntityRef;
  x: number;
  y: number;
}

export interface NodeLayoutOptions {
  width?: number;
  height?: number;
  radius?: number;
}

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 320;
const DEFAULT_RADIUS = 130;

/**
 * Deterministic circular layout. Node i is placed at angle
 * (-90deg + i * 360/n) on a circle centered at (width/2, height/2).
 *
 * Special cases:
 *   n === 0  -> []
 *   n === 1  -> center point (no radius used)
 *
 * Coordinates rounded to at most 3 decimal places and guaranteed finite.
 * Never throws.
 */
export function nodeLayout(
  nodes: ConnectionNode[],
  opts?: NodeLayoutOptions,
): NodePosition[] {
  if (!Array.isArray(nodes) || nodes.length === 0) return [];

  const width =
    opts?.width !== undefined && Number.isFinite(opts.width) && opts.width > 0
      ? opts.width
      : DEFAULT_WIDTH;
  const height =
    opts?.height !== undefined && Number.isFinite(opts.height) && opts.height > 0
      ? opts.height
      : DEFAULT_HEIGHT;
  const radius =
    opts?.radius !== undefined &&
    Number.isFinite(opts.radius) &&
    opts.radius >= 0
      ? opts.radius
      : DEFAULT_RADIUS;

  const cx = width / 2;
  const cy = height / 2;
  const n = nodes.length;

  if (n === 1) {
    return [{ ref: nodes[0].ref, x: safe3(cx), y: safe3(cy) }];
  }

  const positions: NodePosition[] = [];
  for (let i = 0; i < n; i++) {
    // Start at -90 degrees (top of circle) and step evenly around.
    const angleDeg = -90 + i * (360 / n);
    const angleRad = (angleDeg * Math.PI) / 180;
    const x = safe3(cx + radius * Math.cos(angleRad));
    const y = safe3(cy + radius * Math.sin(angleRad));
    positions.push({ ref: nodes[i].ref, x, y });
  }

  return positions;
}
