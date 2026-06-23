/**
 * src/lib/journey/__tests__/connectionGraph.test.ts
 *
 * Unit tests for the PURE connectionGraph helpers (Prompt 208d, Task D-T7, 3.8).
 * Written first (TDD RED -> GREEN).
 *
 * Tests:
 *   - buildConnectionGraph on a small fixture: dedup, first-appearance order,
 *     correct type/id parse, humanized labels.
 *   - buildConnectionGraph on the real RELATION_GRAPH (default): known nodes present.
 *   - nodeLayout: deterministic, all coords finite, n=0 -> [], n=1 -> centered.
 *     Never throws on empty input.
 *
 * PURE, DETERMINISTIC. No DB, no React, no Supabase.
 * No em/en-dashes. No emojis.
 */

import { describe, it, expect } from 'vitest';
import { buildConnectionGraph, nodeLayout } from '../connectionGraph';
import { refOf } from '../selection';
import type { RelationEdge } from '../selection';

// ---------------------------------------------------------------------------
// buildConnectionGraph - fixture edges
// ---------------------------------------------------------------------------

describe('buildConnectionGraph - small fixture', () => {
  const fixture: RelationEdge[] = [
    { a: refOf('node', 'my-genetics'), b: refOf('gene', 'hfe') },
    { a: refOf('gene', 'hfe'), b: refOf('supplement', 'iron') },
    { a: refOf('node', 'my-genetics'), b: refOf('supplement', 'iron') },
  ];

  it('returns nodes and edges', () => {
    const { nodes, edges } = buildConnectionGraph(fixture);
    expect(Array.isArray(nodes)).toBe(true);
    expect(Array.isArray(edges)).toBe(true);
  });

  it('deduplicates nodes (my-genetics, hfe, iron = 3 distinct nodes)', () => {
    const { nodes } = buildConnectionGraph(fixture);
    expect(nodes).toHaveLength(3);
  });

  it('uses first-appearance order (my-genetics first, then hfe, then iron)', () => {
    const { nodes } = buildConnectionGraph(fixture);
    expect(nodes[0].id).toBe('my-genetics');
    expect(nodes[1].id).toBe('hfe');
    expect(nodes[2].id).toBe('iron');
  });

  it('parses type correctly', () => {
    const { nodes } = buildConnectionGraph(fixture);
    expect(nodes[0].type).toBe('node');
    expect(nodes[1].type).toBe('gene');
    expect(nodes[2].type).toBe('supplement');
  });

  it('humanizes labels: hfe -> Hfe', () => {
    const { nodes } = buildConnectionGraph(fixture);
    const hfe = nodes.find((n) => n.id === 'hfe');
    expect(hfe?.label).toBe('Hfe');
  });

  it('humanizes labels: my-genetics -> My genetics', () => {
    const { nodes } = buildConnectionGraph(fixture);
    const mg = nodes.find((n) => n.id === 'my-genetics');
    expect(mg?.label).toBe('My genetics');
  });

  it('humanizes labels: iron -> Iron', () => {
    const { nodes } = buildConnectionGraph(fixture);
    const iron = nodes.find((n) => n.id === 'iron');
    expect(iron?.label).toBe('Iron');
  });

  it('echoes the same edges back', () => {
    const { edges } = buildConnectionGraph(fixture);
    expect(edges).toEqual(fixture);
  });

  it('is deterministic (same input -> same output)', () => {
    expect(buildConnectionGraph(fixture)).toEqual(buildConnectionGraph(fixture));
  });
});

// ---------------------------------------------------------------------------
// buildConnectionGraph - RELATION_GRAPH (default, real data)
// ---------------------------------------------------------------------------

describe('buildConnectionGraph - real RELATION_GRAPH (default)', () => {
  it('does not throw', () => {
    expect(() => buildConnectionGraph()).not.toThrow();
  });

  it('includes node:my-genetics', () => {
    const { nodes } = buildConnectionGraph();
    const found = nodes.some((n) => n.type === 'node' && n.id === 'my-genetics');
    expect(found).toBe(true);
  });

  it('includes gene:hfe', () => {
    const { nodes } = buildConnectionGraph();
    const found = nodes.some((n) => n.type === 'gene' && n.id === 'hfe');
    expect(found).toBe(true);
  });

  it('includes supplement:iron', () => {
    const { nodes } = buildConnectionGraph();
    const found = nodes.some((n) => n.type === 'supplement' && n.id === 'iron');
    expect(found).toBe(true);
  });

  it('includes accelerator:activate-foundation-stack', () => {
    const { nodes } = buildConnectionGraph();
    const found = nodes.some(
      (n) => n.type === 'accelerator' && n.id === 'activate-foundation-stack',
    );
    expect(found).toBe(true);
  });

  it('labels activate-foundation-stack as "Activate foundation stack"', () => {
    const { nodes } = buildConnectionGraph();
    const n = nodes.find((n) => n.id === 'activate-foundation-stack');
    expect(n?.label).toBe('Activate foundation stack');
  });

  it('labels zone-2-movement-block as "Zone 2 movement block"', () => {
    const { nodes } = buildConnectionGraph();
    const n = nodes.find((n) => n.id === 'zone-2-movement-block');
    expect(n?.label).toBe('Zone 2 movement block');
  });

  it('has no duplicate refs', () => {
    const { nodes } = buildConnectionGraph();
    const refs = nodes.map((n) => n.ref);
    const unique = new Set(refs);
    expect(unique.size).toBe(refs.length);
  });

  it('each node has a non-empty label, id, type, and ref', () => {
    const { nodes } = buildConnectionGraph();
    for (const n of nodes) {
      expect(n.ref.length).toBeGreaterThan(0);
      expect(n.type.length).toBeGreaterThan(0);
      expect(n.id.length).toBeGreaterThan(0);
      expect(n.label.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// buildConnectionGraph - edge cases / malformed refs
// ---------------------------------------------------------------------------

describe('buildConnectionGraph - malformed / edge inputs', () => {
  it('never throws on an empty edge array', () => {
    expect(() => buildConnectionGraph([])).not.toThrow();
    const { nodes, edges } = buildConnectionGraph([]);
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });

  it('does not crash on a ref with no colon (fallback: type=whole string, id="")', () => {
    const bad: RelationEdge[] = [
      { a: 'nocolon' as string, b: refOf('gene', 'hfe') },
    ];
    expect(() => buildConnectionGraph(bad)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// nodeLayout - deterministic circular layout
// ---------------------------------------------------------------------------

describe('nodeLayout', () => {
  it('returns empty array for zero nodes', () => {
    expect(nodeLayout([])).toEqual([]);
  });

  it('does not throw for empty input', () => {
    expect(() => nodeLayout([])).not.toThrow();
  });

  it('returns center position for a single node', () => {
    const { nodes } = buildConnectionGraph([
      { a: refOf('node', 'solo'), b: refOf('gene', 'other') },
    ]);
    // Use only the first node to test n=1 -> center
    const positions = nodeLayout([nodes[0]]);
    expect(positions).toHaveLength(1);
    const { x, y } = positions[0];
    // Default center is 160, 160 (320/2 x 320/2)
    expect(x).toBe(160);
    expect(y).toBe(160);
  });

  it('returns one position per node', () => {
    const { nodes } = buildConnectionGraph();
    const positions = nodeLayout(nodes);
    expect(positions).toHaveLength(nodes.length);
  });

  it('all coordinates are finite', () => {
    const { nodes } = buildConnectionGraph();
    const positions = nodeLayout(nodes);
    for (const pos of positions) {
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(Number.isFinite(pos.y)).toBe(true);
    }
  });

  it('is deterministic (same input -> same output)', () => {
    const { nodes } = buildConnectionGraph();
    const a = nodeLayout(nodes);
    const b = nodeLayout(nodes);
    expect(a).toEqual(b);
  });

  it('rounds coords to at most 3 decimal places', () => {
    const { nodes } = buildConnectionGraph();
    const positions = nodeLayout(nodes);
    for (const pos of positions) {
      // Check the number of decimal digits in the string representation
      const xStr = String(pos.x);
      const yStr = String(pos.y);
      const xDp = xStr.includes('.') ? xStr.split('.')[1].length : 0;
      const yDp = yStr.includes('.') ? yStr.split('.')[1].length : 0;
      expect(xDp).toBeLessThanOrEqual(3);
      expect(yDp).toBeLessThanOrEqual(3);
    }
  });

  it('each position carries the matching ref', () => {
    const { nodes } = buildConnectionGraph();
    const positions = nodeLayout(nodes);
    for (let i = 0; i < nodes.length; i++) {
      expect(positions[i].ref).toBe(nodes[i].ref);
    }
  });

  it('respects custom width/height/radius options', () => {
    const { nodes } = buildConnectionGraph([
      { a: refOf('node', 'a'), b: refOf('node', 'b') },
    ]);
    const positions = nodeLayout(nodes, { width: 400, height: 400, radius: 150 });
    expect(positions).toHaveLength(2);
    for (const pos of positions) {
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(Number.isFinite(pos.y)).toBe(true);
    }
  });

  it('first node is at -90 degrees (top of circle)', () => {
    // For n>=2, node 0 should be at angle -90deg from center (top).
    // x = cx + r * cos(-90deg) = cx + 0 = cx; y = cy + r * sin(-90deg) = cy - r
    const { nodes } = buildConnectionGraph([
      { a: refOf('node', 'a'), b: refOf('node', 'b') },
    ]);
    const cx = 160;
    const cy = 160;
    const r = 130;
    const positions = nodeLayout(nodes, { width: 320, height: 320, radius: r });
    // cos(-PI/2) = 0, sin(-PI/2) = -1
    expect(positions[0].x).toBeCloseTo(cx, 1);
    expect(positions[0].y).toBeCloseTo(cy - r, 1);
  });
});
