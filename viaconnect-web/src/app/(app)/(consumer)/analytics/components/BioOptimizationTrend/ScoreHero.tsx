"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { tierFor, trendDirection, type ScorePoint } from "./utils/trendCalculations";

export function ScoreHero({
  current,
  points,
  displayName,
}: {
  current: number;
  points: ScorePoint[];
  displayName: string;
}) {
  const tier = tierFor(current);
  const direction = trendDirection(points);
  const deltaPoints = points.length >= 2
    ? Math.round(points[points.length - 1].score - points[0].score)
    : 0;

  const Arrow = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
  const arrowColor = direction === "up" ? "#34D399" : direction === "down" ? "#EF4444" : "#F59E0B";

  return (
    <div className="glass-panel p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p
            className="text-[11px] uppercase tracking-[0.18em] mb-2"
            style={{ color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-dm-mono), monospace" }}
          >
            Bio Optimization
          </p>
          <div className="flex items-baseline gap-3">
            <span
              className="text-5xl md:text-6xl font-bold tabular-nums"
              style={{ color: tier.color, fontFamily: "var(--font-dm-sans), sans-serif" }}
            >
              {current}
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: tier.color }}
            >
              {tier.name}
            </span>
          </div>
          <p className="text-xs text-white/50 mt-1">Welcome back, {displayName || "friend"}</p>
        </div>

        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{
              background: "rgba(26,39,68,0.5)",
              border: "1px solid rgba(45,165,160,0.18)",
            }}
          >
            <Arrow className="w-4 h-4" strokeWidth={1.5} style={{ color: arrowColor }} />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40">Range</p>
              <p className="text-sm font-semibold text-white tabular-nums">
                {deltaPoints >= 0 ? "+" : ""}
                {deltaPoints} pts
              </p>
            </div>
          </div>
          <div
            className="rounded-xl px-3 py-2"
            style={{
              background: "rgba(26,39,68,0.5)",
              border: "1px solid rgba(45,165,160,0.18)",
            }}
          >
            <p className="text-[10px] uppercase tracking-wider text-white/40">Readings</p>
            <p className="text-sm font-semibold text-white tabular-nums">{points.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
