'use client';

/**
 * src/components/journey/trio/Donut.tsx
 *
 * A minimal, dependency-free inline-SVG donut (Prompt 208d, Task D-T4, 3.6).
 * The PURE arc math lives in ./donutArcs (so the unit suite imports it without a
 * JSX transform); this file is the small presentational wrapper that draws the
 * ring as a stack of partial-stroke circles, plus a center readout.
 *
 * Honest by construction: an empty / all-zero total renders a calm grey track
 * with no painted segments and an honest center ("No data yet" by default), not
 * a fabricated split. Segments paint in input order over the track.
 *
 * No new dependency, inline SVG only. Reduced-motion safe: the optional draw-in
 * transition is gated on useReducedMotion. No em/en-dashes, no emojis.
 * TypeScript strict (no any).
 */

import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/components/body-tracker/HoverSystem/useReducedMotion';
import { donutArcs, type DonutSegment } from './donutArcs';

const DM_SANS = 'var(--font-dm-sans), sans-serif';
const DM_MONO = 'var(--font-dm-mono), monospace';
const TRACK = 'rgba(255,255,255,0.08)';

export interface DonutProps {
  segments: DonutSegment[];
  /** Big center figure (e.g. kcal remaining). */
  centerValue?: string;
  /** Small label under the center figure. */
  centerLabel?: string;
  /** Pixel diameter. Defaults to 132. */
  size?: number;
  /** Ring thickness in px. Defaults to 12. */
  stroke?: number;
  /** Center copy shown when the total is zero. Defaults to "No data yet". */
  emptyCenter?: string;
  ariaLabel?: string;
}

export function Donut({
  segments,
  centerValue,
  centerLabel,
  size = 132,
  stroke = 12,
  emptyCenter = 'No data yet',
  ariaLabel,
}: DonutProps) {
  const reduced = useReducedMotion();

  // Total of usable (finite, positive) segment values decides empty vs drawn.
  const list = Array.isArray(segments) ? segments : [];
  const total = list.reduce(
    (sum, s) => sum + (Number.isFinite(s.value) && s.value > 0 ? s.value : 0),
    0,
  );
  const isEmpty = total <= 0;

  const radius = (size - stroke) / 2;
  const arcs = donutArcs(list, { radius, stroke });

  // Optional calm draw-in: arcs fade in once mounted, skipped under reduced
  // motion. Purely presentational; never changes the geometry.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (reduced) {
      setShown(true);
      return;
    }
    const id = window.requestAnimationFrame(() => setShown(true));
    return () => window.cancelAnimationFrame(id);
  }, [reduced]);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel ?? (isEmpty ? 'No data yet' : 'Breakdown ring')}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        {/* Calm background track, always present. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={TRACK}
          strokeWidth={stroke}
        />
        {/* Painted segments (none when empty). Rotated so the first segment
            starts at 12 o'clock; each arc carries its own dash + offset. */}
        {!isEmpty &&
          arcs.map((arc, i) => (
            <circle
              key={`${arc.label}-${i}`}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={arc.dashArray}
              strokeDashoffset={arc.dashOffset}
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: 'center',
                opacity: shown ? 1 : 0,
                transition: reduced ? 'none' : 'opacity 0.4s ease-out',
              }}
            />
          ))}
      </svg>

      {/* Center readout. Honest empty copy when there is nothing to show. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
        {isEmpty ? (
          <span
            className="text-[11px] leading-tight text-white/55"
            style={{ fontFamily: DM_SANS }}
          >
            {emptyCenter}
          </span>
        ) : (
          <>
            {centerValue ? (
              <span
                className="text-lg font-bold tabular-nums leading-none text-white"
                style={{ fontFamily: DM_SANS }}
              >
                {centerValue}
              </span>
            ) : null}
            {centerLabel ? (
              <span
                className="mt-1 text-[9px] uppercase tracking-wide leading-tight text-white/55"
                style={{ fontFamily: DM_MONO }}
              >
                {centerLabel}
              </span>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export default Donut;
