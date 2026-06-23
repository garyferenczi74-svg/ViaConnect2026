/**
 * src/components/journey/progress/sparklinePath.ts
 *
 * The PURE, TESTED sparkline path math (Prompt 208d, Task D-T3). Kept in a
 * dependency-free, JSX-free module so the unit suite (node environment) can
 * import it directly; the Sparkline.tsx presentational wrapper re-exports it.
 *
 * Orientation: the SVG y-axis points DOWN, so the HIGHEST value maps to the
 * smallest y (top of the box) and the LOWEST value maps to the largest y
 * (bottom). An ascending value series therefore reads as a line rising toward
 * the top of the box, matching the intuitive "going up" reading.
 *
 * Honest by construction: fewer than 2 finite points, or a zero value-range
 * (all-equal values), or any non-finite input collapse to a CALM FLAT BASELINE
 * at the vertical midline instead of fabricating a slope. PURE, DETERMINISTIC,
 * never throws. No em/en-dashes, no emojis. TypeScript strict (no any).
 */

/** Round to 2 decimals and guarantee a finite output (NaN/Infinity -> 0). */
function safeCoord(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Build an SVG path string mapping `points` across a width x height box.
 *
 * The mapping pins the series max to y=0 (top) and the series min to y=height
 * (bottom). Degenerate inputs collapse to a flat baseline at height/2.
 */
export function sparklinePath(points: number[], width: number, height: number): string {
  const w = Number.isFinite(width) && width > 0 ? width : 0;
  const h = Number.isFinite(height) && height > 0 ? height : 0;
  const mid = safeCoord(h / 2);

  const flat = `M 0 ${mid} L ${safeCoord(w)} ${mid}`;

  const finite = (Array.isArray(points) ? points : []).filter((p) =>
    Number.isFinite(p),
  );

  // Fewer than 2 real points: honest flat baseline, never a fabricated slope.
  if (finite.length < 2) return flat;

  let min = finite[0];
  let max = finite[0];
  for (const v of finite) {
    if (v < min) min = v;
    if (v > max) max = v;
  }

  const range = max - min;
  // Zero range (all values equal): a flat baseline, and never divide by zero.
  if (range === 0) return flat;

  const stepX = finite.length > 1 ? w / (finite.length - 1) : 0;

  const coords = finite.map((v, i) => {
    const x = safeCoord(stepX * i);
    // value === max -> y = 0 (top); value === min -> y = h (bottom).
    const y = safeCoord(h - ((v - min) / range) * h);
    return `${x} ${y}`;
  });

  return `M ${coords[0]} ` + coords.slice(1).map((c) => `L ${c}`).join(' ');
}

/** True when there are at least 2 finite points to draw a real (non-flat) line. */
export function hasSparklineData(points: number[]): boolean {
  return (
    (Array.isArray(points) ? points : []).filter((p) => Number.isFinite(p))
      .length >= 2
  );
}
