"use client";

import { Moon, Apple, Activity, Brain, Pill, ArrowRight } from "lucide-react";
import type { JourneyRec } from "./hooks/useJourneyRecommendations";

const ICONS = {
  sleep: Moon,
  nutrition: Apple,
  movement: Activity,
  stress: Brain,
  supplement: Pill,
} as const;

export function JourneyAccelerators({ recs }: { recs: JourneyRec[] }) {
  return (
    <div
      className="rounded-2xl p-5 md:p-6"
      style={{
        background: "rgba(30,48,84,0.45)",
        border: "1px solid rgba(45,165,160,0.18)",
        boxShadow:
          "0 4px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.03)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-sm font-semibold text-white"
          style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
        >
          Journey Accelerators
        </h3>
        <span
          className="text-[10px] uppercase tracking-wider text-white/40"
          style={{ fontFamily: "var(--font-dm-mono), monospace" }}
        >
          High impact
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {recs.map((rec) => {
          const Icon = ICONS[rec.icon];
          return (
            <button
              key={rec.id}
              type="button"
              className="text-left rounded-xl p-4 transition-all group"
              style={{
                background: "rgba(22,36,64,0.4)",
                border: "1px solid rgba(45,165,160,0.18)",
                boxShadow: "0 2px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "rgba(232,128,58,0.14)",
                    border: "1px solid rgba(232,128,58,0.35)",
                  }}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} style={{ color: "#E8803A" }} />
                </div>
                <div
                  className="rounded-md px-2 py-0.5 text-[10px] font-semibold tabular-nums"
                  style={{
                    background: "rgba(52,211,153,0.14)",
                    color: "#34D399",
                    border: "1px solid rgba(52,211,153,0.3)",
                  }}
                >
                  +{rec.estimatedImpact} pts
                </div>
              </div>

              <p
                className="text-sm font-semibold text-white mb-1"
                style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
              >
                {rec.title}
              </p>
              <p className="text-xs text-white/60 leading-relaxed mb-3">{rec.description}</p>

              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] uppercase tracking-wider text-white/40"
                  style={{ fontFamily: "var(--font-dm-mono), monospace" }}
                >
                  {rec.category}
                </span>
                <ArrowRight
                  className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={1.5}
                  style={{ color: "#E8803A" }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
