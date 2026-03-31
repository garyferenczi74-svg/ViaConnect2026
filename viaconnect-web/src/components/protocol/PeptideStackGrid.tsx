"use client";

import { PeptideProductCard } from "./PeptideProductCard";
import type { PeptideRecommendation } from "@/lib/ai/peptide-matching";

interface PeptideStackGridProps {
  recommendations: PeptideRecommendation[];
}

export function PeptideStackGrid({ recommendations }: PeptideStackGridProps) {
  return (
    <div>
      <h3 className="text-xs text-white/20 uppercase tracking-wider font-semibold mb-4">
        Your Peptide Stack
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((rec) => (
          <PeptideProductCard key={rec.id} recommendation={rec} />
        ))}
      </div>
    </div>
  );
}
