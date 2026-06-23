'use client';

/**
 * src/components/journey/connections/ConnectionMap.tsx
 *
 * Section 3.8 "Connection map" - interactive node-link diagram for the
 * Your Journey page (Prompt 208d, Task D-T7).
 *
 * Visualizes the REAL RELATION_GRAPH (seeded in selection.ts) as a circular
 * node-link diagram. Selecting a node highlights its related entities and dims
 * the rest, driven by the existing JourneySelectionContext.
 *
 * Edge highlight rule: an edge is highlighted when EITHER endpoint is the
 * currently selected entity. This is simpler than requiring both endpoints to
 * be related, and produces clearer visual feedback - you can immediately see
 * all direct connections from the selection.
 *
 * Visual states (when selection is non-null):
 *   - Related nodes (isRelated(type, id) = true, includes the selection)
 *     -> highlighted: full opacity, teal accent ring + teal type tag.
 *   - Unrelated nodes -> dimmed: opacity 0.35.
 *   - Highlighted edges (either endpoint is the selection) -> full opacity, teal.
 *   - Dimmed edges -> opacity 0.18.
 *   - Neutral (selection = null) -> equal, calm, no dimming.
 *
 * Architecture:
 *   - Inline SVG (aria-hidden) for EDGES only (decorative connector lines).
 *   - HTML <button> elements absolutely positioned over the SVG for NODES
 *     (keyboard-activatable, accessible, native focus management).
 *   - useReducedMotion gates the opacity/transform transitions.
 *   - Fail-open: empty graph renders one calm honest line; never throws.
 *   - No new dependencies. No package.json changes. Inline SVG only.
 *   - No em/en-dashes. No emojis. TypeScript strict (no any).
 */

import { useMemo } from 'react';
import { useJourneySelection } from '@/components/journey/JourneySelectionContext';
import {
  buildConnectionGraph,
  nodeLayout,
  type ConnectionNode,
  type NodePosition,
} from '@/lib/journey/connectionGraph';
import { refOf } from '@/lib/journey/selection';
import { useReducedMotion } from '@/components/body-tracker/HoverSystem/useReducedMotion';

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

const TEAL = '#2DA5A0';
const DM_SANS = 'var(--font-dm-sans), sans-serif';
const DM_MONO = 'var(--font-dm-mono), monospace';
const SVG_W = 320;
const SVG_H = 320;

// ---------------------------------------------------------------------------
// ConnectionMap
// ---------------------------------------------------------------------------

export function ConnectionMap() {
  const { selection, setSelection, isRelated } = useJourneySelection();
  const reduced = useReducedMotion();

  // Static graph - memoized because RELATION_GRAPH is a module-level constant.
  const { nodes, edges } = useMemo(() => buildConnectionGraph(), []);
  const positions: NodePosition[] = useMemo(() => nodeLayout(nodes), [nodes]);

  // Build a quick lookup: ref -> position.
  const posMap = useMemo<Map<string, NodePosition>>(() => {
    const m = new Map<string, NodePosition>();
    for (const p of positions) m.set(p.ref, p);
    return m;
  }, [positions]);

  // Fail-open: nothing to visualize.
  if (nodes.length === 0) {
    return (
      <p
        style={{
          fontFamily: DM_SANS,
          fontSize: 13,
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.6,
        }}
      >
        No connections to display yet.
      </p>
    );
  }

  const transition = reduced ? undefined : 'opacity 0.18s ease, transform 0.18s ease';

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: SVG_W,
        margin: '0 auto',
      }}
    >
      {/* EDGE LAYER: decorative SVG, aria-hidden */}
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
        }}
      >
        {edges.map((edge, i) => {
          const aPos = posMap.get(edge.a);
          const bPos = posMap.get(edge.b);
          if (!aPos || !bPos) return null;

          // An edge is highlighted if either endpoint is the active selection.
          const aIsSelection =
            selection !== null && edge.a === refOf(selection.type, selection.id);
          const bIsSelection =
            selection !== null && edge.b === refOf(selection.type, selection.id);
          const edgeHighlighted = aIsSelection || bIsSelection;

          const opacity =
            selection === null
              ? 0.22
              : edgeHighlighted
                ? 0.75
                : 0.10;

          return (
            <line
              key={i}
              x1={aPos.x}
              y1={aPos.y}
              x2={bPos.x}
              y2={bPos.y}
              stroke={edgeHighlighted && selection !== null ? TEAL : 'rgba(255,255,255,0.5)'}
              strokeWidth={edgeHighlighted && selection !== null ? 1.5 : 1}
              style={{ opacity, transition }}
            />
          );
        })}
      </svg>

      {/* NODE LAYER: absolutely positioned <button> elements */}
      <div
        aria-label="Connection map nodes"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      >
        {nodes.map((node: ConnectionNode) => {
          const pos = posMap.get(node.ref);
          if (!pos) return null;

          const nodeIsSelected =
            selection !== null &&
            selection.type === node.type &&
            selection.id === node.id;

          const nodeRelated = isRelated(node.type, node.id);

          const nodeOpacity =
            selection === null
              ? 1
              : nodeRelated
                ? 1
                : 0.35;

          return (
            <button
              key={node.ref}
              aria-pressed={nodeIsSelected}
              onClick={() =>
                setSelection({ type: node.type, id: node.id, label: node.label })
              }
              style={{
                position: 'absolute',
                // Center the button on the node position.
                // Use percentage of SVG_W/SVG_H so it scales with the SVG.
                left: `${(pos.x / SVG_W) * 100}%`,
                top: `${(pos.y / SVG_H) * 100}%`,
                transform: 'translate(-50%, -50%)',
                background: 'rgba(22,36,64,0.75)',
                border: nodeIsSelected
                  ? `1.5px solid ${TEAL}`
                  : nodeRelated && selection !== null
                    ? `1px solid ${TEAL}`
                    : '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                padding: '4px 7px',
                cursor: 'pointer',
                opacity: nodeOpacity,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                minHeight: 44,
                minWidth: 44,
                pointerEvents: 'auto',
                // Teal ring on keyboard focus for accessibility.
                outline: 'none',
                transition,
                backdropFilter: 'blur(6px)',
              }}
              // Visible focus ring via onFocus/onBlur is not needed because
              // the browser default :focus-visible ring is preserved; we just
              // clear outline above and rely on the CSS :focus-visible ring
              // from global styles. Add inline for safety:
              onFocus={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 2px ${TEAL}`;
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '';
              }}
            >
              {/* Node label */}
              <span
                style={{
                  fontFamily: DM_SANS,
                  fontSize: 11,
                  fontWeight: 500,
                  color:
                    nodeRelated && selection !== null
                      ? TEAL
                      : 'rgba(255,255,255,0.85)',
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  maxWidth: 80,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {node.label}
              </span>

              {/* Type tag */}
              <span
                style={{
                  fontFamily: DM_MONO,
                  fontSize: 9,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color:
                    nodeRelated && selection !== null
                      ? TEAL
                      : 'rgba(255,255,255,0.40)',
                  lineHeight: 1,
                }}
              >
                {node.type}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
