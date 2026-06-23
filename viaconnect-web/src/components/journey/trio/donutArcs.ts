/**
 * src/components/journey/trio/donutArcs.ts
 *
 * The PURE, TESTED donut arc math (Prompt 208d, Task D-T4, 3.6). Kept in a
 * dependency-free, JSX-free module so the unit suite (node environment) imports
 * it directly; Donut.tsx is the presentational wrapper that draws it.
 *
 * Each segment is painted as a partial stroke on a single SVG circle. We compute
 * the arc length (value / total) * circumference, encode it as a stroke-dasharray
 * "<arcLen> <gap>" (so only the arc paints), and stack a cumulative, NEGATED
 * stroke-dashoffset so each segment butts up against the one before it without a
 * gap.
 *
 * Honest by construction: a total of zero (empty list, all-zero, or only
 * non-finite values) collapses every arc to zero length (a calm empty ring),
 * never divides by zero, never emits NaN. PURE, DETERMINISTIC, never throws.
 * No em/en-dashes, no emojis. TypeScript strict (no any).
 */

export interface DonutSegment {
  readonly value: number;
  readonly color: string;
  readonly label: string;
}

export interface DonutArc {
  readonly label: string;
  readonly color: string;
  /** SVG stroke-dasharray: "<arcLen> <circumference - arcLen>". */
  readonly dashArray: string;
  /** SVG stroke-dashoffset: the negated cumulative arc length before this one. */
  readonly dashOffset: number;
}

export interface DonutArcsOptions {
  /** Ring radius in user units. Defaults to 50. Non-positive -> 0 (empty ring). */
  readonly radius?: number;
  /** Reserved for callers that vary stroke; arc math is stroke-independent. */
  readonly stroke?: number;
}

const DEFAULT_RADIUS = 50;

/** Round to 3 decimals and guarantee a finite output (NaN/Infinity -> 0). */
function safe(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 1000) / 1000;
}

/** A value is usable only when it is a finite, non-negative number. */
function usableValue(v: number): number {
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/**
 * Map weighted segments onto one circle. Returns one arc per input segment, in
 * input order, with labels and colors preserved. total <= 0 yields all
 * zero-length arcs. Never throws.
 */
export function donutArcs(
  segments: DonutSegment[],
  opts?: DonutArcsOptions,
): DonutArc[] {
  const list = Array.isArray(segments) ? segments : [];
  if (list.length === 0) return [];

  const rawRadius = opts?.radius ?? DEFAULT_RADIUS;
  const radius = Number.isFinite(rawRadius) && rawRadius > 0 ? rawRadius : 0;
  const circumference = 2 * Math.PI * radius;

  // Sum only finite, non-negative values so a single NaN/negative does not
  // poison the whole ring.
  let total = 0;
  for (const seg of list) total += usableValue(seg.value);

  // Honest empty ring: every arc is zero length, no divide-by-zero.
  if (total <= 0 || circumference <= 0) {
    return list.map((seg) => ({
      label: seg.label,
      color: seg.color,
      dashArray: `${safe(0)} ${safe(circumference)}`,
      dashOffset: 0,
    }));
  }

  const arcs: DonutArc[] = [];
  let cumulative = 0; // arc length consumed by preceding segments.
  for (const seg of list) {
    const fraction = usableValue(seg.value) / total;
    const arcLen = fraction * circumference;
    const gap = circumference - arcLen;
    arcs.push({
      label: seg.label,
      color: seg.color,
      dashArray: `${safe(arcLen)} ${safe(gap)}`,
      // Negated cumulative offset: SVG shifts the dash pattern start earlier as
      // the offset goes negative, butting this segment against the previous one.
      dashOffset: safe(-cumulative),
    });
    cumulative += arcLen;
  }

  return arcs;
}

export default donutArcs;
