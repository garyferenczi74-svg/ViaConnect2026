// src/components/formavision/__tests__/seam-region-protocol.test.ts
//
// Prompt 210e E1: SEAM TEST for the FormaVision REGION-TAP-to-PROTOCOL seam.
//
// Seam (from docs/formavision/210e-seam-map.md, Section 5 row "Region tap to protocol"):
//   Producer: RegionProtocolPanel.tsx fetchProtocolPanelState.
//   Consumer: GET /api/protocol/synthesis (getOrComputeUserProtocolSynthesis =
//             the real Via Cura engine, which returns the WHOLE user protocol).
//   Status: WIRED, with a scope note. There is no per-region protocol output in
//           the existing engine; a region tap lands on the real whole-protocol
//           panel, not a region-filtered one.
//
// Gary's recorded 210e decision GOVERNS this seam: the whole-protocol landing is
// ACCEPTED. Region targeting would be new engine scope (banned in this prompt)
// and is deferred to a future prompt. So the honesty-critical assertion is:
//   the tap calls GET /api/protocol/synthesis (the whole-protocol engine) and
//   NOT any region-filtered path; and on null synthesis it falls back to the
//   honest-disabled empty state, never a fabricated or region-scoped protocol.
//
// This test asserts the seam by mocking global fetch and inspecting the exact
// URL called, plus the null-synthesis honest-disabled fallback.
//
// Node harness; no DOM. The seam under test (fetchProtocolPanelState) is a pure
// exported async function, so it is called directly (the renderToStaticMarkup
// precedent in AgentNarration.test.ts is not needed: no component render here).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchProtocolPanelState } from '../RegionProtocolPanel';
import type { RecommendedItem, SupplementFlag } from '@/lib/protocol/readSynthesis';
import { safeLog } from '@/lib/utils/safe-log';

// ---------------------------------------------------------------------------
// The exact whole-protocol endpoint the seam MUST call. This is the real Via
// Cura engine route (getOrComputeUserProtocolSynthesis is wired behind it).
// ---------------------------------------------------------------------------

const WHOLE_PROTOCOL_ENDPOINT = '/api/protocol/synthesis';

// Fixture synthesis row (clearly synthetic; mirrors the real row shape).
const FIXTURE_VITAMINS: RecommendedItem[] = [
  {
    form: 'Methylfolate (L-5-MTHF)',
    rationale: 'Fixture rationale: supports methylation pathway efficiency.',
    evidenceTier: 1,
    ruleRsid: 'rs1801133',
  },
];

const FIXTURE_FLAGS: SupplementFlag[] = [
  {
    current: 'Folic acid (synthetic)',
    reason: 'Fixture reason: variant may reduce folic acid conversion.',
    alternativeForm: 'Methylfolate',
    ruleRsid: 'rs1801133',
    evidenceTier: 1,
  },
];

function makeFetchMock(response: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => response,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// 1. The tap calls the whole-protocol endpoint (and nothing region-filtered)
// ---------------------------------------------------------------------------

describe('REGION-TAP seam: calls GET /api/protocol/synthesis (whole-protocol engine)', () => {
  beforeEach(() => {
    vi.spyOn(safeLog, 'warn').mockImplementation(() => {});
  });

  it('calls fetch exactly once, with the whole-protocol synthesis URL', async () => {
    const fetchMock = makeFetchMock({ synthesis: null });
    vi.stubGlobal('fetch', fetchMock);

    await fetchProtocolPanelState();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(WHOLE_PROTOCOL_ENDPOINT);
  });

  it('the called URL is EXACTLY /api/protocol/synthesis, with no query params (no region filter)', async () => {
    const fetchMock = makeFetchMock({ synthesis: null });
    vi.stubGlobal('fetch', fetchMock);

    await fetchProtocolPanelState();

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    // No query string at all: a region-filtered call would append ?region=... etc.
    expect(url.includes('?')).toBe(false);
    expect(url.endsWith('/synthesis')).toBe(true);
  });

  it('the called URL contains NO region-filter signal (region / bodyPart / part / segment / area)', async () => {
    const fetchMock = makeFetchMock({ synthesis: null });
    vi.stubGlobal('fetch', fetchMock);

    await fetchProtocolPanelState();

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    const lower = url.toLowerCase();
    const regionSignals = ['region', 'bodypart', 'body_part', 'segment', '/part', 'area='];
    for (const signal of regionSignals) {
      expect(lower.includes(signal)).toBe(false);
    }
  });

  it('does NOT call any region-scoped protocol path (e.g. /api/protocol/region)', async () => {
    const fetchMock = makeFetchMock({ synthesis: null });
    vi.stubGlobal('fetch', fetchMock);

    await fetchProtocolPanelState();

    const calledUrls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(calledUrls).toEqual([WHOLE_PROTOCOL_ENDPOINT]);
    // Explicitly assert no hypothetical region-filtered endpoints were hit.
    for (const url of calledUrls) {
      expect(url).not.toBe('/api/protocol/region');
      expect(url).not.toBe('/api/protocol/synthesis/region');
    }
  });

  it('passes an AbortSignal (the 5 s timeout), consistent with the seam contract', async () => {
    const fetchMock = makeFetchMock({ synthesis: null });
    vi.stubGlobal('fetch', fetchMock);

    await fetchProtocolPanelState();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});

// ---------------------------------------------------------------------------
// 2. Whole-protocol data lands unfiltered (the row's items, verbatim)
//
// The seam returns the WHOLE protocol row: it does not filter items by region.
// The full fixture vitamins + flags come back exactly as the engine returned them.
// ---------------------------------------------------------------------------

describe('REGION-TAP seam: whole-protocol data returns unfiltered', () => {
  beforeEach(() => {
    vi.spyOn(safeLog, 'warn').mockImplementation(() => {});
  });

  it('res ok with a synthesis row -> data state carrying the FULL row (no region filtering)', async () => {
    const fetchMock = makeFetchMock({
      synthesis: {
        recommended_vitamins_minerals: FIXTURE_VITAMINS,
        supplement_flags: FIXTURE_FLAGS,
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchProtocolPanelState();

    expect(result.kind).toBe('data');
    if (result.kind === 'data') {
      // Verbatim, whole protocol: identical to the engine's row, not a subset.
      expect(result.vitamins).toEqual(FIXTURE_VITAMINS);
      expect(result.flags).toEqual(FIXTURE_FLAGS);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Honest-disabled fallback on null synthesis (never a fabricated protocol)
//
// Per Gary's decision, when the whole-protocol engine returns null synthesis,
// the tap lands on the honest-disabled empty state. It never fabricates a
// protocol and never silently degrades into a region-scoped guess.
// ---------------------------------------------------------------------------

describe('REGION-TAP seam: honest-disabled fallback on null synthesis', () => {
  beforeEach(() => {
    vi.spyOn(safeLog, 'warn').mockImplementation(() => {});
  });

  it('res ok with { synthesis: null } -> empty (honest-disabled)', async () => {
    vi.stubGlobal('fetch', makeFetchMock({ synthesis: null }));

    const result = await fetchProtocolPanelState();

    expect(result.kind).toBe('empty');
  });

  it('res not ok (e.g. 401 unauthorized) -> empty (honest-disabled), never a fabricated protocol', async () => {
    vi.stubGlobal('fetch', makeFetchMock({ error: 'Unauthorized' }, false, 401));

    const result = await fetchProtocolPanelState();

    expect(result.kind).toBe('empty');
  });

  it('fetch rejects (network down / timeout) -> empty; seam never throws', async () => {
    const warnSpy = vi.spyOn(safeLog, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    // If the seam threw, this await would reject and fail the test.
    await expect(fetchProtocolPanelState()).resolves.toEqual({ kind: 'empty' });
    // Fail-open path is logged (not surfaced to the member as an error).
    expect(warnSpy).toHaveBeenCalled();
  });

  it('the empty fallback carries no protocol items (no fabricated vitamins/flags)', async () => {
    vi.stubGlobal('fetch', makeFetchMock({ synthesis: null }));

    const result = await fetchProtocolPanelState();

    // The empty state is a bare discriminant: it has no vitamins/flags fields at
    // all, so there is no surface on which a fabricated item could ride.
    expect(result).toEqual({ kind: 'empty' });
  });
});
