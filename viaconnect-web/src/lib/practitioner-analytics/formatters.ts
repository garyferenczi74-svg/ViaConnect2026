// Prompt #99 Phase 1 (Path A): Display formatters for practitioner analytics.
//
// Pure, no deps. All revenue values originate in integer cents; the
// currency formatter delegates to the shared pricing formatter so the
// two portals stay in sync (USD, 2 decimals).

import { formatPriceFromCents } from '@/lib/pricing/format';

/** Signed delta display. Positive deltas are prefixed with "+" so the
 *  KPI card can color-code direction without inspecting the sign. */
export function formatSignedDelta(value: number, fractionDigits = 0): string {
  const fixed = value.toFixed(fractionDigits);
  if (value > 0) return `+${fixed}`;
  return fixed;
}

/** Percent formatter. Input is a ratio in [0,1] OR an already-percent
 *  number in [0,100]. The `mode` parameter disambiguates explicitly
 *  because silent heuristics tend to bite downstream. */
export function formatPercent(
  value: number,
  opts: { mode: 'ratio' | 'percent'; fractionDigits?: number } = {
    mode: 'percent',
  },
): string {
  const { mode, fractionDigits = 0 } = opts;
  const pct = mode === 'ratio' ? value * 100 : value;
  return `${pct.toFixed(fractionDigits)}%`;
}

/** Bio Optimization score formatter. The score is stored as a 0 to 100
 *  integer; we always render it with no decimal. */
export function formatBioOptScore(score: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return String(clamped);
}

/** Engagement score formatter. Same shape as Bio Opt (0 to 100) but
 *  named separately so grep in the UI layer can distinguish the two
 *  when we add tooltips per #17b Addendum. */
export function formatEngagementScore(score: number): string {
  return formatBioOptScore(score);
}

/** Currency from cents. Thin wrapper around the shared pricing
 *  formatter so both portals read the same "$12,460" string for the
 *  same underlying integer. */
export function formatRevenue(cents: number): string {
  return formatPriceFromCents(cents, { showCents: false, freeLabel: false });
}

/** Month-over-month or period-over-period delta as a percent string
 *  with sign. Returns "—" for divide-by-zero so the UI doesn't render
 *  "Infinity%". */
export function formatPeriodDelta(current: number, previous: number): string {
  if (previous === 0) return '—';
  const ratio = (current - previous) / previous;
  const pct = ratio * 100;
  return `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`;
}

/** Compact count formatter. 47 → "47", 1247 → "1.2k", 12473 → "12k".
 *  Used by KPI cards where horizontal real estate is tight. */
export function formatCompactCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

/** Confidence label formatter. Tier confidence from #19b is stored as
 *  decimal (0.72, 0.86, 0.96); the UI shows "72%", "86%", "96%". */
export function formatTierConfidence(confidence: number): string {
  return formatPercent(confidence, { mode: 'ratio', fractionDigits: 0 });
}
