'use client';

/**
 * src/components/journey/today/EnergyStressGraph.tsx
 *
 * Section 3.3 "Energy and stress" inner body (Prompt 208d Task D-T6).
 *
 * An honest-empty area-graph FRAME: axis hints + an overlay prompting the user
 * to connect a wearable. No data is plotted. No fabricated series, no synthetic
 * numbers. The wearable connector is OFF - every wearable-sourced metric must
 * be honest-empty. This component has no data path and never throws.
 *
 * SectionShell (eyebrow / title / icon) lives in YourJourneyPage.tsx; this
 * component renders only the inner body.
 *
 * Style: glass sub-panel surface, DM Sans text, DM Mono for axis labels,
 * Lucide strokeWidth 1.5, muted white/35-65, brand Teal accent. Inline SVG
 * only (no canvas, no chart library). Reduced-motion safe (static, no draw-in
 * animation). No em/en-dashes, no emojis. No new dependencies.
 */

import { Activity } from 'lucide-react';

const TEAL = '#2DA5A0';
const DM_SANS = 'var(--font-dm-sans), sans-serif';
const DM_MONO = 'var(--font-dm-mono), monospace';

/**
 * The time-of-day axis ticks rendered along the bottom of the chart frame.
 * These are layout hints only - they communicate the chart's x-axis meaning
 * without any plotted data.
 */
const AXIS_TICKS = ['6a', '12p', '6p', '12a'] as const;

/**
 * EnergyStressGraph
 *
 * Renders a calm area-graph frame for section 3.3 "Energy and stress".
 * No props - there is no data to read; the wearable connector is OFF.
 * The component is fully honest-empty and fail-safe.
 */
export function EnergyStressGraph() {
  // Chart frame dimensions (relative to SVG viewBox)
  const frameWidth = 400;
  const frameHeight = 120;
  // Baseline y position inside the SVG (near bottom, leaving room for axis labels)
  const baselineY = frameHeight - 20;

  return (
    <div
      className="rounded-xl border border-white/[0.06] bg-[rgba(22,36,64,0.40)] p-3"
      aria-label="Energy and stress chart - wearable not connected"
    >
      {/* Chart frame: inline SVG with faint baseline and axis hints */}
      <div className="relative h-40 w-full overflow-hidden rounded-lg">
        <svg
          viewBox={`0 0 ${frameWidth} ${frameHeight}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
        >
          {/* Faint horizontal grid lines */}
          {[0.25, 0.5, 0.75].map((pct) => {
            const y = Math.round(baselineY * pct);
            return (
              <line
                key={pct}
                x1={0}
                y1={y}
                x2={frameWidth}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={1}
              />
            );
          })}

          {/* Main baseline */}
          <line
            x1={0}
            y1={baselineY}
            x2={frameWidth}
            y2={baselineY}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1}
          />

          {/* Time-of-day axis tick marks */}
          {AXIS_TICKS.map((tick, i) => {
            const x = Math.round((i / (AXIS_TICKS.length - 1)) * frameWidth);
            return (
              <line
                key={tick}
                x1={x}
                y1={baselineY}
                x2={x}
                y2={baselineY + 4}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={1}
              />
            );
          })}
        </svg>

        {/* Time-of-day axis labels (DM Mono, muted) */}
        <div
          className="absolute bottom-0 left-0 right-0 flex justify-between px-0"
          aria-hidden="true"
        >
          {AXIS_TICKS.map((tick) => (
            <span
              key={tick}
              className="text-[9px] leading-none"
              style={{ fontFamily: DM_MONO, color: 'rgba(255,255,255,0.35)' }}
            >
              {tick}
            </span>
          ))}
        </div>

        {/* Honest-empty overlay: icon + connect message centered in the frame */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 pb-4 text-center">
          <Activity
            className="h-5 w-5 shrink-0"
            strokeWidth={1.5}
            style={{ color: 'rgba(255,255,255,0.30)' }}
            aria-hidden="true"
          />
          <p
            className="max-w-[260px] text-[12px] leading-snug"
            style={{ fontFamily: DM_SANS, color: 'rgba(255,255,255,0.45)' }}
          >
            Connect a wearable to see your energy and stress through the day.
          </p>
        </div>
      </div>

      {/* Sub-panel footer: teal accent label */}
      <div className="mt-2.5 flex items-center gap-1.5">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ fontFamily: DM_MONO, color: TEAL }}
        >
          Energy and stress
        </span>
        <span
          className="text-[10px]"
          style={{ fontFamily: DM_MONO, color: 'rgba(255,255,255,0.35)' }}
        >
          through the day
        </span>
      </div>
    </div>
  );
}

export default EnergyStressGraph;
