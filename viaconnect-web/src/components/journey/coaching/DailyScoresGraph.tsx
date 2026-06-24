'use client';

/**
 * src/components/journey/coaching/DailyScoresGraph.tsx
 *
 * Daily Scores trend graph for the Your Journey coaching layout hero.
 * Prompt 208g Task G-T3.
 *
 * DATA REALITY (honesty-critical):
 *   There is NO per-pillar score time-series in the platform. Only the Bio
 *   Optimization COMPOSITE has a real history (dailyScores/bioScores from
 *   useBioOptimizationTrend). The 7 pillar lines have NO history source and
 *   MUST NOT be fabricated. They appear in the legend only.
 *
 *   When the composite has fewer than 2 finite points (sparse or baseline user),
 *   the component renders an HONEST SEED STATE: chart frame + toggle + legend +
 *   a calm centered message. No fabricated line is ever drawn.
 *
 * CHART:
 *   Inline SVG only (no charting library, no package.json change).
 *   Composite line: METRIC_COLORS.wellness.c (from PlasmaGauge).
 *   Gridlines at 0/25/50/75/100 on the 0..100 y-axis.
 *   Responsive: viewBox + width 100% + height auto.
 *
 * TOGGLE:
 *   1W -> '7D', 1M -> '4W', 1Y -> '1Y' (rangeToTrendKey helper).
 *   Always present even in seed/sparse state.
 *
 * LEGEND:
 *   7 pillars + Bio Optimization composite. Each: color swatch + label.
 *   Honest sub-note: pillar trends populate as daily scores accumulate.
 *
 * PURE HELPERS (exported for tests):
 *   scoreLinePath(points, width, height) -> SVG path string or ''
 *   rangeToTrendKey(r) -> TimeRange key
 *
 * Rules: no em-dashes, no en-dashes, no emojis. Lucide strokeWidth 1.5.
 * DM Sans / DM Mono tokens. Responsive (44px touch targets, wraps on mobile).
 * useReducedMotion for any animation. Import METRIC_COLORS from PlasmaGauge,
 * do NOT paste new hex.
 */

import { useState } from 'react';
import { METRIC_COLORS, type GaugeMetric } from '@/components/gauges/PlasmaGauge';
import { useBioOptimizationTrend } from '@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useBioOptimizationTrend';
import type { TimeRange } from '@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/utils/trendCalculations';

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

const DM_SANS = 'var(--font-dm-sans), sans-serif';
const DM_MONO = 'var(--font-dm-mono), monospace';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToggleRange = '1W' | '1M' | '1Y';

// ---------------------------------------------------------------------------
// Pure helpers (exported for TDD)
// ---------------------------------------------------------------------------

/**
 * Maps toggle range label to useBioOptimizationTrend TimeRange key.
 * Pure, deterministic, never throws.
 */
export function rangeToTrendKey(r: ToggleRange): TimeRange {
  if (r === '1W') return '7D';
  if (r === '1M') return '4W';
  return '1Y';
}

/**
 * Maps an array of score points to an SVG path string on a fixed 0..100
 * y-scale. Only finite scores are used. Returns '' if fewer than 2 finite
 * points. Never throws, never produces NaN coordinates.
 *
 * x: evenly spaced by index across [0, width]
 * y: (1 - clamp(score, 0, 100) / 100) * height
 *   -> score 100 maps to y=0 (top); score 0 maps to y=height (bottom)
 */
export function scoreLinePath(
  points: { score: number }[],
  width: number,
  height: number
): string {
  // Filter to finite scores only
  const finite = points.filter((p) => typeof p.score === 'number' && isFinite(p.score));
  if (finite.length < 2) return '';

  const n = finite.length;
  const step = n > 1 ? width / (n - 1) : 0;

  return finite
    .map((p, i) => {
      const clamped = Math.max(0, Math.min(100, p.score));
      const x = i * step;
      const y = (1 - clamped / 100) * height;
      const cmd = i === 0 ? 'M' : 'L';
      return `${cmd}${x},${y}`;
    })
    .join(' ');
}

// ---------------------------------------------------------------------------
// Pillar legend spec
// ---------------------------------------------------------------------------

interface PillarSpec {
  label: string;
  metric: GaugeMetric;
}

const PILLARS: PillarSpec[] = [
  { label: 'Sleep Quality',     metric: 'sleep'     },
  { label: 'Energy Level',      metric: 'energy'    },
  { label: 'Mood and Stress',   metric: 'mood'      },
  { label: 'Nutrition',         metric: 'nutrition' },
  { label: 'Physical Activity', metric: 'activity'  },
  { label: 'Bio Optimization',  metric: 'wellness'  },
  { label: 'Hydration',         metric: 'plasmateal'},
];

// ---------------------------------------------------------------------------
// Chart constants
// ---------------------------------------------------------------------------

const CHART_W = 600;
const CHART_H = 180;
const GRID_Y = [0, 25, 50, 75, 100];
const GRID_COLOR = 'rgba(255,255,255,0.07)';
const AXIS_COLOR = 'rgba(255,255,255,0.18)';
const LABEL_COLOR = 'rgba(255,255,255,0.35)';

// ---------------------------------------------------------------------------
// DailyScoresGraph
// ---------------------------------------------------------------------------

export function DailyScoresGraph({ userId }: { userId: string | null }) {
  const [toggleRange, setToggleRange] = useState<ToggleRange>('1W');
  const trendKey = rangeToTrendKey(toggleRange);

  // Fail-open: no data -> sparse/seed state. Never throws.
  const { data } = useBioOptimizationTrend(userId, trendKey);

  // Use dailyScores (overall_score) as the composite line source. Fall back to
  // bioScores (health_scores) only when dailyScores is empty, matching the
  // hook's own priority for current score.
  const rawPoints =
    (data?.dailyScores ?? []).length > 0
      ? (data?.dailyScores ?? [])
      : (data?.bioScores ?? []);

  const compositeColor = METRIC_COLORS.wellness.c;
  const path = scoreLinePath(rawPoints, CHART_W, CHART_H);
  const isSparse = path === '';

  const TOGGLE_LABELS: ToggleRange[] = ['1W', '1M', '1Y'];

  return (
    <div className="flex flex-col gap-4 w-full">

      {/* Toggle row */}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Date range for trend chart"
      >
        {TOGGLE_LABELS.map((label) => {
          const active = label === toggleRange;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setToggleRange(label)}
              aria-pressed={active}
              className="rounded-md px-4 py-2 text-xs font-semibold tracking-wide transition-colors min-h-[44px] min-w-[44px]"
              style={{
                fontFamily: DM_MONO,
                background: active ? compositeColor : 'rgba(255,255,255,0.06)',
                color: active ? '#0f1923' : 'rgba(255,255,255,0.6)',
                border: active ? 'none' : '1px solid rgba(255,255,255,0.12)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Chart frame */}
      <div className="relative w-full" style={{ lineHeight: 0 }}>
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          width="100%"
          height="auto"
          aria-label="Daily Scores trend chart"
          role="img"
          style={{ display: 'block', overflow: 'visible' }}
        >
          {/* Horizontal gridlines at 0/25/50/75/100 */}
          {GRID_Y.map((pct) => {
            const y = (1 - pct / 100) * CHART_H;
            return (
              <g key={pct}>
                <line
                  x1={0}
                  y1={y}
                  x2={CHART_W}
                  y2={y}
                  stroke={pct === 0 || pct === 100 ? AXIS_COLOR : GRID_COLOR}
                  strokeWidth={pct === 0 || pct === 100 ? 1 : 0.75}
                />
                <text
                  x={-8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={10}
                  fill={LABEL_COLOR}
                  fontFamily={DM_MONO}
                >
                  {pct}
                </text>
              </g>
            );
          })}

          {/* Composite trend line (only when 2+ finite points) */}
          {!isSparse && (
            <path
              d={path}
              fill="none"
              stroke={compositeColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Honest seed state overlay (centered message) */}
          {isSparse && (
            <foreignObject x={0} y={0} width={CHART_W} height={CHART_H}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  padding: '0 24px',
                  boxSizing: 'border-box',
                }}
              >
                <p
                  style={{
                    fontFamily: DM_SANS,
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.38)',
                    textAlign: 'center',
                    margin: 0,
                  }}
                >
                  Your Daily Scores trend builds here as your baseline fills in.
                </p>
              </div>
            </foreignObject>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {PILLARS.map((p) => (
            <div key={p.metric} className="flex items-center gap-1.5">
              {/* Color swatch */}
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: METRIC_COLORS[p.metric].c,
                  flexShrink: 0,
                }}
              />
              <span
                className="text-xs text-white/55"
                style={{ fontFamily: DM_SANS }}
              >
                {p.label}
              </span>
            </div>
          ))}
        </div>
        {/* Honest sub-note: per-pillar trends have no history source */}
        <p
          className="text-[10px] text-white/30 leading-relaxed"
          style={{ fontFamily: DM_MONO }}
        >
          Per-pillar trends appear as your daily scores build. Only the Bio
          Optimization composite line is plotted when history is available.
        </p>
      </div>

    </div>
  );
}

export default DailyScoresGraph;
