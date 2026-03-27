'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';

interface GeneticInsightCardProps {
  gene: string;
  variant: string;
  rsId: string;
  genotype: string;
  impact: 'Low' | 'Moderate' | 'High';
  insight: string;
  relatedProduct?: string;
  productAction?: () => void;
}

const impactStyles: Record<string, string> = {
  Low: 'bg-green-500/15 text-green-400',
  Moderate: 'bg-amber-500/15 text-amber-400',
  High: 'bg-red-500/15 text-red-400',
};

export function GeneticInsightCard({
  gene,
  variant,
  rsId,
  genotype,
  impact,
  insight,
  relatedProduct,
  productAction,
}: GeneticInsightCardProps) {
  return (
    <div className="glass-v2-insight p-6 rounded-2xl">
      {/* Top row: Gene badge, variant/rsId, genotype */}
      <div className="flex items-center flex-wrap gap-3">
        <span className="bg-[#2DA5A0]/15 text-[#2DA5A0] rounded-lg px-3 py-1 font-semibold text-sm">
          {gene}
        </span>
        <span className="font-mono text-sm text-teal-300">
          {variant} &middot; {rsId}
        </span>
        <span className="bg-slate-800 text-white rounded px-2 py-0.5 font-mono text-sm">
          {genotype}
        </span>
      </div>

      {/* Impact indicator row */}
      <div className="flex items-center gap-2 mt-3">
        <span
          className={`rounded-full px-3 py-0.5 text-xs font-semibold ${impactStyles[impact]}`}
        >
          {impact}
        </span>
        <span className="text-caption text-secondary">Impact</span>
      </div>

      {/* Insight text */}
      <p className="text-body-md text-primary mt-3 leading-relaxed">
        {insight}
      </p>

      {/* Related product button */}
      {relatedProduct && (
        <button
          onClick={productAction}
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#2DA5A0] to-[#238E8A] hover:brightness-110 transition-all"
        >
          View {relatedProduct}
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
