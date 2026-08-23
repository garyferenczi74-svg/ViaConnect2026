// Prompt 210b P4-T1: GeneticsOverlay presence-gate and render tests (TDD, written first).
//
// Coverage:
//   1. computeGeneticsPresence pure function: all gate branches.
//   2. GeneticsOverlayPanel render: each presence state renders the expected DOM.
//   3. Honesty invariant: no region-band or body-region tint is produced in any state.
//   4. Medical-language absence: diagnostic terms never appear in component output.
//
// Node harness; renderToStaticMarkup (same pattern as JourneyTimeline.test.ts).
// No DOM reconciler needed; no browser APIs invoked.

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { computeGeneticsPresence, GeneticsOverlayPanel } from '../GeneticsOverlay';
import type { GeneticsVariantsData, VariantRecord } from '@/components/genetics/hub/useGeneticsVariants';
import { EMPTY_OK_DATA } from '@/components/genetics/hub/useGeneticsVariants';
import type { PanelKey } from '@/lib/genetics/panelLabels';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMPTY_DATA: GeneticsVariantsData = EMPTY_OK_DATA;

function makeVariant(is_sample: boolean, panel: PanelKey = 'methylation'): VariantRecord {
  return {
    panel_key: panel,
    rsid: 'rs1801133',
    gene: 'MTHFR',
    genotype: 'CT',
    status: 'variant',
    clinical_significance: null,
    severity: null,
    is_sample,
  };
}

function dataWith(variants: VariantRecord[], panel: PanelKey = 'methylation'): GeneticsVariantsData {
  return {
    ...EMPTY_OK_DATA,
    variantsByPanel: { [panel]: variants },
    totalVariants: variants.length,
  };
}

// ---------------------------------------------------------------------------
// 1. computeGeneticsPresence - presence gate logic
// ---------------------------------------------------------------------------

describe('computeGeneticsPresence: presence gate', () => {
  it('empty data (fail-open EMPTY_DATA) -> absent', () => {
    expect(computeGeneticsPresence(EMPTY_DATA)).toBe('absent');
  });

  it('sample-only variants -> absent (sample rows are not real genetics)', () => {
    const data = dataWith([makeVariant(true), makeVariant(true)]);
    expect(computeGeneticsPresence(data)).toBe('absent');
  });

  it('real variants only -> present', () => {
    const data = dataWith([makeVariant(false), makeVariant(false)]);
    expect(computeGeneticsPresence(data)).toBe('present');
  });

  it('mixed: at least one real variant -> present', () => {
    const data = dataWith([makeVariant(true), makeVariant(false)]);
    expect(computeGeneticsPresence(data)).toBe('present');
  });

  it('multiple panels: real variant in any panel -> present', () => {
    const data: GeneticsVariantsData = {
      ...EMPTY_OK_DATA,
      variantsByPanel: {
        methylation: [makeVariant(true)],   // sample panel
        nutrition: [makeVariant(false)],    // real panel
      },
      totalVariants: 2,
    };
    expect(computeGeneticsPresence(data)).toBe('present');
  });

  it('all sample across multiple panels -> absent', () => {
    const data: GeneticsVariantsData = {
      ...EMPTY_OK_DATA,
      variantsByPanel: {
        methylation: [makeVariant(true)],
        hormone: [makeVariant(true)],
      },
      totalVariants: 2,
    };
    expect(computeGeneticsPresence(data)).toBe('absent');
  });

  it('single real variant with zero sample rows -> present', () => {
    const data = dataWith([makeVariant(false)]);
    expect(computeGeneticsPresence(data)).toBe('present');
  });

  it('panel array present but empty -> absent', () => {
    const data: GeneticsVariantsData = {
      ...EMPTY_OK_DATA,
      variantsByPanel: { methylation: [] },
      totalVariants: 0,
    };
    expect(computeGeneticsPresence(data)).toBe('absent');
  });
});

// ---------------------------------------------------------------------------
// 2. GeneticsOverlayPanel: render states
// ---------------------------------------------------------------------------

describe('GeneticsOverlayPanel: loading state', () => {
  it('renders loading testid with aria-busy', () => {
    const html = renderToStaticMarkup(
      React.createElement(GeneticsOverlayPanel, { presence: 'loading' }),
    );
    expect(html).toContain('data-testid="genetics-overlay-loading"');
    expect(html).toContain('aria-busy="true"');
  });

  it('loading state does not render invitation or CTA content', () => {
    const html = renderToStaticMarkup(
      React.createElement(GeneticsOverlayPanel, { presence: 'loading' }),
    );
    expect(html).not.toContain('Your Genetics, Your Protocol');
    expect(html).not.toContain('genetics-overlay-cta');
    expect(html).not.toContain('genetics/upload');
  });
});

describe('GeneticsOverlayPanel: present state (invitation)', () => {
  it('renders present testid', () => {
    const html = renderToStaticMarkup(
      React.createElement(GeneticsOverlayPanel, { presence: 'present' }),
    );
    expect(html).toContain('data-testid="genetics-overlay-present"');
  });

  it('shows "Your Genetics, Your Protocol" heading', () => {
    const html = renderToStaticMarkup(
      React.createElement(GeneticsOverlayPanel, { presence: 'present' }),
    );
    expect(html).toContain('Your Genetics, Your Protocol');
  });

  it('includes tendency-not-destiny framing', () => {
    const html = renderToStaticMarkup(
      React.createElement(GeneticsOverlayPanel, { presence: 'present' }),
    );
    // The brief requires "tendency-not-destiny" copy framing.
    expect(html.toLowerCase()).toContain('tendency');
    expect(html.toLowerCase()).toContain('not destiny');
  });

  it('does not show the absent CTA or /genetics/upload link', () => {
    const html = renderToStaticMarkup(
      React.createElement(GeneticsOverlayPanel, { presence: 'present' }),
    );
    expect(html).not.toContain('genetics-overlay-absent');
    expect(html).not.toContain('genetics/upload');
  });

  it('shows AI-estimate disclaimer (Info-pattern copy)', () => {
    const html = renderToStaticMarkup(
      React.createElement(GeneticsOverlayPanel, { presence: 'present' }),
    );
    // Must include a disclaimer note (following the BodyScanResults Info-block pattern).
    expect(html.toLowerCase()).toContain('estimate');
  });
});

describe('GeneticsOverlayPanel: absent state (CTA)', () => {
  it('renders absent testid', () => {
    const html = renderToStaticMarkup(
      React.createElement(GeneticsOverlayPanel, { presence: 'absent' }),
    );
    expect(html).toContain('data-testid="genetics-overlay-absent"');
  });

  it('renders the CTA link pointing to /genetics/upload', () => {
    const html = renderToStaticMarkup(
      React.createElement(GeneticsOverlayPanel, { presence: 'absent' }),
    );
    expect(html).toContain('/genetics/upload');
    expect(html).toContain('data-testid="genetics-overlay-cta"');
  });

  it('CTA link contains descriptive label text', () => {
    const html = renderToStaticMarkup(
      React.createElement(GeneticsOverlayPanel, { presence: 'absent' }),
    );
    // Should tell the user what they can do.
    expect(html.toLowerCase()).toContain('panel');
  });

  it('does not show invitation content', () => {
    const html = renderToStaticMarkup(
      React.createElement(GeneticsOverlayPanel, { presence: 'absent' }),
    );
    expect(html).not.toContain('genetics-overlay-present');
    expect(html).not.toContain('Your Genetics, Your Protocol');
  });
});

// ---------------------------------------------------------------------------
// 3. Honesty invariant: no region-band or body-region tint in ANY state
// ---------------------------------------------------------------------------

describe('GeneticsOverlayPanel: honesty - no fabricated region band or tint', () => {
  const ALL_STATES: Array<'present' | 'absent' | 'loading'> = ['present', 'absent', 'loading'];

  for (const presence of ALL_STATES) {
    it(`state "${presence}": no genetics region band or segment tint rendered`, () => {
      const html = renderToStaticMarkup(
        React.createElement(GeneticsOverlayPanel, { presence }),
      );
      // These are the marker strings that would indicate a fabricated genetic
      // region band or body-region tint. None should appear in any state.
      expect(html).not.toContain('genetics-region-band');
      expect(html).not.toContain('genetics-tint');
      expect(html).not.toContain('genetics-segment');
      expect(html).not.toContain('regionBand');
      expect(html).not.toContain('segmentTint');
    });
  }

  it('present state: no body-region color overlay attributes', () => {
    const html = renderToStaticMarkup(
      React.createElement(GeneticsOverlayPanel, { presence: 'present' }),
    );
    // Should not contain data indicating per-body-region coloring from genetics.
    expect(html).not.toContain('trunk');
    expect(html).not.toContain('right_arm');
    expect(html).not.toContain('left_leg');
  });
});

// ---------------------------------------------------------------------------
// 4. Medical-language compliance: no diagnostic, treatment, cure, or prevention
// ---------------------------------------------------------------------------

describe('GeneticsOverlayPanel: medical language compliance', () => {
  const BANNED_TERMS = ['diagnosis', 'diagnose', 'treatment', 'treat', 'cure', 'prevent', 'prevention'];

  for (const presence of ['present', 'absent'] as const) {
    it(`state "${presence}": contains no prohibited medical/diagnostic language`, () => {
      const html = renderToStaticMarkup(
        React.createElement(GeneticsOverlayPanel, { presence }),
      ).toLowerCase();

      for (const term of BANNED_TERMS) {
        expect(html).not.toContain(term);
      }
    });
  }
});
