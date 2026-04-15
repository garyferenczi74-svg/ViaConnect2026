"use client";

import { Award, Calendar, Target, Zap, Flame } from "lucide-react";
import { nextMilestone, tierFor } from "./utils/trendCalculations";

type Props = {
  personalBest: number;
  daysActive: number;
  current: number;
  streak: number;
  confidence: number;
};

export function EngagementFooter({ personalBest, daysActive, current, streak, confidence }: Props) {
  const milestone = nextMilestone(current);
  const milestoneProgress = Math.round((current / milestone.target) * 100);
  const tier = tierFor(current);

  const stats = [
    { Icon: Award, label: "Personal Best", value: personalBest, color: "#F59E0B" },
    { Icon: Calendar, label: "Days Active", value: daysActive, color: "#2DA5A0" },
    { Icon: Target, label: "Next Milestone", value: milestone.target, color: tier.color },
    { Icon: Zap, label: "Protocol Confidence", value: `${confidence}%`, color: "#E8803A" },
    { Icon: Flame, label: "Streak", value: `${streak}d`, color: "#EF4444" },
  ];

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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {stats.map(({ Icon, label, value, color }) => (
          <div
            key={label}
            className="rounded-xl p-3"
            style={{
              background: "rgba(22,36,64,0.4)",
              border: "1px solid rgba(45,165,160,0.18)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color }} />
              <span
                className="text-[10px] uppercase tracking-wider text-white/40"
                style={{ fontFamily: "var(--font-dm-mono), monospace" }}
              >
                {label}
              </span>
            </div>
            <p
              className="text-xl font-bold tabular-nums"
              style={{ color, fontFamily: "var(--font-dm-sans), sans-serif" }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      <div
        className="rounded-xl p-4"
        style={{
          background: "rgba(22,36,64,0.4)",
          border: "1px solid rgba(232,128,58,0.35)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4" strokeWidth={1.5} style={{ color: "#E8803A" }} />
            <span
              className="text-xs font-semibold text-white"
              style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
            >
              Next Goal: {milestone.label}
            </span>
          </div>
          <span className="text-xs text-white/60 tabular-nums">
            {current} of {milestone.target}
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, milestoneProgress)}%`,
              background: "linear-gradient(90deg, #E8803A66 0%, #E8803A 100%)",
              boxShadow: "0 0 12px rgba(232,128,58,0.4)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
