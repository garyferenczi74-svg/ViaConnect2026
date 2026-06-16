'use client';

// Prompt 179 Section 7.2 Trajectory Chart. Prompt 201i made it a bespoke SVG +
// Framer Motion chart. Prompt 201k (2026-06-16, Gary's "Prompt 200c"): restyled
// to the clean weight-tracker reference within our tokens (DD-1 evolve the SVG):
// two smooth glowing gradient curves with circular markers (teal actual, SOLID
// orange projected per DD-2), a flat teal Goal line, a TARGET WEIGHT callout, a
// Weekly/Monthly granularity toggle (DD-6), a teal->orange gradient bottom slider
// scrubber (DD-3) plus a plus button to the existing weight log (DD-4). It renders
// only the engine series, never recomputes the projection, fails open to an empty
// state, and honors reduced motion. Count-ups run once and hold.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { TrendingUp, Plus } from 'lucide-react';
import type { TrajectoryView } from './useActiveGoal';
import { ProgressCard } from './ProgressCard';
import { useCountUp } from '@/lib/ui/useCountUp';
import {
  buildScale,
  weightYDomain,
  smoothLinePath,
  areaPath,
  thinTicks,
  onTrackStatus,
  downsampleByDays,
  type Pt,
} from './trajectoryChartMath';

const TEAL = '#2DA5A0';
const ORANGE = '#B75E18';
const VB_H = 280;
const PAD = { t: 16, r: 16, b: 28, l: 46 };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Grain = 'weekly' | 'monthly';

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

function LegendDot({ color, flag, label }: { color: string; flag?: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-white/60">
      {flag ? (
        <span aria-hidden="true" className="inline-block h-2 w-2 rotate-45 rounded-[1px]" style={{ background: color }} />
      ) : (
        <span aria-hidden="true" className="inline-flex items-center">
          <span className="inline-block h-0.5 w-4 rounded" style={{ background: color }} />
        </span>
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
  const [grain, setGrain] = useState<Grain>('weekly');
  const [scrubFrac, setScrubFrac] = useState(1);
  const { ref, w } = useWidth();
  const svgRef = useRef<SVGSVGElement>(null);
  const reduce = useReducedMotion();

  const empty = actual.length === 0 && !projectedDate;

  const model = useMemo(() => {
    const rows = downsampleByDays(actual, grain === 'weekly' ? 7 : 30);
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

    const yTicks: number[] = [];
    for (let i = 0; i <= 3; i++) yTicks.push(Math.round(yMin + ((yMax - yMin) * i) / 3));
    const yTicksUnique = [...new Set(yTicks)];
    const tickMsList = thinTicks(actualPts.map((p) => p.ms), w < 480 ? 4 : 7);

    const combined = [
      ...actualPts.map((p) => ({ ...p, kind: 'Actual' as const })),
      ...projectedPts.slice(1).map((p) => ({ ...p, kind: 'Projected' as const })),
    ];

    return { actualPts, lastActual, todayMs, projMs, projectedPts, minMs, maxMs, scale, yTicks: yTicksUnique, tickMsList, combined };
  }, [actual, grain, startWeightLb, startDate, goalWeightLb, projectedDate, w]);

  const { actualPts, lastActual, todayMs, projMs, projectedPts, minMs, maxMs, scale, yTicks, tickMsList, combined } = model;

  const latestLb = lastActual?.lb ?? startWeightLb;
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
  const currentUp = useCountUp(Math.round(latestLb), { duration: 900 });
  const targetUp = useCountUp(Math.round(goalWeightLb), { duration: 900 });

  const actualLine = useMemo(() => smoothLinePath(actualPts, scale), [actualPts, scale]);
  const actualArea = useMemo(() => areaPath(actualPts, scale), [actualPts, scale]);
  const projLine = useMemo(() => smoothLinePath(projectedPts, scale), [projectedPts, scale]);
  const firstYear = actualPts[0] ? new Date(actualPts[0].ms).getUTCFullYear() : new Date().getUTCFullYear();

  // Scrub cursor: the bottom slider and plot hover both write scrubFrac; the
  // cursor snaps to the nearest combined point.
  const cursor = useMemo(() => {
    if (combined.length === 0) return null;
    const ms = minMs + scrubFrac * (maxMs - minMs);
    let best = combined[0];
    let bd = Infinity;
    for (const p of combined) {
      const d = Math.abs(p.ms - ms);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return { x: scale.xForMs(best.ms), y: scale.yForLb(best.lb), ms: best.ms, lb: best.lb, kind: best.kind };
  }, [combined, scrubFrac, minMs, maxMs, scale]);

  function onPlotMove(clientX: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * w;
    const frac = Math.max(0, Math.min(1, (svgX - PAD.l) / Math.max(1, scale.innerW)));
    setScrubFrac(frac);
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
          {/* Weekly / Monthly granularity (DD-6). */}
          <div className="inline-flex rounded-full border border-white/15 bg-white/[0.06] p-0.5 backdrop-blur-md">
            {(['weekly', 'monthly'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGrain(g)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition ${
                  grain === g ? 'bg-white/15 text-white' : 'text-white/55'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {empty ? (
        <div className="relative flex h-[240px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rotate-45 rounded-[1px]" style={{ background: TEAL }} />
          <p className="text-sm text-white/40">Start logging to see your trajectory.</p>
          <div className="pointer-events-none absolute right-3 top-3 rounded-lg border border-[#B75E18]/60 bg-[#1E3054]/80 px-3 py-1.5 text-right backdrop-blur-sm">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[#e8b78c]">Target Weight</p>
            <p className="text-base font-bold tabular-nums text-white">{Math.round(goalWeightLb)}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <LegendDot color={TEAL} label="Actual" />
              <LegendDot color={ORANGE} label="Projected" />
              <LegendDot color={TEAL} flag label="Goal" />
            </div>
            <span className="text-[11px] text-white/45">
              <span className="font-semibold tabular-nums text-white">{Math.round(lbsToGo)}</span> lb to go
            </span>
          </div>

          <div ref={ref} className="relative w-full">
            {/* Target Weight callout (DD reference). */}
            <div className="pointer-events-none absolute right-2 top-2 z-10 rounded-lg border border-[#B75E18]/60 bg-[#1E3054]/80 px-3 py-1.5 text-right backdrop-blur-sm">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[#e8b78c]">Target Weight</p>
              <p className="text-base font-bold tabular-nums text-white">{Math.round(targetUp)}</p>
            </div>

            {/* Add a weight entry (DD-4), routes to the existing weight log. */}
            <Link
              href="/body-tracker/weight"
              aria-label="Log a weight entry"
              className="absolute bottom-2 right-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#2DA5A0]/60 bg-[#1E3054]/80 text-[#2DA5A0] backdrop-blur-sm transition hover:bg-[#2DA5A0]/15"
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
            </Link>

            <svg
              ref={svgRef}
              viewBox={`0 0 ${w} ${VB_H}`}
              width="100%"
              height={VB_H}
              className="touch-none select-none"
              onPointerMove={(e) => onPlotMove(e.clientX)}
              onPointerDown={(e) => onPlotMove(e.clientX)}
            >
              <defs>
                <linearGradient id="trajArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TEAL} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={TEAL} stopOpacity="0" />
                </linearGradient>
                <linearGradient id="trajProjArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ORANGE} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={ORANGE} stopOpacity="0" />
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

              {/* Actual area + line + markers */}
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

              {/* Projected area + SOLID line (DD-2) */}
              {projectedPts.length >= 2 ? (
                <>
                  <motion.path
                    d={areaPath(projectedPts, scale)}
                    fill="url(#trajProjArea)"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={reduce ? { duration: 0 } : { duration: 1.1, delay: 0.6 }}
                  />
                  <motion.path
                    d={projLine}
                    fill="none"
                    stroke={ORANGE}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    filter="url(#trajGlow)"
                    initial={reduce ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={reduce ? { duration: 0 } : { duration: 1.1, ease: 'easeInOut', delay: 0.4 }}
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

              {/* Circular markers on both curves */}
              {actualPts.map((p, i) => (
                <motion.circle
                  key={`am-${p.ms}`}
                  cx={scale.xForMs(p.ms)}
                  cy={scale.yForLb(p.lb)}
                  r={3}
                  fill={TEAL}
                  stroke="#1E3054"
                  strokeWidth={1}
                  initial={reduce ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.25, delay: 1.0 + i * 0.04 }}
                  style={{ transformOrigin: `${scale.xForMs(p.ms)}px ${scale.yForLb(p.lb)}px` }}
                />
              ))}
              {projectedPts.slice(1).map((p, i) => (
                <motion.circle
                  key={`pm-${p.ms}`}
                  cx={scale.xForMs(p.ms)}
                  cy={scale.yForLb(p.lb)}
                  r={3}
                  fill={ORANGE}
                  stroke="#1E3054"
                  strokeWidth={1}
                  initial={reduce ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.25, delay: 1.3 + i * 0.04 }}
                />
              ))}

              {/* Goal reference + flag */}
              <line x1={PAD.l} x2={w - PAD.r} y1={goalY} y2={goalY} stroke={TEAL} strokeWidth={2} strokeOpacity={0.75} />
              <g transform={`translate(${w - PAD.r - 2}, ${goalY})`}>
                <rect x={-2} y={-4} width={8} height={8} transform="rotate(45)" fill={TEAL} />
              </g>
              <text x={PAD.l + 2} y={goalY - 5} fontSize="10" fill="#9fe6e2">
                Goal {Math.round(goalWeightLb)} lb
              </text>

              {/* Current node: pulsing halo + double circle + label */}
              {lastActual ? (
                <g>
                  {!reduce ? (
                    <motion.circle
                      cx={scale.xForMs(lastActual.ms)}
                      cy={scale.yForLb(lastActual.lb)}
                      r={7}
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
                    r={8}
                    fill={TEAL}
                    fillOpacity={0.25}
                    initial={reduce ? false : { scale: 0.6 }}
                    animate={{ scale: 1 }}
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 16, delay: 1.1 }}
                    style={{ transformOrigin: `${scale.xForMs(lastActual.ms)}px ${scale.yForLb(lastActual.lb)}px` }}
                  />
                  <circle cx={scale.xForMs(lastActual.ms)} cy={scale.yForLb(lastActual.lb)} r={4.5} fill={TEAL} stroke="#1E3054" strokeWidth={2} />
                  <text x={scale.xForMs(lastActual.ms)} y={scale.yForLb(lastActual.lb) - 13} textAnchor="middle" fontSize="11" fontWeight="600" fill="#ffffff">
                    {Math.round(currentUp)} lb
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

              {/* Scrub cursor */}
              {cursor ? (
                <g pointerEvents="none">
                  <line x1={cursor.x} x2={cursor.x} y1={PAD.t} y2={VB_H - PAD.b} stroke="rgba(255,255,255,0.35)" strokeDasharray="2 3" />
                  <motion.circle
                    cx={cursor.x}
                    cy={cursor.y}
                    r={5}
                    fill={cursor.kind === 'Actual' ? TEAL : ORANGE}
                    stroke="#1E3054"
                    strokeWidth={2}
                    animate={{ cx: cursor.x, cy: cursor.y }}
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
                  />
                  <g transform={`translate(${Math.min(w - PAD.r - 96, Math.max(PAD.l, cursor.x - 48))}, ${Math.max(PAD.t, cursor.y - 52)})`}>
                    <rect width={96} height={42} rx={6} fill="rgba(26,39,68,0.96)" stroke="rgba(255,255,255,0.1)" />
                    <text x={8} y={15} fontSize="10" fill="rgba(255,255,255,0.6)">
                      {tickLabel(cursor.ms, new Date(cursor.ms).getUTCFullYear() !== firstYear)}
                    </text>
                    <text x={8} y={29} fontSize="12" fontWeight="600" fill="#ffffff">
                      {Math.round(cursor.lb)} lb
                    </text>
                    <text x={8} y={39} fontSize="9" fill={cursor.kind === 'Actual' ? '#7fd6d2' : '#e8b78c'}>
                      {cursor.kind} | {Math.round(Math.abs(cursor.lb - goalWeightLb))} lb to goal
                    </text>
                  </g>
                </g>
              ) : null}
            </svg>

            {/* Bottom gradient slider scrubber (DD-3): teal->orange track, draggable thumb. */}
            <input
              type="range"
              min={0}
              max={1000}
              value={Math.round(scrubFrac * 1000)}
              onChange={(e) => setScrubFrac(Number(e.target.value) / 1000)}
              aria-label="Scrub the trajectory timeline"
              className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-[#2DA5A0] to-[#B75E18] [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#1E3054] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#1E3054]"
            />
          </div>
        </>
      )}
    </ProgressCard>
  );
}
