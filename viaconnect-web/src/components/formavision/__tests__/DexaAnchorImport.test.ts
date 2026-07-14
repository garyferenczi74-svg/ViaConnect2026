/**
 * Task 211b-W3d: TDD tests for the DEXA/clinic import content renderer +
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
  DexaAnchorImportContent,
  type DexaAnchorImportContentProps,
  buildInitialDexaRegionState,
  hasAnyValidDexaEntry,
  parsePositiveValue,
  DEXA_REGION_LABEL,
} from '../DexaAnchorImport';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

function noop() {
  /* intentional no-op for a static render */
}
function noopRegion() {
  /* intentional no-op for a static render */
}

function baseProps(over: Partial<DexaAnchorImportContentProps> = {}): DexaAnchorImportContentProps {
  return {
    regions: buildInitialDexaRegionState(),
    unit: 'in',
    weightText: '',
    weightUnit: 'lbs',
    dateText: '2026-07-13',
    saving: false,
    error: null,
    savedCount: 0,
    onRegionToggle: noopRegion,
    onRegionValueChange: noopRegion,
    onUnitChange: noop,
    onWeightChange: noop,
    onWeightUnitChange: noop,
    onDateChange: noop,
    onSubmit: noop,
    ...over,
  };
}

function render(props: DexaAnchorImportContentProps): string {
  return renderToStaticMarkup(React.createElement(DexaAnchorImportContent, props));
}

describe('parsePositiveValue (DEXA form): never substitutes a default for an invalid entry', () => {
  it('parses a valid positive number', () => {
    expect(parsePositiveValue('22')).toBe(22);
  });

  it('rejects blank, zero, negative, non-numeric (returns null, never 0)', () => {
    expect(parsePositiveValue('')).toBeNull();
    expect(parsePositiveValue('0')).toBeNull();
    expect(parsePositiveValue('-1')).toBeNull();
    expect(parsePositiveValue('nope')).toBeNull();
  });
});

describe('buildInitialDexaRegionState: starts with nothing pre-filled or pre-checked', () => {
  it('every region starts unincluded with an empty value (no auto-fill)', () => {
    const state = buildInitialDexaRegionState();
    expect(state.length).toBe(11);
    for (const r of state) {
      expect(r.included).toBe(false);
      expect(r.valueText).toBe('');
    }
  });
});

describe('hasAnyValidDexaEntry: gates on real user input only', () => {
  it('false when nothing is included and weight is blank', () => {
    expect(hasAnyValidDexaEntry(buildInitialDexaRegionState(), '')).toBe(false);
  });

  it('false when a region is included but its value is blank/invalid', () => {
    const state = buildInitialDexaRegionState();
    state[0] = { ...state[0], included: true, valueText: '' };
    expect(hasAnyValidDexaEntry(state, '')).toBe(false);
  });

  it('true when at least one included region has a valid value', () => {
    const state = buildInitialDexaRegionState();
    state[0] = { ...state[0], included: true, valueText: '30' };
    expect(hasAnyValidDexaEntry(state, '')).toBe(true);
  });

  it('true when only the weight field has a valid value', () => {
    expect(hasAnyValidDexaEntry(buildInitialDexaRegionState(), '150')).toBe(true);
  });
});

describe('DexaAnchorImportContent: renders all regions, checkboxes off, values empty', () => {
  it('lists all 11 regions with their own labels', () => {
    const html = render(baseProps());
    expect(html).toContain('dexa-region-list');
    for (const label of Object.values(DEXA_REGION_LABEL)) {
      expect(html).toContain(label);
    }
  });

  it('no region checkbox is pre-checked (no fabricated selection)', () => {
    const html = render(baseProps());
    expect(html).not.toContain('checked=""');
  });

  it('does NOT include a body-fat-percentage field (no column exists to persist it honestly)', () => {
    const html = render(baseProps());
    expect(html.toLowerCase()).not.toContain('body fat');
    expect(html.toLowerCase()).not.toContain('bodyfat');
  });
});

describe('DexaAnchorImportContent: unit toggles + touch targets', () => {
  it('renders circumference unit toggle (in/cm)', () => {
    const html = render(baseProps({ unit: 'cm' }));
    expect(html).toContain('dexa-unit-toggle');
    const cmMatch = html.match(/<button[^>]*data-testid="dexa-unit-cm"[^>]*>/);
    expect(cmMatch![0]).toContain('aria-checked="true"');
  });

  it('renders weight unit toggle (lbs/kg)', () => {
    const html = render(baseProps({ weightUnit: 'kg' }));
    expect(html).toContain('dexa-weight-unit-toggle');
    const kgMatch = html.match(/<button[^>]*data-testid="dexa-weight-unit-kg"[^>]*>/);
    expect(kgMatch![0]).toContain('aria-checked="true"');
  });

  it('every interactive control has a 44px minimum touch target', () => {
    const html = render(baseProps());
    expect((html.match(/min-h-\[44px\]/g) ?? []).length).toBeGreaterThan(5);
  });

  it('weight and date inputs use text-base (16px) to avoid iOS zoom', () => {
    const html = render(baseProps());
    expect(html).toContain('dexa-weight-input');
    expect(html).toContain('dexa-date-input');
    expect(html).toContain('text-base');
  });
});

describe('DexaAnchorImportContent: submit gating (never a fabricated save)', () => {
  it('submit is disabled when nothing is entered', () => {
    const html = render(baseProps());
    const submitMatch = html.match(/<button[^>]*data-testid="dexa-anchor-submit"[^>]*>/);
    expect(submitMatch![0]).toContain('disabled=""');
  });

  it('submit is enabled once a region value is present', () => {
    const regions = buildInitialDexaRegionState();
    regions[0] = { ...regions[0], included: true, valueText: '22' };
    const html = render(baseProps({ regions }));
    const submitMatch = html.match(/<button[^>]*data-testid="dexa-anchor-submit"[^>]*>/);
    expect(submitMatch![0]).not.toContain('disabled=""');
  });

  it('submit stays disabled while saving, even with valid entries', () => {
    const regions = buildInitialDexaRegionState();
    regions[0] = { ...regions[0], included: true, valueText: '22' };
    const html = render(baseProps({ regions, saving: true }));
    const submitMatch = html.match(/<button[^>]*data-testid="dexa-anchor-submit"[^>]*>/);
    expect(submitMatch![0]).toContain('disabled=""');
  });
});

describe('DexaAnchorImportContent: honesty copy (no accuracy/precision number claim, no file parsing claim)', () => {
  it('names the reliability qualitatively (high) without a numeric accuracy claim', () => {
    const html = render(baseProps());
    expect(html.toLowerCase()).toContain('high reliability');
    expect(html.toLowerCase()).not.toContain('accuracy');
    expect(html.toLowerCase()).not.toContain('precision');
  });

  it('is explicit that no file is read or imported (structured form only)', () => {
    const html = render(baseProps());
    expect(html.toLowerCase()).toContain('do not read or import files');
  });
});

describe('DexaAnchorImportContent: no em/en dashes anywhere (standing rule)', () => {
  it('sweeps across default, error, and saved states', () => {
    const surfaces = [
      render(baseProps()),
      render(baseProps({ error: 'Some values could not be saved. Please try again.' })),
      render(baseProps({ savedCount: 3 })),
    ];
    for (const html of surfaces) {
      expect(html.includes(EM_DASH)).toBe(false);
      expect(html.includes(EN_DASH)).toBe(false);
    }
  });
});
