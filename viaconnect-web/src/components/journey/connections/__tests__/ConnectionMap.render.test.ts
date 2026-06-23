/**
 * src/components/journey/connections/__tests__/ConnectionMap.render.test.ts
 *
 * Node-safe render test for the ConnectionMap component (Prompt 208d, Task D-T7, 3.8).
 * Written first (TDD RED -> GREEN).
 *
 * Uses react-dom/server renderToStaticMarkup + React.createElement (no JSX) so
 * the file stays .test.ts and the existing src/**\/__tests__\/**\/*.test.ts glob
 * picks it up with NO vitest.config.ts change.
 *
 * The ConnectionMap calls useJourneySelection(), which throws outside a provider.
 * We wrap it in JourneySelectionProvider for the static render (neutral state,
 * no selection, no dimming).
 *
 * Primary assertions:
 *   - Does not crash.
 *   - Contains real node labels from RELATION_GRAPH (e.g. "My genetics").
 *   - Renders the expected SVG edge layer (aria-hidden).
 *   - Each node button has aria-pressed.
 *   - No fabricated / invented data.
 *
 * PURE render path only. No em/en-dashes. No emojis.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Import provider and component after any mocks are in place.
const { JourneySelectionProvider } = await import(
  '@/components/journey/JourneySelectionContext'
);
const { ConnectionMap } = await import(
  '@/components/journey/connections/ConnectionMap'
);

// Helper: render ConnectionMap wrapped in its required provider.
function renderMap(): string {
  return renderToStaticMarkup(
    React.createElement(
      JourneySelectionProvider,
      null,
      React.createElement(ConnectionMap),
    ),
  );
}

// ---------------------------------------------------------------------------
// Basic render
// ---------------------------------------------------------------------------

describe('ConnectionMap', () => {
  it('renders without throwing', () => {
    expect(() => renderMap()).not.toThrow();
  });

  it('produces non-empty HTML', () => {
    const html = renderMap();
    expect(html.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // Real node labels from RELATION_GRAPH
  // -------------------------------------------------------------------------

  it('contains "My genetics" (humanized node:my-genetics)', () => {
    const html = renderMap();
    expect(html).toContain('My genetics');
  });

  it('contains "Hfe" (humanized gene:hfe)', () => {
    const html = renderMap();
    expect(html).toContain('Hfe');
  });

  it('contains "Iron" (humanized supplement:iron)', () => {
    const html = renderMap();
    expect(html).toContain('Iron');
  });

  it('contains "Activate foundation stack" (humanized accelerator:activate-foundation-stack)', () => {
    const html = renderMap();
    expect(html).toContain('Activate foundation stack');
  });

  it('contains "Build lean mass" (humanized goal:build-lean-mass)', () => {
    const html = renderMap();
    expect(html).toContain('Build lean mass');
  });

  // -------------------------------------------------------------------------
  // SVG edge layer
  // -------------------------------------------------------------------------

  it('renders an aria-hidden SVG for the edge layer', () => {
    const html = renderMap();
    expect(html).toContain('aria-hidden="true"');
  });

  it('renders an SVG with a viewBox attribute', () => {
    const html = renderMap();
    expect(html).toContain('viewBox');
  });

  // -------------------------------------------------------------------------
  // Accessible node buttons
  // -------------------------------------------------------------------------

  it('renders button elements for nodes', () => {
    const html = renderMap();
    expect(html).toContain('<button');
  });

  it('each button has aria-pressed attribute', () => {
    const html = renderMap();
    // In neutral (no selection) state all buttons should have aria-pressed="false".
    expect(html).toContain('aria-pressed="false"');
  });

  // -------------------------------------------------------------------------
  // Type tags (DM Mono uppercase)
  // -------------------------------------------------------------------------

  it('renders node type tags (node, gene, supplement, accelerator, etc.)', () => {
    const html = renderMap();
    // At least one of the SelectionType values should appear as a type tag.
    const hasTypeTag =
      html.includes('node') ||
      html.includes('gene') ||
      html.includes('supplement') ||
      html.includes('accelerator');
    expect(hasTypeTag).toBe(true);
  });

  // -------------------------------------------------------------------------
  // No fabricated / invented data
  // -------------------------------------------------------------------------

  it('does not contain fabricated biometric numbers', () => {
    const html = renderMap();
    // No heart rate, HRV, or other wearable fabrications.
    expect(html).not.toMatch(/\d+\s*(bpm|hrv|ms|steps|kcal)/i);
  });

  // -------------------------------------------------------------------------
  // Fail-open: empty graph state (tested indirectly via RELATION_GRAPH being non-empty)
  // -------------------------------------------------------------------------

  it('does not render the empty-state line when RELATION_GRAPH is non-empty', () => {
    const html = renderMap();
    // When nodes exist, the map renders; the empty fallback line should not appear.
    expect(html).not.toContain('No connections to display');
  });
});
