'use client';

/**
 * src/components/journey/coaching/DailyScoresGraph.tsx
 *
 * Bio Optimization trend graph for the Your Journey coaching layout hero.
 * Prompt 208g Task G-T3 (upgraded in Prompt 208h Task H-T2).
 *
 * DATA REALITY (honesty-critical):
 *   There is NO per-pillar score time-series in the platform. Only the Bio
 *   Optimization COMPOSITE has a real history (dailyScores/bioScores from
 *   useBioOptimizationTrend). The 7 pillar lines have NO history source and
 *   MUST NOT be fabricated. They appear in the legend only.
 *
 *   When the composite has fewer than 2 finite points (sparse or baseline user),
 *   the component renders an HONEST EMPTY STATE: the gridded 0 to 100 chart
 *   (y gridlines + labels + x-axis markers for the active tab) with calm
 *   placeholder copy. No fabricated line is ever drawn. No distorting zero points.
 *
 * CHART:
 *   Inline SVG only (no charting library, no package.json change).
 *   Y axis: fixed 0 to 100, gridlines and labels every 10 (11 lines).
 *   Composite line: METRIC_COLORS.wellness.c (from PlasmaGauge).
 *   Solid dark plot surface (no photo bleed behind plot, axis, or legend).
 *   Responsive: viewBox + width 100% + height auto.
 *
 * SWITCHER (segmented control, replaces old day-range toggle):
 *   Three tabs: "Week", "Month", "Year". Default Week.
 *   Keyboard accessible (role=tablist/tab, arrow-key navigation, 44px targets).
 *   Switching is React state only (no page reload).
 *   Week -> '7D', Month -> '4W', Year -> '1Y' (rangeToTrendKey helper).
 *
 * X AXIS MARKERS (per tab, from xAxisMarkers helper):
 *   Week: 7 day markers, one tick per day, labeled short weekday or day number.
 *   Month: markers at days 1,5,10,15,20,25,lastDay; label = day number.
 *   Year: 12 major month markers Jan..Dec + minor ticks between months.
 *
 * LEGEND:
 *   7 pillars + Bio Optimization composite. Each: color swatch + label.
 *   Honest sub-note: pillar trends populate as daily scores accumulate.
 *
 * PURE HELPERS (exported for tests):
 *   scoreLinePath(points, width, height) -> SVG path string or ''
 *   scoreAreaPath(points, width, height) -> closed SVG path for area fill or ''
 *   rangeToTrendKey(tab) -> TimeRange key
 *   yAxisTicks() -> [0,10,20,...,100]
 *   xAxisMarkers(mode, refMs) -> Array<{ label, xFraction, major }>
 *
 * Rules: no em-dashes, no en-dashes, no emojis. Lucide strokeWidth 1.5.
 * DM Sans / DM Mono tokens. Responsive (44px touch targets, wraps on mobile).
 * useReducedMotion for any animation. Import METRIC_COLORS from PlasmaGauge,
 * do NOT paste new hex.
 */

import { useState, useCallback, useRef } from 'react';
import { useReducedMotion } from '@/components/body-tracker/HoverSystem/useReducedMotion';
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

export type TabRange = 'Week' | 'Month' | 'Year';

export interface XAxisMarker {
  label: string;
  xFraction: number;
  major: boolean;
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for TDD)
// ---------------------------------------------------------------------------

/**
 * Maps switcher tab label to useBioOptimizationTrend TimeRange key.
 * Pure, deterministic, never throws.
 */
export function rangeToTrendKey(r: TabRange): TimeRange {
  if (r === 'Week') return '7D';
  if (r === 'Month') return '4W';
  return '1Y';
}

/**
 * Returns the eleven fixed Y-axis tick values: [0, 10, 20, ..., 100].
 * Pure, deterministic, never throws.
 */
export function yAxisTicks(): number[] {
  return [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
}

/**
 * Returns X-axis marker descriptors for the given tab mode and reference
 * timestamp (refMs). The COMPONENT passes Date.now(); TESTS pass a fixed
 * timestamp. Never calls Date.now() internally. Never throws.
 *
 * Week: 7 markers across the x axis (the last 7 days ending at refMs day),
 *   xFraction = i/6 (i = 0..6), all major:true.
 *   Labels = short weekday abbreviation (Mon, Tue, ...).
 *
 * Month: markers at days 1, 5, 10, 15, 20, 25, and the last day of refMs's
 *   month. xFraction = (day - 1) / (daysInMonth - 1). All major:true.
 *   Labels = day number as string.
 *
 * Year: 12 major markers for Jan..Dec at xFraction = i/11 (i = 0..11),
 *   major:true. Between consecutive months, one minor tick (major:false) at
 *   the midpoint. Total = 12 major + 11 minor = 23 entries, sorted by xFraction.
 */
export function xAxisMarkers(
  mode: TabRange,
  refMs: number
): XAxisMarker[] {
  try {
    if (mode === 'Week') {
      return buildWeekMarkers(refMs);
    }
    if (mode === 'Month') {
      return buildMonthMarkers(refMs);
    }
    return buildYearMarkers();
  } catch {
    return [];
  }
}

// Short weekday labels starting Sunday (JS getDay() = 0 is Sunday)
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Short month labels Jan..Dec
const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function buildWeekMarkers(refMs: number): XAxisMarker[] {
  const ref = new Date(refMs);
  const markers: XAxisMarker[] = [];
  for (let i = 0; i < 7; i++) {
    // Day i is (6 - i) days before refMs (so i=0 is oldest, i=6 is today)
    const d = new Date(ref);
    d.setDate(ref.getDate() - (6 - i));
    markers.push({
      label: WEEKDAY_SHORT[d.getDay()] ?? String(d.getDate()),
      xFraction: i / 6,
      major: true,
    });
  }
  return markers;
}

function getDaysInMonth(year: number, month: number): number {
  // month is 0-indexed JS month; new Date(y, m+1, 0) gives last day of month m
  return new Date(year, month + 1, 0).getDate();
}

function buildMonthMarkers(refMs: number): XAxisMarker[] {
  const ref = new Date(refMs);
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const anchorDays = [1, 5, 10, 15, 20, 25, daysInMonth];
  // Deduplicate (e.g. if daysInMonth is 25, don't double it)
  const unique = Array.from(new Set(anchorDays)).sort((a, b) => a - b);
  return unique.map((day) => ({
    label: String(day),
    xFraction: daysInMonth <= 1 ? 0 : (day - 1) / (daysInMonth - 1),
    major: true,
  }));
}

function buildYearMarkers(): XAxisMarker[] {
  const markers: XAxisMarker[] = [];
  // 12 major month markers
  for (let i = 0; i < 12; i++) {
    markers.push({
      label: MONTH_SHORT[i] ?? String(i + 1),
      xFraction: i / 11,
      major: true,
    });
  }
  // 11 minor ticks at midpoints between consecutive months
  for (let i = 0; i < 11; i++) {
    const xA = i / 11;
    const xB = (i + 1) / 11;
    markers.push({
      label: '',
      xFraction: (xA + xB) / 2,
      major: false,
    });
  }
  // Sort by xFraction
  markers.sort((a, b) => a.xFraction - b.xFraction);
  return markers;
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

/**
 * Maps an array of score points to a CLOSED SVG path string for an area fill
 * on a fixed 0..100 y-scale. Same x/y mapping as scoreLinePath: x evenly
 * spaced by index, y=(1 - clamp(score,0,100)/100)*height. The path follows
 * the composite line across the points, then closes via:
 *   L lastX,height  (down to the baseline at the last point)
 *   L 0,height      (across the baseline to x=0)
 *   Z               (close)
 * Returns '' for fewer than 2 finite points. Never throws, never produces NaN.
 */
export function scoreAreaPath(
  points: { score: number }[],
  width: number,
  height: number
): string {
  const finite = points.filter((p) => typeof p.score === 'number' && isFinite(p.score));
  if (finite.length < 2) return '';

  const n = finite.length;
  const step = n > 1 ? width / (n - 1) : 0;

  const linePart = finite
    .map((p, i) => {
      const clamped = Math.max(0, Math.min(100, p.score));
      const x = i * step;
      const y = (1 - clamped / 100) * height;
      const cmd = i === 0 ? 'M' : 'L';
      return `${cmd}${x},${y}`;
    })
    .join(' ');

  const lastX = (n - 1) * step;

  return `${linePart} L${lastX},${height} L0,${height} Z`;
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
// Plot area height (excludes x-axis label area below). Taller so the
// plotted area is the dominant element and the upper band reads full.
const CHART_H = 240;
// Left margin for Y-axis labels
const MARGIN_LEFT = 32;
// Bottom margin for X-axis labels
const MARGIN_BOTTOM = 24;
// Total SVG viewBox dimensions
const SVG_W = CHART_W + MARGIN_LEFT;
const SVG_H = CHART_H + MARGIN_BOTTOM;

const Y_TICKS = yAxisTicks();
const GRID_COLOR = 'rgba(255,255,255,0.07)';
const AXIS_COLOR = 'rgba(255,255,255,0.18)';
const LABEL_COLOR = 'rgba(255,255,255,0.35)';
// Solid dark plot surface color (same navy as glass-panel-solid from H-T1)
const PLOT_BG = '#16203A';
const MINOR_TICK_COLOR = 'rgba(255,255,255,0.12)';

// ---------------------------------------------------------------------------
// DailyScoresGraph
const TABS: TabRange[] = ['Week', 'Month', 'Year'];

// ---------------------------------------------------------------------------

export function DailyScoresGraph({ userId }: { userId: string | null }) {
  const [activeTab, setActiveTab] = useState<TabRange>('Week');
  const reduceMotion = useReducedMotion();
  const tablistRef = useRef<HTMLDivElement>(null);
  const trendKey = rangeToTrendKey(activeTab);

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

  // X-axis markers for the active tab (refMs = Date.now() for live component)
  const xMarkers = xAxisMarkers(activeTab, Date.now());

  // Keyboard navigation for the tablist (arrow keys cycle through tabs)
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = (idx + 1) % TABS.length;
        setActiveTab(TABS[next]);
        const buttons = tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
        buttons?.[next]?.focus();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = (idx - 1 + TABS.length) % TABS.length;
        setActiveTab(TABS[prev]);
        const buttons = tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
        buttons?.[prev]?.focus();
      }
    },
    [TABS]
  );

  const areaPath = scoreAreaPath(rawPoints, CHART_W, CHART_H);

  return (
    <div className="flex flex-col gap-2 w-full">

      {/* Segmented switcher (Week / Month / Year) */}
      <div
        ref={tablistRef}
        role="tablist"
        aria-label="Time range for Bio Optimization trend chart"
        className="flex gap-1 p-1 rounded-lg w-fit"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        {TABS.map((tab, idx) => {
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveTab(tab)}
              onKeyDown={(e) => handleTabKeyDown(e, idx)}
              className={`rounded-md px-5 py-2 text-xs font-semibold tracking-wide ${reduceMotion ? '' : 'transition-colors'} min-h-[44px] min-w-[56px]`}
              style={{
                fontFamily: DM_MONO,
                background: active ? compositeColor : 'transparent',
                color: active ? '#0f1923' : 'rgba(255,255,255,0.6)',
                border: 'none',
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Chart frame with solid dark surface */}
      <div
        className="relative w-full rounded-xl overflow-hidden"
        style={{ background: PLOT_BG, lineHeight: 0 }}
      >
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width="100%"
          height="auto"
          aria-label="Bio Optimization trend chart"
          role="img"
          style={{ display: 'block', overflow: 'visible' }}
        >
          {/* Solid dark background rect for the plot area */}
          <rect x={0} y={0} width={SVG_W} height={SVG_H} fill={PLOT_BG} />

          {/* Y-axis gridlines and labels every 10 (fixed 0 to 100) */}
          {Y_TICKS.map((tick) => {
            const y = (1 - tick / 100) * CHART_H;
            const isEdge = tick === 0 || tick === 100;
            return (
              <g key={tick}>
                {/* Gridline across the plot area */}
                <line
                  x1={MARGIN_LEFT}
                  y1={y}
                  x2={SVG_W}
                  y2={y}
                  stroke={isEdge ? AXIS_COLOR : GRID_COLOR}
                  strokeWidth={isEdge ? 1 : 0.75}
                />
                {/* Y-axis label left of plot area */}
                <text
                  x={MARGIN_LEFT - 6}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={9}
                  fill={LABEL_COLOR}
                  fontFamily={DM_MONO}
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Area fill + composite trend line (only when 2+ finite points exist) */}
          {!isSparse && (
            <g transform={`translate(${MARGIN_LEFT},0)`}>
              {/* Soft gradient area fill under the composite line */}
              <defs>
                <linearGradient id="compositeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={compositeColor} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={compositeColor} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <path
                d={areaPath}
                fill="url(#compositeAreaGrad)"
                stroke="none"
              />
              {/* Composite line on top of the area fill */}
              <path
                d={path}
                fill="none"
                stroke={compositeColor}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}

          {/* Honest empty state overlay (centered message) */}
          {isSparse && (
            <foreignObject x={MARGIN_LEFT} y={0} width={CHART_W} height={CHART_H}>
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
                  Your Bio Optimization trend builds here as your daily scores accumulate.
                </p>
              </div>
            </foreignObject>
          )}

          {/* X-axis markers below the plot area */}
          {xMarkers.map((marker, i) => {
            const xPlot = MARGIN_LEFT + marker.xFraction * CHART_W;
            const tickH = marker.major ? 5 : 3;
            return (
              <g key={`x-${i}`}>
                {/* Tick mark */}
                <line
                  x1={xPlot}
                  y1={CHART_H}
                  x2={xPlot}
                  y2={CHART_H + tickH}
                  stroke={marker.major ? AXIS_COLOR : MINOR_TICK_COLOR}
                  strokeWidth={0.75}
                />
                {/* Label (major only) */}
                {marker.major && marker.label && (
                  <text
                    x={xPlot}
                    y={CHART_H + tickH + 11}
                    textAnchor="middle"
                    fontSize={9}
                    fill={LABEL_COLOR}
                    fontFamily={DM_MONO}
                  >
                    {marker.label}
                  </text>
                )}
              </g>
            );
          })}
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
