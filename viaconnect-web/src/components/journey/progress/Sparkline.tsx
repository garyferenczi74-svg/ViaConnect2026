/**
 * src/components/journey/progress/Sparkline.tsx
 *
 * A minimal, dependency-free inline-SVG sparkline (Prompt 208d, Task D-T3).
 *
 * The PURE path math lives in ./sparklinePath (so the node unit suite imports it
 * without a JSX transform); this file is the tiny presentational wrapper that
 * draws it. No client hooks, no animation (so it is reduced-motion safe by
 * construction). Honest by construction: fewer than 2 finite points, a zero
 * value-range, or non-finite input render a CALM FLAT, muted baseline rather
 * than a fabricated slope.
 *
 * No new dependencies, no chart library, inline SVG only. No em/en-dashes,
 * no emojis. TypeScript strict (no any).
 */

import { sparklinePath, hasSparklineData } from './sparklinePath';

export { sparklinePath, hasSparklineData };

const TEAL = '#2DA5A0';

/**
 * Presentational sparkline. Draws sparklinePath as a single stroked polyline in
 * a fixed viewBox so it scales fluidly to its container width. No motion; no
 * fill, just a calm 1.5px stroke. A flat baseline reads muted ("not enough
 * data") instead of as a trend.
 */
export function Sparkline({
  points,
  width = 100,
  height = 28,
  stroke = TEAL,
  className,
  ariaLabel,
}: {
  points: number[];
  width?: number;
  height?: number;
  stroke?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const d = sparklinePath(points, width, height);
  const enough = hasSparklineData(points);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel ?? 'Recent trend'}
      className={className}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeOpacity={enough ? 0.9 : 0.35}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default Sparkline;
