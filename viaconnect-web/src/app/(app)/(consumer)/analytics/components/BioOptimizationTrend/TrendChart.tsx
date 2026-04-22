"use client";

import { useMemo, useState } from "react";
import type { ScorePoint, TimeRange } from "./utils/trendCalculations";
import { projectTrajectory, tierFor } from "./utils/trendCalculations";
import {
  CHART_PAD,
  CHART_VB_H,
  CHART_VB_W,
  buildAreaPath,
  buildLinePath,
  buildScale,
  formatDate,
} from "./utils/chartHelpers";

const TEAL = "#2DA5A0";
const ORANGE = "#E8803A";
const GOLD = "#F59E0B";

export function TrendChart({
  bioPoints,
  dailyPoints,
  range,
}: {
  bioPoints: ScorePoint[];
  dailyPoints: ScorePoint[];
  range: TimeRange;
}) {
  const [hover, setHover] = useState<{ x: number; y: number; point: ScorePoint } | null>(null);

  const scale = useMemo(() => buildScale(Math.max(bioPoints.length, dailyPoints.length, 2)), [
    bioPoints.length,
    dailyPoints.length,
  ]);

  const projection = useMemo(() => projectTrajectory(bioPoints, Math.min(7, Math.max(3, Math.floor(bioPoints.length / 4)))), [bioPoints]);

  const areaPath = useMemo(() => buildAreaPath(bioPoints, scale), [bioPoints, scale]);
  const linePath = useMemo(() => buildLinePath(bioPoints, scale), [bioPoints, scale]);

  const combinedForProj = useMemo(() => {
    if (bioPoints.length === 0) return [];
    return [bioPoints[bioPoints.length - 1], ...projection];
  }, [bioPoints, projection]);

  const projScale = useMemo(() => buildScale(bioPoints.length + projection.length), [
    bioPoints.length,
    projection.length,
  ]);

  const projPath = useMemo(() => {
    if (combinedForProj.length < 2) return "";
    return combinedForProj
      .map((p, i) => {
        const overallIdx = bioPoints.length - 1 + i;
        const x = projScale.xFor(overallIdx, bioPoints.length + projection.length);
        const y = projScale.yFor(p.score);
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [combinedForProj, bioPoints.length, projection.length, projScale]);

  const gridLines = [0, 25, 50, 75, 100];
  const tierLast = bioPoints.length ? tierFor(bioPoints[bioPoints.length - 1].score) : tierFor(0);

  const last = bioPoints[bioPoints.length - 1];
  const lastIdx = bioPoints.length - 1;

  const milestones = useMemo(() => {
    const out: Array<{ i: number; label: string }> = [];
    let prevTier = "";
    bioPoints.forEach((p, i) => {
      const t = tierFor(p.score).name;
      if (t !== prevTier && i > 0 && (t === "Thriving" || t === "Optimal")) {
        out.push({ i, label: t });
      }
      prevTier = t;
    });
    return out;
  }, [bioPoints]);

  const xTickCount = Math.min(6, bioPoints.length);
  const xTicks = useMemo(() => {
    if (bioPoints.length === 0) return [];
    const step = Math.max(1, Math.floor(bioPoints.length / xTickCount));
    const arr: number[] = [];
    for (let i = 0; i < bioPoints.length; i += step) arr.push(i);
    if (arr[arr.length - 1] !== bioPoints.length - 1) arr.push(bioPoints.length - 1);
    return arr;
  }, [bioPoints, xTickCount]);

  return (
    <div className="glass-panel relative p-4 md:p-6">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mb-3 text-[10px] uppercase tracking-wider text-white/50">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-5 h-[2px]" style={{ background: TEAL }} />
          Bio Trend
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: ORANGE }} />
          Daily Score
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block w-5 h-0"
            style={{ borderTop: `2px dashed ${ORANGE}` }}
          />
          Projection
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rotate-45" style={{ background: GOLD }} />
          Milestone
        </span>
      </div>

      <svg viewBox={`0 0 ${CHART_VB_W} ${CHART_VB_H}`} className="w-full h-auto" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bioAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={TEAL} stopOpacity="0.35" />
            <stop offset="100%" stopColor={TEAL} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {gridLines.map((g) => {
          const y = scale.yFor(g);
          return (
            <g key={g}>
              <line
                x1={CHART_PAD.l}
                x2={CHART_VB_W - CHART_PAD.r}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray={g === 0 || g === 100 ? "0" : "2 4"}
              />
              <text
                x={CHART_PAD.l - 8}
                y={y + 3}
                textAnchor="end"
                fontSize="10"
                fill="rgba(255,255,255,0.35)"
                fontFamily="var(--font-dm-mono), monospace"
              >
                {g}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        {bioPoints.length >= 2 && <path d={areaPath} fill="url(#bioAreaGrad)" />}

        {/* Projection (dashed) */}
        {projPath && (
          <path
            d={projPath}
            fill="none"
            stroke={ORANGE}
            strokeWidth={2}
            strokeDasharray="4 5"
            strokeLinecap="round"
            opacity={0.8}
          />
        )}

        {/* Bio trend line */}
        {bioPoints.length >= 2 && (
          <path
            d={linePath}
            fill="none"
            stroke={TEAL}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Daily score scatter */}
        {dailyPoints.map((p, i) => {
          const dScale = buildScale(dailyPoints.length);
          const cx = dScale.xFor(i, dailyPoints.length);
          const cy = dScale.yFor(p.score);
          return (
            <circle
              key={`d-${p.date}-${i}`}
              cx={cx}
              cy={cy}
              r={3}
              fill={ORANGE}
              opacity={0.85}
              onMouseEnter={() => setHover({ x: cx, y: cy, point: p })}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            />
          );
        })}

        {/* Milestone markers */}
        {milestones.map((m) => {
          const cx = scale.xFor(m.i, bioPoints.length);
          const cy = scale.yFor(bioPoints[m.i].score);
          return (
            <g key={`m-${m.i}`}>
              <rect
                x={cx - 4}
                y={cy - 4}
                width={8}
                height={8}
                transform={`rotate(45 ${cx} ${cy})`}
                fill={GOLD}
                stroke="#0B1120"
                strokeWidth={1}
              />
            </g>
          );
        })}

        {/* Current endpoint */}
        {last && (
          <g>
            <circle
              cx={scale.xFor(lastIdx, bioPoints.length)}
              cy={scale.yFor(last.score)}
              r={8}
              fill={tierLast.color}
              opacity={0.25}
            />
            <circle
              cx={scale.xFor(lastIdx, bioPoints.length)}
              cy={scale.yFor(last.score)}
              r={4.5}
              fill={tierLast.color}
              stroke="#0B1120"
              strokeWidth={2}
            />
          </g>
        )}

        {/* X ticks */}
        {xTicks.map((i) => {
          const p = bioPoints[i];
          if (!p) return null;
          return (
            <text
              key={`xt-${i}`}
              x={scale.xFor(i, bioPoints.length)}
              y={CHART_VB_H - CHART_PAD.b + 16}
              textAnchor="middle"
              fontSize="10"
              fill="rgba(255,255,255,0.4)"
              fontFamily="var(--font-dm-mono), monospace"
            >
              {formatDate(p.date, range)}
            </text>
          );
        })}

        {/* Hover tooltip */}
        {hover && (
          <g>
            <line
              x1={hover.x}
              x2={hover.x}
              y1={CHART_PAD.t}
              y2={CHART_VB_H - CHART_PAD.b}
              stroke={ORANGE}
              strokeWidth={1}
              strokeDasharray="2 3"
              opacity={0.5}
            />
            <rect
              x={Math.min(CHART_VB_W - 110, Math.max(CHART_PAD.l, hover.x - 50))}
              y={hover.y - 38}
              width={100}
              height={30}
              rx={6}
              fill="rgba(11,21,32,0.95)"
              stroke="rgba(232,128,58,0.4)"
            />
            <text
              x={Math.min(CHART_VB_W - 60, Math.max(CHART_PAD.l + 50, hover.x))}
              y={hover.y - 22}
              textAnchor="middle"
              fontSize="10"
              fill="rgba(255,255,255,0.6)"
              fontFamily="var(--font-dm-mono), monospace"
            >
              {formatDate(hover.point.date, range)}
            </text>
            <text
              x={Math.min(CHART_VB_W - 60, Math.max(CHART_PAD.l + 50, hover.x))}
              y={hover.y - 11}
              textAnchor="middle"
              fontSize="12"
              fontWeight="600"
              fill={ORANGE}
              fontFamily="var(--font-dm-sans), sans-serif"
            >
              {Math.round(hover.point.score)}
            </text>
          </g>
        )}
      </svg>

      {bioPoints.length < 2 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-xs text-white/40" style={{ fontFamily: "var(--font-dm-mono), monospace" }}>
            Log consistent check ins to unlock your trend
          </p>
        </div>
      )}
    </div>
  );
}
