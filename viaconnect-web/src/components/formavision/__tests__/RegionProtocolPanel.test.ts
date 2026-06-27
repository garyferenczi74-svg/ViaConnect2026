// Prompt 210b P6-T1: TDD tests for RegionProtocolPanel (written before / alongside
// implementation per TDD discipline).
//
// Coverage:
//   1. Data state (synthesis present): renders real protocol items/flags, general
//      "Your Via Cura Protocol" framing, NO region-targeting string.
//   2. Empty state (synthesis null): honest-disabled invite + CTA to /supplements;
//      no fabricated product names.
//   3. Fetch failure (fail-open): the empty state (which the wrapper always enters
//      on error) shows the invite + CTA and does not crash.
//   4. Same content regardless of selectedBodyPart: the content component has no
//      selectedBodyPart prop; two renders with the same state produce identical HTML.
//   5. Reduced-motion parity on the loading skeleton.
//   6. No em/en dashes in any rendered output (standing rule).
//
// Node harness; renderToStaticMarkup (same pattern as FutureSelfPanel.test.ts /
// GeneticsOverlay.test.ts). No @testing-library/dom required.

import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  RegionProtocolPanelContent,
  fetchProtocolPanelState,
} from '../RegionProtocolPanel';
import type {
  RegionProtocolFetchState,
  RegionProtocolPanelContentProps,
} from '../RegionProtocolPanel';
import type { RecommendedItem, SupplementFlag } from '@/lib/protocol/readSynthesis';
import { safeLog } from '@/lib/utils/safe-log';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const LOADING: RegionProtocolFetchState = { kind: 'loading' };
const EMPTY: RegionProtocolFetchState = { kind: 'empty' };

const VITAMINS: RecommendedItem[] = [
  {
    form: 'Methylfolate (L-5-MTHF)',
    rationale: 'Supports methylation pathway efficiency.',
    evidenceTier: 1,
    ruleRsid: 'rs1801133',
  },
  {
    form: 'Methylcobalamin B12',
    rationale: 'Supports B12 metabolism in MTHFR variant carriers.',
    evidenceTier: 2,
    ruleRsid: 'rs1805087',
  },
];

const FLAGS: SupplementFlag[] = [
  {
    current: 'Folic acid (synthetic)',
    reason: 'MTHFR C677T variant may reduce folic acid conversion.',
    alternativeForm: 'Methylfolate',
    ruleRsid: 'rs1801133',
    evidenceTier: 1,
  },
];

const DATA_STATE: RegionProtocolFetchState = { kind: 'data', vitamins: VITAMINS, flags: FLAGS };
const DATA_EMPTY_ITEMS: RegionProtocolFetchState = { kind: 'data', vitamins: [], flags: [] };

function render(props: RegionProtocolPanelContentProps): string {
  return renderToStaticMarkup(React.createElement(RegionProtocolPanelContent, props));
}

// ---------------------------------------------------------------------------
// 1. Data state: synthesis present
// ---------------------------------------------------------------------------

describe('RegionProtocolPanelContent: data state (synthesis present)', () => {
  it('renders panel testid', () => {
    const html = render({ state: DATA_STATE });
    expect(html).toContain('data-testid="region-protocol-panel"');
  });

  it('shows general "Your Via Cura Protocol" framing', () => {
    const html = render({ state: DATA_STATE });
    expect(html).toContain('Your Via Cura Protocol');
  });

  it('renders real vitamin item from synthesis row', () => {
    const html = render({ state: DATA_STATE });
    expect(html).toContain('Methylfolate (L-5-MTHF)');
  });

  it('renders second vitamin item from synthesis row', () => {
    const html = render({ state: DATA_STATE });
    expect(html).toContain('Methylcobalamin B12');
  });

  it('renders supplement flag from synthesis row', () => {
    const html = render({ state: DATA_STATE });
    expect(html).toContain('Folic acid (synthetic)');
  });

  it('renders rationale text for vitamin item', () => {
    const html = render({ state: DATA_STATE });
    expect(html).toContain('Supports methylation pathway efficiency');
  });

  it('renders flag reason text', () => {
    const html = render({ state: DATA_STATE });
    expect(html).toContain('MTHFR C677T variant may reduce folic acid conversion');
  });

  it('NO region-targeting phrase "targets your"', () => {
    const html = render({ state: DATA_STATE }).toLowerCase();
    expect(html).not.toContain('targets your');
  });

  it('NO "for your waist" region-targeting copy', () => {
    const html = render({ state: DATA_STATE }).toLowerCase();
    expect(html).not.toContain('for your waist');
  });

  it('NO "for your chest" region-targeting copy', () => {
    const html = render({ state: DATA_STATE }).toLowerCase();
    expect(html).not.toContain('for your chest');
  });

  it('NO "region-specific" language', () => {
    const html = render({ state: DATA_STATE }).toLowerCase();
    expect(html).not.toContain('region-specific');
  });

  it('does not show empty/honest-disabled state when data is present', () => {
    const html = render({ state: DATA_STATE });
    expect(html).not.toContain('data-testid="region-protocol-empty"');
    expect(html).not.toContain('data-testid="region-protocol-cta"');
  });

  it('shows disclaimer info block with "not a clinical finding" copy', () => {
    const html = render({ state: DATA_STATE });
    expect(html).toContain('data-testid="region-protocol-disclaimer"');
    expect(html.toLowerCase()).toContain('not a clinical finding');
  });

  it('data state with empty vitamins and flags shows protocol-building message', () => {
    const html = render({ state: DATA_EMPTY_ITEMS });
    expect(html).toContain('data-testid="region-protocol-panel"');
    expect(html.toLowerCase()).toContain('protocol is being personalized');
  });

  it('empty-items message uses neutral copy, not "clinical guidance" (Hannah review)', () => {
    const html = render({ state: DATA_EMPTY_ITEMS });
    // The unqualified "clinical guidance" phrase must not appear (it implied
    // clinical-grade authority in a sub-state that shows no disclaimer).
    expect(html.toLowerCase()).not.toContain('clinical guidance');
    // Exact neutral replacement copy required by review.
    expect(html).toContain('your wellness profile has been processed');
  });
});

// ---------------------------------------------------------------------------
// 2. Empty state: synthesis null
// ---------------------------------------------------------------------------

describe('RegionProtocolPanelContent: empty state (synthesis null)', () => {
  it('renders empty testid', () => {
    const html = render({ state: EMPTY });
    expect(html).toContain('data-testid="region-protocol-empty"');
  });

  it('shows "Your Via Cura Protocol" heading even in empty state', () => {
    const html = render({ state: EMPTY });
    expect(html).toContain('Your Via Cura Protocol');
  });

  it('shows CTA link pointing to /supplements', () => {
    const html = render({ state: EMPTY });
    expect(html).toContain('/supplements');
  });

  it('CTA link has data-testid', () => {
    const html = render({ state: EMPTY });
    expect(html).toContain('data-testid="region-protocol-cta"');
  });

  it('does not show the data-state panel testid in empty state', () => {
    const html = render({ state: EMPTY });
    expect(html).not.toContain('data-testid="region-protocol-panel"');
  });

  it('no fabricated vitamin item names in empty state', () => {
    const html = render({ state: EMPTY });
    expect(html).not.toContain('Methylfolate');
    expect(html).not.toContain('Methylcobalamin');
  });

  it('no fabricated supplement names in empty state', () => {
    const html = render({ state: EMPTY });
    expect(html).not.toContain('MTHFR+');
    expect(html).not.toContain('FOCUS+');
    expect(html).not.toContain('SHRED+');
  });
});

// ---------------------------------------------------------------------------
// 3. Fetch failure (fail-open): wrapper maps error -> empty state
// ---------------------------------------------------------------------------

describe('RegionProtocolPanelContent: fetch failure (fail-open to empty)', () => {
  it('empty state (representing any fetch failure) shows invite, not a crash', () => {
    const html = render({ state: EMPTY });
    expect(html).toContain('data-testid="region-protocol-empty"');
    expect(html).not.toContain('data-testid="region-protocol-panel"');
  });

  it('empty state has the /supplements CTA route', () => {
    const html = render({ state: EMPTY });
    expect(html).toContain('/supplements');
  });

  it('empty state does not show fabricated product list', () => {
    const html = render({ state: EMPTY });
    // Verify no protocol list items are rendered
    expect(html).not.toContain('<ul');
    expect(html).not.toContain('<li');
  });
});

// ---------------------------------------------------------------------------
// 4. Same content regardless of selectedBodyPart
//
// The content component has no selectedBodyPart prop. Content is guaranteed
// identical for every selected body region by structural design.
// ---------------------------------------------------------------------------

describe('RegionProtocolPanelContent: same content regardless of body part', () => {
  it('two independent renders with the same data state produce identical HTML', () => {
    const html1 = render({ state: DATA_STATE });
    const html2 = render({ state: DATA_STATE });
    expect(html1).toBe(html2);
  });

  it('content component ignores extra selectedBodyPart-like props (extra props are ignored)', () => {
    // Cast to prove the prop does not exist on the interface and is ignored.
    type ExtendedProps = RegionProtocolPanelContentProps & { selectedBodyPart?: string };
    const propsWaist: ExtendedProps = { state: DATA_STATE, selectedBodyPart: 'waist' };
    const propsChest: ExtendedProps = { state: DATA_STATE, selectedBodyPart: 'chest' };
    const htmlWaist = renderToStaticMarkup(
      React.createElement(RegionProtocolPanelContent, propsWaist),
    );
    const htmlChest = renderToStaticMarkup(
      React.createElement(RegionProtocolPanelContent, propsChest),
    );
    // Both must be identical: the component ignores any extra prop and renders
    // the same full protocol regardless of which region is "selected".
    expect(htmlWaist).toBe(htmlChest);
  });

  it('no body-region name in the data-state rendered output', () => {
    const html = render({ state: DATA_STATE }).toLowerCase();
    // None of the BODY_PARTS keys should appear as protocol filtering signals.
    const bodyPartKeys = ['waist', 'chest', 'neck', 'hip', 'l_quad', 'r_quad', 'l_calf', 'r_calf'];
    for (const key of bodyPartKeys) {
      // Vitamins and flags from the fixture don't mention these key strings,
      // so they must not appear from the component's own framing copy.
      // (item.form / item.rationale may contain body terms only if the real
      // synthesis data does - here the fixture does not.)
      expect(html).not.toContain(`for your ${key}`);
      expect(html).not.toContain(`targets ${key}`);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Reduced-motion parity on the loading skeleton
// ---------------------------------------------------------------------------

describe('RegionProtocolPanelContent: reduced-motion parity', () => {
  it('loading skeleton has region-protocol-loading testid', () => {
    const html = render({ state: LOADING });
    expect(html).toContain('data-testid="region-protocol-loading"');
  });

  it('loading skeleton has aria-busy="true"', () => {
    const html = render({ state: LOADING });
    expect(html).toContain('aria-busy="true"');
  });

  it('reducedMotion=true: no animate-pulse on loading skeleton', () => {
    const html = render({ state: LOADING, reducedMotion: true });
    expect(html).not.toContain('animate-pulse');
  });

  it('reducedMotion=false (default): loading skeleton uses motion-safe:animate-pulse', () => {
    const html = render({ state: LOADING, reducedMotion: false });
    // Confirm it uses the motion-safe prefixed class, not a bare animate-pulse.
    const stripped = html.replace(/motion-safe:animate-pulse/g, '');
    expect(stripped).not.toContain('animate-pulse');
  });

  it('loading state does not render panel or empty state', () => {
    const html = render({ state: LOADING });
    expect(html).not.toContain('data-testid="region-protocol-panel"');
    expect(html).not.toContain('data-testid="region-protocol-empty"');
  });
});

// ---------------------------------------------------------------------------
// 6. No em/en dashes in any rendered output (standing rule)
//
// U+2013 = en-dash, U+2014 = em-dash. Constructed at runtime via charCodeAt
// so the source file does not contain literal Unicode bytes that could trip a
// commit hook.
// ---------------------------------------------------------------------------

describe('RegionProtocolPanelContent: no em/en dashes (standing rule)', () => {
  const EN_DASH = String.fromCharCode(0x2013);
  const EM_DASH = String.fromCharCode(0x2014);

  const ALL_STATES: RegionProtocolFetchState[] = [
    LOADING,
    EMPTY,
    DATA_STATE,
    DATA_EMPTY_ITEMS,
  ];

  for (const state of ALL_STATES) {
    it(`no em/en dashes in "${state.kind}" state`, () => {
      const html = render({ state });
      expect(html).not.toContain(EN_DASH);
      expect(html).not.toContain(EM_DASH);
      expect(html).not.toContain('&ndash;');
      expect(html).not.toContain('&mdash;');
    });
  }
});

// ---------------------------------------------------------------------------
// 7. fetchProtocolPanelState: the fail-open fetch seam (node, global.fetch mock)
//
// This is the honesty-critical seam: it owns the request, the 5 s timeout, and
// the response->state mapping. It must NEVER throw; the worst case it can return
// is the honest-disabled empty state. global.fetch is stubbed per test so these
// run in the node environment with no jsdom.
// ---------------------------------------------------------------------------

describe('fetchProtocolPanelState: fail-open fetch seam', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('fetch rejects -> empty (never throws)', async () => {
    const warnSpy = vi.spyOn(safeLog, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const result = await fetchProtocolPanelState();

    expect(result.kind).toBe('empty');
    // Fail-open path logged via safeLog (does not surface an error to the user).
    expect(warnSpy).toHaveBeenCalled();
  });

  it('does not reject even when fetch throws (resolves to a value)', async () => {
    vi.spyOn(safeLog, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));

    // If the seam threw, this await would reject and fail the test.
    await expect(fetchProtocolPanelState()).resolves.toEqual({ kind: 'empty' });
  });

  it('res.ok false (e.g. 401 unauthorized) -> empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      }),
    );

    const result = await fetchProtocolPanelState();

    expect(result.kind).toBe('empty');
  });

  it('res ok with { synthesis: row } -> data carrying the row vitamins + flags', async () => {
    const row = {
      recommended_vitamins_minerals: VITAMINS,
      supplement_flags: FLAGS,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ synthesis: row }),
      }),
    );

    const result = await fetchProtocolPanelState();

    expect(result.kind).toBe('data');
    if (result.kind === 'data') {
      expect(result.vitamins).toEqual(VITAMINS);
      expect(result.flags).toEqual(FLAGS);
    }
  });

  it('res ok with { synthesis: row } missing arrays -> data with empty arrays (no throw)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ synthesis: {} }),
      }),
    );

    const result = await fetchProtocolPanelState();

    expect(result.kind).toBe('data');
    if (result.kind === 'data') {
      expect(result.vitamins).toEqual([]);
      expect(result.flags).toEqual([]);
    }
  });

  it('res ok with { synthesis: null } -> empty (honest-disabled, never a fabricated protocol)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ synthesis: null }),
      }),
    );

    const result = await fetchProtocolPanelState();

    expect(result.kind).toBe('empty');
  });

  it('requests the synthesis endpoint with an abort signal (timeout wiring)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ synthesis: null }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchProtocolPanelState();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/protocol/synthesis');
    // The 5 s AbortController timeout passes a signal into fetch.
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
