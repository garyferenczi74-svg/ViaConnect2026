/**
 * Task 211b-W3d: TDD tests for the tape guided-entry content renderer +
 * pure helpers.
 *
 * Uses renderToStaticMarkup (no DOM, no @testing-library) against the
 * exported PURE content renderer, matching CycleOptIn.test.ts's pattern.
 * Written as a plain .ts file (React.createElement, no JSX) so it matches
 * vitest.config.ts's 'src/**\/__tests__/**\/*.test.ts' include glob without
 * needing a new .tsx entry registered there.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  TapeAnchorEntryContent,
  type TapeAnchorEntryContentProps,
  parsePositiveValue,
  TAPE_REGION_LABEL,
} from '../TapeAnchorEntry';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

function noop() {
  /* intentional no-op for a static render */
}

function baseProps(over: Partial<TapeAnchorEntryContentProps> = {}): TapeAnchorEntryContentProps {
  return {
    region: 'waist_natural',
    unit: 'in',
    valueText: '',
    dateText: '2026-07-13',
    saving: false,
    error: null,
    savedAnchors: [],
    onRegionChange: noop,
    onUnitChange: noop,
    onValueChange: noop,
    onDateChange: noop,
    onSubmit: noop,
    ...over,
  };
}

function render(props: TapeAnchorEntryContentProps): string {
  return renderToStaticMarkup(React.createElement(TapeAnchorEntryContent, props));
}

describe('parsePositiveValue: never substitutes a default for an invalid entry', () => {
  it('parses a valid positive number', () => {
    expect(parsePositiveValue('30')).toBe(30);
    expect(parsePositiveValue('12.5')).toBe(12.5);
  });

  it('rejects blank, zero, negative, and non-numeric input (returns null, never 0)', () => {
    expect(parsePositiveValue('')).toBeNull();
    expect(parsePositiveValue('   ')).toBeNull();
    expect(parsePositiveValue('0')).toBeNull();
    expect(parsePositiveValue('-5')).toBeNull();
    expect(parsePositiveValue('abc')).toBeNull();
  });
});

describe('TapeAnchorEntryContent: region + how-to copy', () => {
  it('renders the region select with all 11 regions', () => {
    const html = render(baseProps());
    expect(html).toContain('tape-region-select');
    for (const label of Object.values(TAPE_REGION_LABEL)) {
      expect(html).toContain(label);
    }
  });

  it('renders how-to copy for the currently selected region', () => {
    const html = render(baseProps({ region: 'neck' }));
    expect(html).toContain('tape-region-howto');
    expect(html.toLowerCase()).toContain('larynx');
  });

  it('how-to copy changes when the region changes', () => {
    const neckHtml = render(baseProps({ region: 'neck' }));
    const calfHtml = render(baseProps({ region: 'calf' }));
    expect(neckHtml).not.toEqual(calfHtml);
    expect(calfHtml.toLowerCase()).toContain('calf');
  });
});

describe('TapeAnchorEntryContent: unit toggle + touch targets', () => {
  it('renders in/cm unit options with radiogroup semantics', () => {
    const html = render(baseProps({ unit: 'in' }));
    expect(html).toContain('tape-unit-toggle');
    expect(html).toContain('role="radiogroup"');
    const inMatch = html.match(/<button[^>]*data-testid="tape-unit-in"[^>]*>/);
    expect(inMatch![0]).toContain('aria-checked="true"');
  });

  it('every interactive control has a 44px minimum touch target', () => {
    const html = render(baseProps());
    expect((html.match(/min-h-\[44px\]/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it('numeric and date inputs use text-base (16px) to avoid iOS zoom', () => {
    const html = render(baseProps());
    expect(html).toContain('tape-value-input');
    expect(html).toContain('tape-date-input');
    expect(html).toContain('text-base');
  });
});

describe('TapeAnchorEntryContent: submit gating (never a fabricated save)', () => {
  it('submit is disabled with an empty or invalid value', () => {
    const html = render(baseProps({ valueText: '' }));
    const submitMatch = html.match(/<button[^>]*data-testid="tape-anchor-submit"[^>]*>/);
    expect(submitMatch![0]).toContain('disabled=""');
  });

  it('submit is enabled with a valid positive value', () => {
    const html = render(baseProps({ valueText: '30' }));
    const submitMatch = html.match(/<button[^>]*data-testid="tape-anchor-submit"[^>]*>/);
    expect(submitMatch![0]).not.toContain('disabled=""');
  });

  it('submit stays disabled while saving, even with a valid value', () => {
    const html = render(baseProps({ valueText: '30', saving: true }));
    const submitMatch = html.match(/<button[^>]*data-testid="tape-anchor-submit"[^>]*>/);
    expect(submitMatch![0]).toContain('disabled=""');
  });
});

describe('TapeAnchorEntryContent: error + saved state (honest, no fabricated success)', () => {
  it('renders the error message when present', () => {
    const html = render(baseProps({ error: 'Could not save that just now. Please try again.' }));
    expect(html).toContain('tape-anchor-error');
    expect(html).toContain('Could not save that just now');
  });

  it('renders nothing error-shaped when error is null', () => {
    const html = render(baseProps({ error: null }));
    expect(html).not.toContain('tape-anchor-error');
  });

  it('renders no saved list when nothing has been saved yet', () => {
    const html = render(baseProps({ savedAnchors: [] }));
    expect(html).not.toContain('tape-anchor-saved-list');
  });

  it('renders exactly the saved regions, by their own label, once saved', () => {
    const html = render(
      baseProps({
        savedAnchors: [
          { region: 'neck', valueCm: 36.83 },
          { region: 'hip', valueCm: 95.5 },
        ],
      }),
    );
    expect(html).toContain('tape-anchor-saved-list');
    expect(html).toContain('Neck recorded');
    expect(html).toContain('Hips recorded');
  });
});

describe('TapeAnchorEntryContent: honesty copy (no accuracy/precision number claim)', () => {
  it('names the reliability qualitatively (medium) without a numeric accuracy claim', () => {
    const html = render(baseProps());
    expect(html.toLowerCase()).toContain('medium reliability');
    expect(html).not.toMatch(/\d+(\.\d+)?\s*%/);
    expect(html.toLowerCase()).not.toContain('accuracy');
    expect(html.toLowerCase()).not.toContain('precision');
  });
});

describe('TapeAnchorEntryContent: no em/en dashes anywhere (standing rule)', () => {
  it('sweeps across every region and every state', () => {
    const surfaces = [
      render(baseProps({ region: 'neck' })),
      render(baseProps({ region: 'waist_natural', unit: 'cm' })),
      render(baseProps({ error: 'Enter a measurement greater than zero.' })),
      render(baseProps({ savedAnchors: [{ region: 'calf', valueCm: 38 }] })),
    ];
    for (const html of surfaces) {
      expect(html.includes(EM_DASH)).toBe(false);
      expect(html.includes(EN_DASH)).toBe(false);
    }
  });
});
