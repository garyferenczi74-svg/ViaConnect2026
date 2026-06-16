'use client';

// Prompt 179 Section 7.2 Trajectory Chart. Prompt 201 promoted it to a hero card.
// Prompt 201i (2026-06-16, Gary's "Prompt 200b"): rebuilt as a bespoke SVG +
// Framer Motion chart (Option A), mirroring the Bio Optimization analytics chart
// pattern. Interactive, animated, readable at a glance: where am I (endpoint),
// where am I heading (projected line + goal flag), when (completion chip), am I
// on track (on-track band + status pill). It renders ONLY the engine-returned
// trajectory series, never recomputes the projection, and fails open to a
// friendly empty state. The on-track band bounds and the status pill are
// client-side display guides (the engine exposes neither yet); both are labeled.

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import type { TrajectoryView } from './useActiveGoal';
import { ProgressCard } from './ProgressCard';
import { useCountUp } from '@/lib/ui/useCountUp';
import {
  buildScale,
  weightYDomain,
  smoothLinePath,
  areaPath,
  computeMilestones,
  thinMilestonesForRange,
  thinTicks,
  onTrackStatus,
  type Pt,
} from './trajectoryChartMath';

const TEAL = '#2DA5A0';
const ORANGE = '#B75E18';
const VB_H = 280;
const PAD = { t: 16, r: 16, b: 28, l: 46 };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Range = '30d' | '90d' | 'all' | 'togoal';
const RANGES: ReadonlyArray<{ id: Range; label: string }> = [
  { id: '30d', label: '30d' },
  { id: '90d', label: '90d' },
  { id: 'all', label: 'All' },
  { id: 'togoal', label: 'To goal' },
];

function toMs(d: string): number {
  return new Date(`${d}T00:00:00Z`).getTime();
}
function tickLabel(ms: number, withYear: boolean): string {
  const dt = new Date(ms);
  const base = `${MONTHS[dt.getUTCMonth()]} ${dt.getUTCDate()}`;
  return withYear ? `${base} '${String(dt.getUTCFullYear()).slice(-2)}` : base;
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(700);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0]?.contentRect.width;
      if (cw && cw > 0) setW(Math.round(cw));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

function LegendDot({ color, dashed, flag, label }: { color: string; dashed?: boolean; flag?: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-white/60">
      {flag ? (
        <span aria-hidden="true" className="inline-block h-2 w-2 rotate-45 rounded-[1px]" style={{ background: color }} />
      ) : (
        <span
          aria-hidden="true"
          className="inline-block h-0.5 w-4 rounded"
          style={{ background: dashed ? `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)` : color }}
        />
      )}
      {label}
    </span>
  );
}

const STATUS_COPY: Record<string, { label: string; cls: string }> = {
  on_track: { label: 'On track', cls: 'border-[#2DA5A0]/50 bg-[#2DA5A0]/15 text-[#7fd6d2]' },
  ahead: { label: 'Ahead', cls: 'border-[#2DA5A0]/50 bg-[#2DA5A0]/15 text-[#7fd6d2]' },
  behind: { label: 'Behind', cls: 'border-[#B75E18]/50 bg-[#B75E18]/15 text-[#e8b78c]' },
};

export function TrajectoryChart({
  actual,
  startWeightLb,
  startDate,
  goalWeightLb,
  projectedDate,
}: Omit<TrajectoryView, 'latestSmoothedLb'>) {
  const [range, setRange] = useState<Range>('all');
  const [hover, setHover] = useState<{ x: number; y: number; ms: number; lb: number; kind: 'Actual' | 'Projected' } | null>(null);
  const { ref, w } = useWidth();
  const svgRef = useRef<SVGSVGElement>(null);
  const reduce = useReducedMotion();

  const empty = actual.length === 0 && !projectedDate;

  const model = useMemo(() => {
    // Range filter on the actual series; fail open to all if a window empties.
    let rows = actual;
    if (range === '30d' || range === '90d') {
      const days = range === '30d' ? 30 : 90;
      const cutoff = Date.now() - days * 86_400_000;
      const filtered = actual.filter((a) => toMs(a.date) >= cutoff);
      rows = filtered.length > 0 ? filtered : actual;
    }
    const actualPts: Pt[] = rows.map((a) => ({ ms: toMs(a.date), lb: a.smoothedLb }));
    const lastActual = actualPts[actualPts.length - 1] ?? null;
    const todayMs = lastActual?.ms ?? toMs(startDate);
    const projMs = projectedDate ? toMs(projectedDate) : null;
    const projectedPts: Pt[] =
      lastActual && projMs && projMs > todayMs
        ? [{ ms: lastActual.ms, lb: lastActual.lb }, { ms: projMs, lb: goalWeightLb }]
        : [];

    const allLbs = [...actualPts.map((p) => p.lb), goalWeightLb, startWeightLb, ...projectedPts.map((p) => p.lb)];
    const [yMin, yMax] = weightYDomain(allLbs, 6);
    const minMs = Math.min(...actualPts.map((p) => p.ms), todayMs, toMs(startDate));
    const maxMs = Math.max(...actualPts.map((p) => p.ms), todayMs, projMs ?? todayMs);
    const scale = buildScale({ minMs, maxMs, yMin, yMax, vbW: w, vbH: VB_H, pad: PAD });

    // Future milestones (between the latest weight and the goal) on the linear
    // projection, plus a start marker; thinned on a narrow weight span.
    const visibleSpan = yMax - yMin;
    const milestoneLbs = thinMilestonesForRange(computeMilestones(startWeightLb, goalWeightLb), visibleSpan);
    const latestLb = lastActual?.lb ?? startWeightLb;
    const futureMarkers =
      projMs && projMs > todayMs
        ? milestoneLbs
            .filter((mw) => (goalWeightLb < startWeightLb ? mw < latestLb && mw > goalWeightLb : mw > latestLb && mw < goalWeightLb))
            .map((mw) => {
              const denom = goalWeightLb - latestLb || 1;
              const frac = Math.max(0, Math.min(1, (mw - latestLb) / denom));
              const ms = todayMs + frac * (projMs - todayMs);
              return { ms, lb: mw };
            })
        : [];

    // Y ticks: four rounded weight levels across the domain.
    const yTicks: number[] = [];
    for (let i = 0; i <= 3; i++) yTicks.push(Math.round(yMin + ((yMax - yMin) * i) / 3));

    const tickMsList = thinTicks(actualPts.map((p) => p.ms), w < 480 ? 4 : 7);

    return { actualPts, lastActual, todayMs, projMs, projectedPts, yMin, yMax, scale, futureMarkers, yTicks, tickMsList, latestLb };
  }, [actual, range, startWeightLb, startDate, goalWeightLb, projectedDate, w]);

  const { actualPts, lastActual, todayMs, projMs, projectedPts, scale, futureMarkers, yTicks, tickMsList, latestLb } = model;

  const status = onTrackStatus({
    startLb: startWeightLb,
    latestLb: lastActual?.lb ?? null,
    goalLb: goalWeightLb,
    startMs: toMs(startDate),
    projectedMs: projMs,
    todayMs,
    toleranceLb: 1.5,
  });
  const lbsToGo = useCountUp(Math.round(Math.abs(goalWeightLb - latestLb) * 10) / 10, { duration: 900 });

  const actualLine = useMemo(() => smoothLinePath(actualPts, scale), [actualPts, scale]);
  const actualArea = useMemo(() => areaPath(actualPts, scale), [actualPts, scale]);
  const projLine = useMemo(() => smoothLinePath(projectedPts, scale), [projectedPts, scale]);
  const firstYear = actualPts[0] ? new Date(actualPts[0].ms).getUTCFullYear() : new Date().getUTCFullYear();

  // Pointer / touch scrubber: snap to the nearest combined point.
  const combined = useMemo(
    () => [
      ...actualPts.map((p) => ({ ...p, kind: 'Actual' as const })),
      ...projectedPts.slice(1).map((p) => ({ ...p, kind: 'Projected' as const })),
    ],
    [actualPts, projectedPts],
  );
  function onMove(clientX: number) {
    const svg = svgRef.current;
    if (!svg || combined.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * w;
    let best = combined[0];
    let bestD = Infinity;
    for (const p of combined) {
      const d = Math.abs(scale.xForMs(p.ms) - svgX);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    setHover({ x: scale.xForMs(best.ms), y: scale.yForLb(best.lb), ms: best.ms, lb: best.lb, kind: best.kind });
  }

  const goalY = scale.yForLb(goalWeightLb);

  return (
    <ProgressCard icon={TrendingUp} accent="teal" attributionSlug="arnold">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">Trajectory</h2>
        <div className="flex flex-wrap items-center gap-2">
          {status ? (
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${STATUS_COPY[status].cls}`}
              title="Guide based on your latest weight vs the projected path"
            >
              {STATUS_COPY[status].label}
            </span>
          ) : null}
          {projMs ? (
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/70 backdrop-blur-sm">
              Goal by {tickLabel(projMs, true)}
            </span>
          ) : null}
        </div>
      </div>

      {empty ? (
        <div className="flex h-[240px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rotate-45 rounded-[1px]" style={{ background: TEAL }} />
          <p className="text-sm text-white/40">Start logging to see your trajectory.</p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <LegendDot color={TEAL} label="Actual" />
              <LegendDot color={ORANGE} dashed label="Projected" />
              <LegendDot color={TEAL} flag label="Goal" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-white/45">
                <span className="font-semibold tabular-nums text-white">{Math.round(lbsToGo)}</span> lb to go
              </span>
              <div className="inline-flex rounded-full border border-white/15 bg-white/[0.06] p-0.5 backdrop-blur-md">
                {RANGES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRange(r.id)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                      range === r.id ? 'bg-white/15 text-white' : 'text-white/55'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div ref={ref} className="w-full">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${w} ${VB_H}`}
              width="100%"
              height={VB_H}
              className="touch-none select-none"
              onPointerMove={(e) => onMove(e.clientX)}
              onPointerDown={(e) => onMove(e.clientX)}
              onPointerLeave={() => setHover(null)}
            >
              <defs>
                <linearGradient id="trajArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TEAL} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={TEAL} stopOpacity="0" />
                </linearGradient>
                <linearGradient id="trajProj" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={ORANGE} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={ORANGE} stopOpacity="0.4" />
                </linearGradient>
                <filter id="trajGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Grid + y labels */}
              {yTicks.map((t) => {
                const y = scale.yForLb(t);
                return (
                  <g key={`y-${t}`}>
                    <line x1={PAD.l} x2={w - PAD.r} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" />
                    <text x={PAD.l - 8} y={y + 3} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.55)">
                      {t}
                    </text>
                  </g>
                );
              })}

              {/* On-track band: a +/- tolerance corridor around the goal (display guide). */}
              <rect x={PAD.l} y={scale.yForLb(goalWeightLb + 1.5)} width={w - PAD.l - PAD.r} height={Math.abs(scale.yForLb(goalWeightLb - 1.5) - scale.yForLb(goalWeightLb + 1.5))} fill={TEAL} fillOpacity={0.08} />

              {/* Actual area + line */}
              {actualPts.length >= 2 ? (
                <>
                  <motion.path
                    d={actualArea}
                    fill="url(#trajArea)"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={reduce ? { duration: 0 } : { duration: 1.1, delay: 0.2 }}
                  />
                  <motion.path
                    d={actualLine}
                    fill="none"
                    stroke={TEAL}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#trajGlow)"
                    initial={reduce ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={reduce ? { duration: 0 } : { duration: 1.1, ease: 'easeInOut' }}
                  />
                </>
              ) : null}

              {/* Today divider */}
              {lastActual ? (
                <g>
                  <line x1={scale.xForMs(todayMs)} x2={scale.xForMs(todayMs)} y1={PAD.t} y2={VB_H - PAD.b} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 4" />
                  <text x={scale.xForMs(todayMs)} y={PAD.t - 4} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.5)">
                    Today
                  </text>
                </g>
              ) : null}

              {/* Projected line */}
              {projLine ? (
                <motion.path
                  d={projLine}
                  fill="none"
                  stroke="url(#trajProj)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  strokeLinecap="round"
                  initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.8, ease: 'easeOut', delay: 1.0 }}
                />
              ) : null}

              {/* Goal reference + flag */}
              <line x1={PAD.l} x2={w - PAD.r} y1={goalY} y2={goalY} stroke={TEAL} strokeOpacity={0.7} strokeDasharray="4 4" />
              <g transform={`translate(${w - PAD.r - 2}, ${goalY})`}>
                <rect x={-2} y={-4} width={8} height={8} transform="rotate(45)" fill={TEAL} />
              </g>
              <text x={PAD.l + 2} y={goalY - 5} fontSize="10" fill="#9fe6e2">
                Goal {Math.round(goalWeightLb)} lb
              </text>

              {/* Future milestone diamonds */}
              {futureMarkers.map((m, i) => {
                const cx = scale.xForMs(m.ms);
                const cy = scale.yForLb(m.lb);
                return (
                  <motion.rect
                    key={`ms-${m.lb}`}
                    x={cx - 3.5}
                    y={cy - 3.5}
                    width={7}
                    height={7}
                    transform={`rotate(45 ${cx} ${cy})`}
                    fill="#1E3054"
                    stroke={ORANGE}
                    strokeWidth={1.5}
                    initial={reduce ? false : { opacity: 0, y: cy - 3.5 + 6 }}
                    animate={{ opacity: 1, y: cy - 3.5 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.3, delay: 1.2 + i * 0.06 }}
                  />
                );
              })}

              {/* Current endpoint: pulsing halo + double circle + label */}
              {lastActual ? (
                <g>
                  {!reduce ? (
                    <motion.circle
                      cx={scale.xForMs(lastActual.ms)}
                      cy={scale.yForLb(lastActual.lb)}
                      r={6}
                      fill={TEAL}
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 1.6, opacity: 0 }}
                      transition={{ duration: 1.8, ease: 'easeOut', repeat: Infinity }}
                      style={{ transformOrigin: `${scale.xForMs(lastActual.ms)}px ${scale.yForLb(lastActual.lb)}px` }}
                    />
                  ) : null}
                  <motion.circle
                    cx={scale.xForMs(lastActual.ms)}
                    cy={scale.yForLb(lastActual.lb)}
                    r={7}
                    fill={TEAL}
                    fillOpacity={0.25}
                    initial={reduce ? false : { scale: 0.6 }}
                    animate={{ scale: 1 }}
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 16, delay: 1.1 }}
                    style={{ transformOrigin: `${scale.xForMs(lastActual.ms)}px ${scale.yForLb(lastActual.lb)}px` }}
                  />
                  <circle cx={scale.xForMs(lastActual.ms)} cy={scale.yForLb(lastActual.lb)} r={4} fill={TEAL} stroke="#1E3054" strokeWidth={2} />
                  <text x={scale.xForMs(lastActual.ms)} y={scale.yForLb(lastActual.lb) - 12} textAnchor="middle" fontSize="11" fontWeight="600" fill="#ffffff">
                    {Math.round(lastActual.lb)} lb
                  </text>
                </g>
              ) : null}

              {/* X ticks */}
              {tickMsList.map((ms) => {
                const yr = new Date(ms).getUTCFullYear();
                return (
                  <text key={`xt-${ms}`} x={scale.xForMs(ms)} y={VB_H - PAD.b + 16} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.45)">
                    {tickLabel(ms, yr !== firstYear)}
                  </text>
                );
              })}

              {/* Scrubber crosshair + focus dot + tooltip */}
              {hover ? (
                <g pointerEvents="none">
                  <line x1={hover.x} x2={hover.x} y1={PAD.t} y2={VB_H - PAD.b} stroke="rgba(255,255,255,0.35)" strokeDasharray="2 3" />
                  <motion.circle
                    cx={hover.x}
                    cy={hover.y}
                    r={5}
                    fill={hover.kind === 'Actual' ? TEAL : ORANGE}
                    stroke="#1E3054"
                    strokeWidth={2}
                    animate={{ cx: hover.x, cy: hover.y }}
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
                  />
                  <g transform={`translate(${Math.min(w - PAD.r - 96, Math.max(PAD.l, hover.x - 48))}, ${Math.max(PAD.t, hover.y - 52)})`}>
                    <rect width={96} height={42} rx={6} fill="rgba(26,39,68,0.96)" stroke="rgba(255,255,255,0.1)" />
                    <text x={8} y={15} fontSize="10" fill="rgba(255,255,255,0.6)">
                      {tickLabel(hover.ms, new Date(hover.ms).getUTCFullYear() !== firstYear)}
                    </text>
                    <text x={8} y={29} fontSize="12" fontWeight="600" fill="#ffffff">
                      {Math.round(hover.lb)} lb
                    </text>
                    <text x={8} y={39} fontSize="9" fill={hover.kind === 'Actual' ? '#7fd6d2' : '#e8b78c'}>
                      {hover.kind} | {Math.round(Math.abs(hover.lb - goalWeightLb))} lb to goal
                    </text>
                  </g>
                </g>
              ) : null}
            </svg>
          </div>
        </>
      )}
    </ProgressCard>
  );
}
