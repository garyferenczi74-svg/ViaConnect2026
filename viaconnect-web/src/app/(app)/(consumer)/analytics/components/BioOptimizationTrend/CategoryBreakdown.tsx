"use client";

import { Moon, Apple, Activity, Brain, Pill } from "lucide-react";
import { tierFor } from "./utils/trendCalculations";

type Props = {
  categoryAverages: {
    sleep: number;
    nutrition: number;
    movement: number;
    stress: number;
    adherence: number;
  };
};

const PILLARS = [
  { key: "sleep", label: "Sleep Quality", Icon: Moon },
  { key: "nutrition", label: "Nutrition", Icon: Apple },
  { key: "movement", label: "Movement", Icon: Activity },
  { key: "stress", label: "Stress Resilience", Icon: Brain },
  { key: "adherence", label: "Supplement Adherence", Icon: Pill },
] as const;

export function CategoryBreakdown({ categoryAverages }: Props) {
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
          Category Pillars
        </h3>
        <span
          className="text-[10px] uppercase tracking-wider text-white/40"
          style={{ fontFamily: "var(--font-dm-mono), monospace" }}
        >
          5 pillars
        </span>
      </div>

      <div className="space-y-3">
        {PILLARS.map(({ key, label, Icon }) => {
          const value = categoryAverages[key as keyof typeof categoryAverages] ?? 0;
          const tier = tierFor(value);
          return (
            <div
              key={key}
              className="rounded-xl p-3 transition-colors"
              style={{
                background: "rgba(22,36,64,0.4)",
                border: "1px solid rgba(45,165,160,0.18)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: `${tier.color}22`,
                      border: `1px solid ${tier.color}40`,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: tier.color }} />
                  </div>
                  <span className="text-xs text-white/75 truncate">{label}</span>
                </div>
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{ color: tier.color, fontFamily: "var(--font-dm-sans), sans-serif" }}
                >
                  {value}
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${value}%`,
                    background: `linear-gradient(90deg, ${tier.color}66 0%, ${tier.color} 100%)`,
                    boxShadow: `0 0 10px ${tier.color}40`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
