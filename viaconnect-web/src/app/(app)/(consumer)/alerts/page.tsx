"use client";

import { useState } from "react";
import { AlertTriangle, Brain, CheckCircle, Siren } from "lucide-react";

type FilterType = "all" | "critical" | "warnings" | "predictions" | "resolved";

const filters: { label: string; value: FilterType }[] = [
  { label: "All", value: "all" },
  { label: "Critical", value: "critical" },
  { label: "Warnings", value: "warnings" },
  { label: "Predictions", value: "predictions" },
  { label: "Resolved", value: "resolved" },
];

export default function AlertsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const cards = [
    { type: "critical" as const },
    { type: "warnings" as const },
    { type: "predictions" as const },
    { type: "resolved" as const },
  ];

  const visible = cards.filter(
    (c) => activeFilter === "all" || c.type === activeFilter
  );

  return (
    <div className="min-h-screen p-6 lg:p-8 space-y-8" style={{ background: "var(--gradient-hero)" }}>
      {/* ── HEADER ── */}
      <section className="space-y-2">
        <h1 className="text-heading-1" style={{ color: "#B75E18" }}>
          Alerts &amp; Predictions
        </h1>
        <p className="text-body-sm text-secondary">
          AI-powered health intelligence from your genetic profile and biometric data.
        </p>
      </section>

      {/* ── FILTER PILLS ── */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeFilter === f.value
                ? "text-white"
                : "text-secondary border border-white/10 hover:border-white/20"
            }`}
            style={
              activeFilter === f.value
                ? { backgroundColor: "#2DA5A0" }
                : undefined
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── ALERT CARDS ── */}
      <div className="space-y-3">
        {/* CRITICAL */}
        {visible.some((c) => c.type === "critical") && (
          <div
            className="glass-v2 p-4 space-y-4"
            style={{ borderLeft: "3px solid #EF4444" }}
          >
            {/* Title row */}
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "rgba(239,68,68,0.15)" }}
              >
                <AlertTriangle className="w-4 h-4" style={{ color: "#EF4444" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">
                  <Siren className="w-4 h-4 inline mr-1" strokeWidth={1.5} style={{ color: "#EF4444" }} /> Early illness signals detected
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-secondary leading-relaxed">
              Your HRV dropped 18% below baseline and skin temperature elevated 0.7°C. Combined
              with your IL-6 GG and TNF-alpha GA variants, your immune system may be under
              increased load.
            </p>

            {/* Genetic badges */}
            <div className="flex gap-2">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold"
                style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#F87171" }}
              >
                IL-6 GG
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold"
                style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#F87171" }}
              >
                TNF-alpha GA
              </span>
            </div>

            {/* Biometric evidence */}
            <p className="text-[11px] text-tertiary">
              HRV: 32ms (baseline: 39ms) · Temp: +0.7°C · Sleep: 5.8hrs
            </p>

            {/* Actions */}
            <div className="space-y-2">
              {[
                "Rest and reduce activity intensity",
                "Increase hydration to 3L",
                "Add extra RELAX+ tonight",
              ].map((action) => (
                <label key={action} className="flex items-center gap-2 text-xs text-white cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border-white/20 bg-transparent accent-[#2DA5A0]"
                  />
                  {action}
                </label>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-tertiary">2 hours ago</span>
              <button
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                style={{ backgroundColor: "#2DA5A0" }}
              >
                Acknowledge
              </button>
            </div>
          </div>
        )}

        {/* WARNING */}
        {visible.some((c) => c.type === "warnings") && (
          <div
            className="glass-v2 p-4 space-y-4"
            style={{ borderLeft: "3px solid #F59E0B" }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "rgba(245,158,11,0.15)" }}
              >
                <AlertTriangle className="w-4 h-4" style={{ color: "#F59E0B" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">
                  <AlertTriangle className="w-4 h-4 inline mr-1" strokeWidth={1.5} style={{ color: "#F59E0B" }} /> Recovery score declining 3 consecutive days
                </p>
              </div>
            </div>

            <p className="text-xs text-secondary leading-relaxed">
              Recovery dropped from 72 to 52 over 3 days. Your ACTN3 XX variant requires longer
              recovery periods from high-intensity training.
            </p>

            <div className="flex gap-2">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold"
                style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#FBBF24" }}
              >
                ACTN3 XX
              </span>
            </div>

            <div className="space-y-2">
              {[
                "Switch to low-intensity this week",
                "Prioritize 8hrs sleep",
              ].map((action) => (
                <label key={action} className="flex items-center gap-2 text-xs text-white cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border-white/20 bg-transparent accent-[#2DA5A0]"
                  />
                  {action}
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-tertiary">6 hours ago</span>
              <button
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                style={{ backgroundColor: "#2DA5A0" }}
              >
                Acknowledge
              </button>
            </div>
          </div>
        )}

        {/* PREDICTION */}
        {visible.some((c) => c.type === "predictions") && (
          <div
            className="glass-v2 p-4 space-y-4"
            style={{ borderLeft: "3px solid #2DA5A0" }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "rgba(45,165,160,0.15)" }}
              >
                <Brain className="w-4 h-4" style={{ color: "#2DA5A0" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">
                  <Brain className="w-4 h-4 inline mr-1" strokeWidth={1.5} style={{ color: "#2DA5A0" }} /> Supplement response prediction: MTHFR+
                </p>
              </div>
            </div>

            <p className="text-xs text-secondary leading-relaxed">
              Based on 90 days of MTHFR+ supplementation with 78% compliance, predicted efficacy
              is HIGH (confidence: 85%). Your MTHFR CT + MTR AA variants suggest optimal
              methylfolate pathway support.
            </p>

            <div className="flex gap-2">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold"
                style={{ backgroundColor: "rgba(45,165,160,0.12)", color: "#2DA5A0" }}
              >
                MTHFR CT
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold"
                style={{ backgroundColor: "rgba(45,165,160,0.12)", color: "#2DA5A0" }}
              >
                MTR AA
              </span>
            </div>

            <p className="text-[11px] text-tertiary">
              Expected biomarker improvement: Homocysteine ↓ 15-20% at next lab check
            </p>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-tertiary">Yesterday</span>
            </div>
          </div>
        )}

        {/* RESOLVED */}
        {visible.some((c) => c.type === "resolved") && (
          <div
            className="glass-v2 p-4 space-y-4"
            style={{ borderLeft: "3px solid #22C55E", opacity: 0.7 }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "rgba(34,197,94,0.15)" }}
              >
                <CheckCircle className="w-4 h-4" style={{ color: "#22C55E" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">
                  <CheckCircle className="w-4 h-4 inline mr-1" strokeWidth={1.5} style={{ color: "#22C55E" }} /> Sleep debt recovered
                </p>
              </div>
            </div>

            <p className="text-xs text-secondary leading-relaxed">
              Your 3-day sleep debt of 4.2 hours has been fully recovered. Deep sleep averaged
              52 minutes this week.
            </p>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-tertiary">Resolved 2 days ago</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
