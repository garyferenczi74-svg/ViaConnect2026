"use client";

import { useState } from "react";

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

  return (
    <div className="min-h-screen p-6 lg:p-8 space-y-8" style={{ background: "var(--gradient-hero)" }}>
      <section className="space-y-2">
        <h1 className="text-heading-1" style={{ color: "#B75E18" }}>
          Alerts &amp; Predictions
        </h1>
        <p className="text-body-sm text-secondary">
          AI-powered health intelligence from your genetic profile and biometric data.
        </p>
      </section>

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

      <div className="glass-v2 p-6 space-y-2">
        <p className="text-sm font-semibold text-white">Not analyzed</p>
        <p className="text-xs text-secondary leading-relaxed">
          Not enough data. Alerts appear when a real genotype or biometric row exists.
          This feed does not invent variants, HRV, temperature, or sleep numbers.
        </p>
      </div>
    </div>
  );
}
