/**
 * src/components/journey/connections/__tests__/ConnectionMap.failopen.test.ts
 *
 * Isolated test for the fail-open path when buildConnectionGraph returns an
 * empty graph (Prompt 208d, Task D-T7, 3.8).
 *
 * Uses vi.doMock to override buildConnectionGraph for this test only, so the
 * mock does not pollute the existing ConnectionMap.render.test.ts tests.
 *
 * Primary assertions:
 *   - Rendering does NOT throw.
 *   - HTML contains the honest fallback text "No connections to display yet."
 *   - HTML does NOT contain a real node label (proving the map did not render).
 *
 * PURE render path only. No em/en-dashes. No emojis.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('ConnectionMap - fail-open (empty graph)', () => {
  beforeEach(() => {
    // Mock buildConnectionGraph to return an empty graph for this test suite.
    vi.doMock('@/lib/journey/connectionGraph', async () => {
      const actual = await vi.importActual<typeof import('@/lib/journey/connectionGraph')>(
        '@/lib/journey/connectionGraph',
      );
      return {
        ...actual,
        buildConnectionGraph: () => ({
          nodes: [],
          edges: [],
        }),
      };
    });
  });

  afterEach(() => {
    // Clean up the mock after the test.
    vi.doUnmock('@/lib/journey/connectionGraph');
  });

  it('renders the fail-open fallback without throwing', async () => {
    const { JourneySelectionProvider } = await import(
      '@/components/journey/JourneySelectionContext'
    );
    const { ConnectionMap } = await import(
      '@/components/journey/connections/ConnectionMap'
    );

    const renderMap = () => {
      return renderToStaticMarkup(
        React.createElement(
          JourneySelectionProvider,
          null,
          React.createElement(ConnectionMap),
        ),
      );
    };

    expect(() => renderMap()).not.toThrow();
  });

  it('contains the honest fallback text "No connections to display yet."', async () => {
    const { JourneySelectionProvider } = await import(
      '@/components/journey/JourneySelectionContext'
    );
    const { ConnectionMap } = await import(
      '@/components/journey/connections/ConnectionMap'
    );

    const html = renderToStaticMarkup(
      React.createElement(
        JourneySelectionProvider,
        null,
        React.createElement(ConnectionMap),
      ),
    );

    expect(html).toContain('No connections to display yet.');
  });

  it('does NOT contain a real node label like "My genetics" (proving map did not render)', async () => {
    const { JourneySelectionProvider } = await import(
      '@/components/journey/JourneySelectionContext'
    );
    const { ConnectionMap } = await import(
      '@/components/journey/connections/ConnectionMap'
    );

    const html = renderToStaticMarkup(
      React.createElement(
        JourneySelectionProvider,
        null,
        React.createElement(ConnectionMap),
      ),
    );

    expect(html).not.toContain('My genetics');
  });
});
