"use client";

import { Hexagon, ArrowRight } from "lucide-react";

interface HelixPeptideCardProps {
  helixBalance: number;
}

export function HelixPeptideCard({ helixBalance }: HelixPeptideCardProps) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/8 p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div className="absolute blur-lg -inset-1 rounded-2xl opacity-60" style={{ backgroundColor: "#FBBF2433" }} />
          <div className="relative w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FBBF2433, #FBBF241A, transparent)", border: "1px solid #FBBF2426" }}>
            <Hexagon className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
          </div>
        </div>
        <div>
          <p className="text-xs text-white/25">Your Helix Balance</p>
          <p className="text-lg font-bold text-amber-400">{helixBalance.toLocaleString()} Helix</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <p className="text-xs text-teal-400/50">
          Earn 250 Helix this week by logging your first peptide dose (once prescribed)
        </p>
        <a href="/helix/arena" className="text-xs text-white/25 hover:text-white/40 transition-colors flex items-center gap-1 min-h-[36px] whitespace-nowrap">
          View Helix Rewards
          <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
        </a>
      </div>
    </div>
  );
}
