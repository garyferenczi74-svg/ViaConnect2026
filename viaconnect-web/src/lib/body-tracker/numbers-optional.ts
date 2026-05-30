// =============================================================================
// Body Scan "Hide specific numbers" mode  display-decision logic
// (Prompt #169b, spec section 3.2.4).
//
// Pure, I/O-free decision logic for the numbers-optional body-image safeguard.
// When the per-user flag is ON, the body-scan results surfaces hide precise
// numbers; this module decides, per metric, what is shown instead:
//   * a composition metric with a confidence range shows trend arrow + range,
//   * a measurement shows a sparkline shape only,
//   * an avatar label shows no number,
//   * body fat percentage and visceral fat index are hidden ENTIRELY (not even a
//     range), the two most body-image-sensitive metrics in the panel.
// A user can TEMPORARILY reveal any single metric (tap / press-hold); a revealed
// metric shows its value exactly as if the mode were off.
//
// Extracted from the React components so the decisions can be unit-tested as REAL
// behavior. The project's vitest config runs node-environment .test.ts only (see
// vitest.config.ts), so the testable contract lives here, not in JSX. This
// mirrors the scan-gate.ts / age-frequency-gate.ts pattern (pure decision tested
// directly; the components are thin wrappers).
//
// PERSISTENCE: the flag itself lives on profiles.numbers_optional (migration
// 20260516000090), the same table + access pattern as the existing per-user
// preference profiles.unit_system. This module never does I/O; it takes the
// already-loaded boolean.
// =============================================================================

// How a metric renders. The component maps each variant to its own visual:
//   'value'     show the precise number (mode off, or this metric is revealed)
//   'range'     show trend arrow + confidence range only, no precise number
//   'sparkline' show the sparkline shape only, no number
//   'hidden'    show nothing at all (body fat % + visceral fat index when on)
export type MetricDisplayMode = 'value' | 'range' | 'sparkline' | 'hidden';

// The kind of surface a metric is rendered on. Drives the "redacted" fallback
// when the value is hidden and not revealed.
//   'composition'  composition-tab stat that carries a low/mid/high range
//   'measurement'  a circumference / length that has a sparkline trend
//   'avatar'       a label drawn on or beside the 3D avatar
export type MetricSurface = 'composition' | 'measurement' | 'avatar';

// The two metrics hidden ENTIRELY when the mode is on (section 3.2.4): body fat
// percentage and visceral fat index. Keyed by a stable metric id the surfaces
// pass in. Revealing one (tap) still shows it, but it is never shown by default.
export const FULLY_HIDDEN_METRIC_IDS = ['bodyFatPct', 'visceralFatIndex'] as const;
export type FullyHiddenMetricId = (typeof FULLY_HIDDEN_METRIC_IDS)[number];

export function isFullyHiddenMetric(metricId: string): metricId is FullyHiddenMetricId {
  return (FULLY_HIDDEN_METRIC_IDS as readonly string[]).includes(metricId);
}

export interface MetricDisplayInput {
  // The user's numbers_optional preference (profiles.numbers_optional).
  numbersOptional: boolean;
  // Whether THIS metric is currently temporarily revealed (tap / press-hold).
  revealed: boolean;
  // The surface the metric renders on (drives the redacted fallback variant).
  surface: MetricSurface;
  // Stable metric id. Used only to detect the two fully-hidden metrics; any
  // other id is treated as a normal metric for its surface.
  metricId: string;
}

// The single source of truth for "what does this metric show right now".
//
// Precedence:
//   1. mode off               -> always 'value'
//   2. metric revealed        -> 'value' (temporary reveal wins, even for the
//                                fully-hidden body fat % / visceral fat metrics)
//   3. fully-hidden metric    -> 'hidden' (body fat % + visceral fat index)
//   4. otherwise, by surface  -> 'range' (composition) | 'sparkline'
//                                (measurement) | 'hidden' (avatar label: no
//                                number and no range, just nothing)
export function decideMetricDisplay(input: MetricDisplayInput): MetricDisplayMode {
  const { numbersOptional, revealed, surface, metricId } = input;

  // 1. Mode off: numbers are always shown.
  if (!numbersOptional) return 'value';

  // 2. Temporary reveal wins over every hiding rule, including the two
  //    fully-hidden metrics  the user explicitly asked to see this one.
  if (revealed) return 'value';

  // 3. Body fat % and visceral fat index are hidden entirely (no range).
  if (isFullyHiddenMetric(metricId)) return 'hidden';

  // 4. Surface-default redaction.
  switch (surface) {
    case 'composition':
      return 'range';
    case 'measurement':
      return 'sparkline';
    case 'avatar':
      // Avatar labels carry no range fallback: when hidden they show no number.
      return 'hidden';
    default:
      return 'hidden';
  }
}

// Convenience predicates the components read directly.

// True when the precise number should render (value variant).
export function shouldShowValue(input: MetricDisplayInput): boolean {
  return decideMetricDisplay(input) === 'value';
}

// True when the metric is fully suppressed (no value, no range, no sparkline).
export function shouldHideEntirely(input: MetricDisplayInput): boolean {
  return decideMetricDisplay(input) === 'hidden';
}

// True when the metric is tappable to reveal: i.e. the mode is on and the metric
// is not already revealed (whether it would show a range, sparkline, or be
// fully hidden, the user can still tap to see the underlying value).
export function isRevealable(input: Pick<MetricDisplayInput, 'numbersOptional' | 'revealed'>): boolean {
  return input.numbersOptional && !input.revealed;
}

// =============================================================================
// Temporary-reveal set helpers (pure). The hook holds a Set<string> of revealed
// metric ids; these keep the toggle logic testable and out of the component.
// =============================================================================

// Toggle a metric's revealed state, returning a NEW set (immutability for React
// state). Tapping a revealed metric re-hides it.
export function toggleRevealed(current: ReadonlySet<string>, metricId: string): Set<string> {
  const next = new Set(current);
  if (next.has(metricId)) next.delete(metricId);
  else next.add(metricId);
  return next;
}

// Set a metric revealed (press-hold down), returning a NEW set.
export function setRevealed(current: ReadonlySet<string>, metricId: string): Set<string> {
  if (current.has(metricId)) return new Set(current);
  const next = new Set(current);
  next.add(metricId);
  return next;
}

// Clear a metric's revealed state (press-hold up), returning a NEW set.
export function clearRevealed(current: ReadonlySet<string>, metricId: string): Set<string> {
  if (!current.has(metricId)) return new Set(current);
  const next = new Set(current);
  next.delete(metricId);
  return next;
}

// =============================================================================
// Privacy-safe sparkline shape generator (pure, deterministic).
//
// When a measurement is hidden the cell shows a "sparkline shape only" (section
// 3.2.4). There is no per-metric history at the card, and crucially the shape
// must NOT encode the hidden magnitude (that would defeat the safeguard). So the
// shape is a gentle deterministic wave seeded ONLY by the metric label: it looks
// like a trend line and is stable per metric, but reveals nothing numeric. Each
// point is in [0,1] and is consumed by the Sparkline SVG as normalized y-values.
// =============================================================================
export function privacySparklineShape(seedKey: string, pointCount = 7): number[] {
  // Small FNV-1a-style hash of the seed for a stable per-metric phase/offset.
  let h = 2166136261;
  for (let i = 0; i < seedKey.length; i += 1) {
    h ^= seedKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const phase = (h >>> 0) / 4294967295; // 0..1
  const n = Math.max(2, pointCount);
  const pts: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const t = i / (n - 1);
    // Two offset sine components so the line gently rises and dips; amplitude
    // kept well inside [0,1] so it never clips. Magnitude-independent by design.
    const y =
      0.5 +
      0.28 * Math.sin(2 * Math.PI * (t + phase)) +
      0.12 * Math.sin(2 * Math.PI * (2 * t + phase * 1.7));
    pts.push(Math.min(1, Math.max(0, y)));
  }
  return pts;
}
