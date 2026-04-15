"use client";

import Link from "next/link";
import { Sparkles, Target, TrendingUp, ArrowRight } from "lucide-react";
import type { HannahInsight } from "./hooks/useHannahInsights";

export function HannahInsightPanel({ insight }: { insight: HannahInsight }) {
  return (
    <div
      className="rounded-2xl p-5 md:p-6 relative overflow-hidden"
      style={{
        background: "rgba(30,48,84,0.45)",
        border: "1px solid rgba(45,165,160,0.18)",
        boxShadow:
          "0 4px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.03)",
      }}
    >
      <div
        aria-hidden
        className="absolute -top-20 -right-20 w-48 h-48 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(45,165,160,0.18) 0%, transparent 70%)",
        }}
      />

      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(45,165,160,0.14)",
            border: "1px solid rgba(45,165,160,0.35)",
          }}
        >
          <Sparkles className="w-4 h-4" strokeWidth={1.5} style={{ color: "#2DA5A0" }} />
        </div>
        <div>
          <p
            className="text-[11px] uppercase tracking-[0.18em]"
            style={{ color: "#2DA5A0", fontFamily: "var(--font-dm-mono), monospace" }}
          >
            Hannah AI
          </p>
          <p className="text-[10px] text-white/40">Personalized read</p>
        </div>
      </div>

      <p
        className="text-base md:text-lg font-semibold text-white mb-3"
        style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
      >
        {insight.greeting}
      </p>

      <p className="text-sm text-white/70 leading-relaxed mb-4">{insight.analysis}</p>

      <div
        className="rounded-xl p-4 mb-4"
        style={{
          background: "rgba(22,36,64,0.4)",
          border: "1px solid rgba(45,165,160,0.18)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: "#E8803A" }} />
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "#E8803A", fontFamily: "var(--font-dm-mono), monospace" }}
          >
            Focus: {insight.focusArea}
          </span>
        </div>
        <p className="text-sm text-white/80 leading-relaxed">{insight.recommendation}</p>
      </div>

      <div className="flex items-center justify-between text-xs mb-3">
        <span className="text-white/50">Estimated lift</span>
        <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: "#34D399" }}>
          <TrendingUp className="w-3.5 h-3.5" strokeWidth={1.5} />
          +{insight.estimatedImpact} pts
        </span>
      </div>

      <Link
        href="/wellness/advisor"
        className="inline-flex items-center justify-between w-full rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-white/5"
        style={{
          background: "rgba(45,165,160,0.14)",
          border: "1px solid rgba(45,165,160,0.35)",
          color: "#2DA5A0",
          fontFamily: "var(--font-dm-sans), sans-serif",
        }}
      >
        <span>View Full Report with Hannah</span>
        <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
      </Link>
    </div>
  );
}
