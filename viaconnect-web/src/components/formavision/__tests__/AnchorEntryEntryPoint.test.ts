/**
 * Task 211b-W3d: TDD tests for the anchor entry-point content renderer
 * (the collapsed toggle + tab switch mounted near PersonalPrecisionPanel).
 *
 * Written as a plain .ts file (React.createElement, no JSX) matching
 * CycleOptIn.test.ts's convention, so no new .tsx entry needs to be
 * registered in vitest.config.ts's name-gated include list.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AnchorEntryEntryPointContent,
  type AnchorEntryEntryPointContentProps,
} from '../AnchorEntryEntryPoint';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

function noop() {
  /* intentional no-op for a static render */
}

function baseProps(
  over: Partial<AnchorEntryEntryPointContentProps> = {},
): AnchorEntryEntryPointContentProps {
  return {
    expanded: false,
    activeTab: 'tape',
    onToggleExpanded: noop,
    onTabChange: noop,
    panel: null,
    ...over,
  };
}

function render(props: AnchorEntryEntryPointContentProps): string {
  return renderToStaticMarkup(React.createElement(AnchorEntryEntryPointContent, props));
}

describe('AnchorEntryEntryPointContent: collapsed by default (honest, no forced surface)', () => {
  it('collapsed: shows only the toggle, no tabs, no panel body', () => {
    const html = render(baseProps({ expanded: false }));
    expect(html).toContain('anchor-entry-toggle');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('anchor-entry-body');
    expect(html).not.toContain('anchor-entry-tabs');
  });

  it('collapsed toggle copy is honest: names both tape and DEXA, no accuracy/precision number', () => {
    const html = render(baseProps({ expanded: false }));
    expect(html.toLowerCase()).toContain('tape');
    expect(html.toLowerCase()).toContain('dexa');
    expect(html.toLowerCase()).not.toContain('accuracy');
    expect(html).not.toMatch(/\d+(\.\d+)?\s*%/);
  });
});

describe('AnchorEntryEntryPointContent: expanded shows the tab switch + panel', () => {
  it('expanded: shows both tabs and renders the provided panel node', () => {
    const html = render(
      baseProps({
        expanded: true,
        panel: React.createElement('div', { 'data-testid': 'stub-panel' }, 'stub'),
      }),
    );
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('anchor-entry-tab-tape');
    expect(html).toContain('anchor-entry-tab-dexa');
    expect(html).toContain('stub-panel');
  });

  it('the active tab is reflected via aria-selected', () => {
    const html = render(baseProps({ expanded: true, activeTab: 'dexa' }));
    const dexaMatch = html.match(/<button[^>]*data-testid="anchor-entry-tab-dexa"[^>]*>/);
    const tapeMatch = html.match(/<button[^>]*data-testid="anchor-entry-tab-tape"[^>]*>/);
    expect(dexaMatch![0]).toContain('aria-selected="true"');
    expect(tapeMatch![0]).toContain('aria-selected="false"');
  });
});

describe('AnchorEntryEntryPointContent: no em/en dashes anywhere (standing rule)', () => {
  it('sweeps collapsed and expanded states', () => {
    const surfaces = [
      render(baseProps({ expanded: false })),
      render(baseProps({ expanded: true, activeTab: 'tape' })),
      render(baseProps({ expanded: true, activeTab: 'dexa' })),
    ];
    for (const html of surfaces) {
      expect(html.includes(EM_DASH)).toBe(false);
      expect(html.includes(EN_DASH)).toBe(false);
    }
  });
});
