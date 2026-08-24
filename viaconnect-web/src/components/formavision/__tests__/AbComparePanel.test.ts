// Prompt Brief 2: TDD tests for AbComparePanelContent / AbWipeSplitOverlay.

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AbComparePanelContent,
  AbWipeSplitOverlay,
  type AbComparePanelContentProps,
} from '../AbComparePanel';
import type { CircumferenceDelta } from '@/lib/formavision/deltas/compositionDeltas';

const WAIST: CircumferenceDelta = {
  key: 'waist',
  label: 'Waist',
  from: 36,
  to: 33,
  delta: -3,
  direction: 'improved',
  unit: 'in',
};

function render(over: Partial<AbComparePanelContentProps> = {}): string {
  const props: AbComparePanelContentProps = {
    comparable: true,
    compareOn: false,
    onToggle: () => {},
    baselineMode: 'last_scan',
    onBaselineModeChange: () => {},
    baselineKind: 'last_scan',
    wipeT: 0.5,
    onWipeTChange: () => {},
    deltas: [],
    placement: 'controls',
    ...over,
  };
  return renderToStaticMarkup(React.createElement(AbComparePanelContent, props));
}

describe('AbComparePanelContent: dual-home toggle', () => {
  it('md+ home uses comparison-overlay-home-top and the shared toggle testid', () => {
    const html = render({ placement: 'top' });
    expect(html).toContain('comparison-overlay-home-top');
    expect(html).toContain('comparison-overlay-toggle');
    expect(html).toContain('Show A/B Compare');
  });

  it('phone home uses comparison-overlay-home-phone', () => {
    const html = render({ placement: 'phone' });
    expect(html).toContain('comparison-overlay-home-phone');
    expect(html).toContain('comparison-overlay-toggle');
  });

  it('disables the toggle and explains when there is no prior scan', () => {
    const html = render({ placement: 'top', comparable: false });
    expect(html).toContain('disabled=""');
    expect(html).toContain('Comparison needs a prior scan');
  });

  it('labels Hide when compare is on', () => {
    const html = render({ placement: 'phone', compareOn: true });
    expect(html).toContain('Hide A/B Compare');
  });
});

describe('AbComparePanelContent: controls slot', () => {
  it('renders nothing in the controls slot when compare is off', () => {
    const html = render({ placement: 'controls', compareOn: false });
    expect(html).toBe('');
  });

  it('shows last-scan default, protocol-start option, and the wipe slider', () => {
    const html = render({ placement: 'controls', compareOn: true });
    expect(html).toContain('ab-compare-controls');
    expect(html).toContain('ab-baseline-last-scan');
    expect(html).toContain('ab-baseline-protocol-start');
    expect(html).toContain('ab-wipe-slider');
    expect(html).toContain('Last scan');
    expect(html).toContain('Protocol start');
    expect(html).toContain('Parametric body. No photographic reconstruction.');
  });

  it('notes first-scan fallback when protocol start is missing', () => {
    const html = render({
      placement: 'controls',
      compareOn: true,
      baselineMode: 'protocol_start',
      baselineKind: 'first_scan_fallback',
    });
    expect(html).toContain('ab-baseline-fallback-note');
    expect(html).toContain('No protocol start on file. Showing your first scan.');
  });

  it('lists measurement deltas and omits the empty copy when rows exist', () => {
    const html = render({
      placement: 'controls',
      compareOn: true,
      deltas: [WAIST],
    });
    expect(html).toContain('ab-delta-waist');
    expect(html).toContain('Waist');
    expect(html).toContain('3.0 in');
    expect(html).not.toContain('ab-compare-deltas-empty');
  });

  it('honest empty state never claims a 0 change', () => {
    const html = render({ placement: 'controls', compareOn: true, deltas: [] });
    expect(html).toContain('ab-compare-deltas-empty');
    expect(html).toContain('Unknown values are omitted, never shown as 0.');
    expect(html).not.toContain('ab-delta-');
  });

  it('does not mention drugs or FutureMe pairing', () => {
    const html = render({ placement: 'controls', compareOn: true, deltas: [WAIST] });
    expect(html.toLowerCase()).not.toContain('semaglutide');
    expect(html.toLowerCase()).not.toContain('glp-1');
    expect(html).not.toContain('FutureMe');
    expect(html).not.toContain('drug');
  });

  it('has no em or en dashes', () => {
    const EN_DASH = String.fromCharCode(0x2013);
    const EM_DASH = String.fromCharCode(0x2014);
    const html = render({
      placement: 'controls',
      compareOn: true,
      baselineKind: 'first_scan_fallback',
      deltas: [WAIST],
    });
    expect(html).not.toContain(EN_DASH);
    expect(html).not.toContain(EM_DASH);
  });
});

describe('AbWipeSplitOverlay', () => {
  it('renders nothing when hidden', () => {
    const html = renderToStaticMarkup(
      React.createElement(AbWipeSplitOverlay, { wipeT: 0.4, visible: false }),
    );
    expect(html).toBe('');
  });

  it('places the split at the wipe percent when visible', () => {
    const html = renderToStaticMarkup(
      React.createElement(AbWipeSplitOverlay, { wipeT: 0.4, visible: true }),
    );
    expect(html).toContain('ab-wipe-split');
    expect(html).toContain('left:40%');
    expect(html).toContain('Before');
    expect(html).toContain('After');
  });
});
