'use client';

/**
 * src/components/formavision/RegionProtocolPanel.tsx
 *
 * Prompt 210b P6-T1: RegionProtocolPanel (WHOLE-PROTOCOL)
 *
 * Shows the user's FULL current Via Cura protocol when a body region is
 * selected on the avatar. Content is IDENTICAL for every region: no body-
 * region-to-product mapping exists in this codebase, so no region-targeted
 * claim is ever produced.
 *
 * Source (read-only, fail-open):
 *   GET /api/protocol/synthesis -> { synthesis: UserProtocolSynthesisRow | null }
 *   The route is fail-open: 200 { synthesis: null } on any read failure.
 *
 * States:
 *   loading  -- skeleton while the fetch is in flight
 *   data     -- shows recommended_vitamins_minerals + supplement_flags from
 *               the synthesis row; framed as "Your Via Cura Protocol"
 *   empty    -- synthesis null OR fetch failure -> honest-disabled invite +
 *               CTA to /supplements; never a fabricated or empty protocol
 *
 * Fetch pattern: mirror NutritionByGeneticsPanel (AbortController timeout +
 * try/catch fail-open; safeLog on failure).
 *
 * Honesty contract:
 *   - "Your Via Cura Protocol" framing only. NO region-targeting language.
 *   - NO fabricated product names. Only items returned by the synthesis row.
 *   - synthesis null -> honest-disabled (never rendered as a protocol).
 *   - Disclaimer info block in data state.
 *
 * Standing rules: Lucide strokeWidth 1.5, no emojis, no em/en dashes, design
 * tokens only (Teal #2DA5A0 / Navy #1E3054 / Orange #B75E18), Instrument Sans.
 * Desktop + mobile responsive from first line. 44px touch targets. Fail-open.
 * No any.
 *
 * 2026-06-27. No em/en-dashes.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pill, Info, ArrowRight } from 'lucide-react';
import { safeLog } from '@/lib/utils/safe-log';
import type { RecommendedItem, SupplementFlag } from '@/lib/protocol/readSynthesis';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SynthesisResponse {
  synthesis: {
    recommended_vitamins_minerals?: RecommendedItem[];
    supplement_flags?: SupplementFlag[];
  } | null;
}

/**
 * Fetch state for the panel. The wrapper maps every non-ok/error outcome to
 * { kind: 'empty' } (honest-disabled), so the content component never needs to
 * handle an explicit error branch.
 */
export type RegionProtocolFetchState =
  | { kind: 'loading' }
  | { kind: 'data'; vitamins: RecommendedItem[]; flags: SupplementFlag[] }
  | { kind: 'empty' };

/**
 * The settled (non-loading) result of the fetch seam. 'loading' is the initial
 * state the wrapper sets before calling the seam, so it is excluded here.
 */
export type RegionProtocolResolvedState = Exclude<RegionProtocolFetchState, { kind: 'loading' }>;

// ---------------------------------------------------------------------------
// Fetch seam (pure, exported for node TDD)
//
// Owns the request, the 5 s AbortController timeout, and the response->state
// mapping. FAIL-OPEN: every non-ok response, missing synthesis, or thrown /
// aborted error resolves to { kind: 'empty' }. This function NEVER rejects, so
// the honest-disabled state is the worst case the UI can ever reach.
// ---------------------------------------------------------------------------

/**
 * Fetches GET /api/protocol/synthesis and maps the outcome to a resolved state.
 *
 *   res ok + { synthesis: row }  -> { kind: 'data', vitamins, flags }
 *   res ok + { synthesis: null } -> { kind: 'empty' }
 *   !res.ok (e.g. 401)           -> { kind: 'empty' }
 *   fetch rejects / timeout      -> { kind: 'empty' } (logged via safeLog)
 *
 * Never throws.
 */
export async function fetchProtocolPanelState(): Promise<RegionProtocolResolvedState> {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch('/api/protocol/synthesis', { signal: controller.signal });
    if (!res.ok) {
      return { kind: 'empty' };
    }
    const json = (await res.json()) as SynthesisResponse;
    if (!json.synthesis) {
      return { kind: 'empty' };
    }
    return {
      kind: 'data',
      vitamins: json.synthesis.recommended_vitamins_minerals ?? [],
      flags: json.synthesis.supplement_flags ?? [],
    };
  } catch (err: unknown) {
    safeLog.warn('RegionProtocolPanel', 'fetch failed; rendering honest-disabled state', {
      err,
    });
    return { kind: 'empty' };
  } finally {
    clearTimeout(timerId);
  }
}

// ---------------------------------------------------------------------------
// Pure content renderer (no hooks; exported for TDD)
// ---------------------------------------------------------------------------

export interface RegionProtocolPanelContentProps {
  state: RegionProtocolFetchState;
  reducedMotion?: boolean;
}

/**
 * Pure renderer. No hooks, no side effects. Accepts the resolved fetch state
 * as a prop. Exported for direct testing with renderToStaticMarkup.
 *
 * Does NOT accept selectedBodyPart: the content is identical for every region,
 * guaranteeing the no-region-filtering contract at the type level.
 */
export function RegionProtocolPanelContent({
  state,
  reducedMotion = false,
}: RegionProtocolPanelContentProps) {
  // Loading skeleton
  if (state.kind === 'loading') {
    return (
      <div
        data-testid="region-protocol-loading"
        aria-busy="true"
        aria-label="Loading your Via Cura protocol"
        className={`h-14 rounded-xl bg-white/[0.04] ${
          reducedMotion ? '' : 'motion-safe:animate-pulse'
        }`}
      />
    );
  }

  // Honest-disabled state: synthesis null or fetch failure.
  // CTA to /supplements (existing route). Never a fabricated or empty protocol.
  if (state.kind === 'empty') {
    return (
      <div
        data-testid="region-protocol-empty"
        className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 sm:p-5 backdrop-blur-sm space-y-4"
      >
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-white">Your Via Cura Protocol</h3>
          <p className="text-xs leading-relaxed text-white/60">
            Build your personalized supplement protocol to see it here.
          </p>
        </div>
        <Link
          href="/supplements"
          data-testid="region-protocol-cta"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-4 py-2.5 text-sm font-medium text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/20"
        >
          <Pill size={14} strokeWidth={1.5} />
          View your protocol
          <ArrowRight size={14} strokeWidth={1.5} />
        </Link>
      </div>
    );
  }

  // Data state: show the full protocol. Content is whole-protocol, unfiltered,
  // identical for every body region. No region-targeting language.
  const { vitamins, flags } = state;
  const hasItems = vitamins.length > 0 || flags.length > 0;

  return (
    <div
      data-testid="region-protocol-panel"
      className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 sm:p-5 backdrop-blur-sm space-y-4"
    >
      {/* Header: general framing only, no region-targeting */}
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-white">Your Via Cura Protocol</h3>
        <p className="text-xs leading-relaxed text-white/60">
          Your full personalized wellness protocol. Consistent with your goals
          across all areas.
        </p>
      </div>

      {/* Items or protocol-building message */}
      {!hasItems ? (
        <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <Info size={14} strokeWidth={1.5} className="mt-0.5 flex-none text-white/30" />
          <p className="text-xs leading-relaxed text-white/50">
            Your protocol is being personalized. Recommendations appear once
            your wellness profile has been processed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {vitamins.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Recommended vitamins and minerals
              </p>
              <ul className="space-y-2" role="list">
                {vitamins.map((item, idx) => (
                  <li
                    key={`${item.ruleRsid}-${idx}`}
                    className="rounded-xl border border-[#2DA5A0]/[0.12] bg-white/[0.02] p-3"
                  >
                    <p className="text-xs font-semibold text-white">{item.form}</p>
                    {item.rationale && (
                      <p className="mt-1 text-xs leading-relaxed text-white/50">
                        {item.rationale}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {flags.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Notable flags
              </p>
              <ul className="space-y-2" role="list">
                {flags.map((flag, idx) => (
                  <li
                    key={`${flag.ruleRsid}-${idx}`}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <p className="text-xs font-semibold text-white">{flag.current}</p>
                    {flag.reason && (
                      <p className="mt-1 text-xs leading-relaxed text-white/50">
                        {flag.reason}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer: info-block pattern (mirrors BodyScanResults / FutureSelfPanel) */}
      <div
        data-testid="region-protocol-disclaimer"
        className="flex items-start gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] p-3 text-xs text-white/40"
      >
        <Info size={13} strokeWidth={1.5} className="mt-0.5 flex-none" />
        <p>
          Your Via Cura protocol reflects your personalized wellness goals.
          This is general protocol context, not a clinical finding.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client wrapper: fetches synthesis, maps to RegionProtocolFetchState, renders
// RegionProtocolPanelContent.
//
// Visibility is controlled in page.tsx (only mounted when selectedBodyPart
// is non-null). This component does not receive selectedBodyPart.
// ---------------------------------------------------------------------------

export interface RegionProtocolPanelProps {
  reducedMotion?: boolean;
}

/**
 * Client shell. On mount calls the pure fetchProtocolPanelState seam (which
 * owns the request, the 5 s timeout, and the fail-open mapping) and renders the
 * resolved state. The seam never rejects, so the worst case is the honest-
 * disabled empty state. A cancelled flag guards against setState after unmount.
 */
export function RegionProtocolPanel({ reducedMotion }: RegionProtocolPanelProps) {
  const [state, setState] = useState<RegionProtocolFetchState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });

    void fetchProtocolPanelState().then((resolved) => {
      if (!cancelled) setState(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return <RegionProtocolPanelContent state={state} reducedMotion={reducedMotion} />;
}
