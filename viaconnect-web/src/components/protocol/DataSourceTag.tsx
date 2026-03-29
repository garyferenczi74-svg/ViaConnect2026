"use client";

type DataSource = "caq" | "lab_validated" | "lab_adjusted" | "genetic_optimized" | "genetic_triggered" | "interaction_safe" | "interaction_flagged";

const TAG_STYLES: Record<DataSource, { label: string; className: string } | null> = {
  caq: null, // Default, no tag shown
  lab_validated: { label: "Lab \u2713", className: "bg-teal-400/15 border-teal-400/30 text-teal-400" },
  lab_adjusted: { label: "Lab-Adjusted", className: "bg-teal-400/15 border-teal-400/30 text-teal-400" },
  genetic_optimized: { label: "Gene \u2713", className: "bg-orange-400/15 border-orange-400/30 text-orange-400" },
  genetic_triggered: { label: "Genetic", className: "bg-orange-400/15 border-orange-400/30 text-orange-400" },
  interaction_safe: null, // No tag needed
  interaction_flagged: { label: "\u26a0\ufe0f Interaction", className: "bg-yellow-400/15 border-yellow-400/30 text-yellow-400" },
};

export function DataSourceTag({ source }: { source: DataSource }) {
  const style = TAG_STYLES[source];
  if (!style) return null;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${style.className}`}>
      {style.label}
    </span>
  );
}
