"use client";

import { Users } from "lucide-react";
import { CIRCLES_EMPTY } from "@/lib/helix/consumer-honesty";

interface PatternCirclePreviewProps {
  userPatterns: string[];
}

export function PatternCirclePreview({ userPatterns }: PatternCirclePreviewProps) {
  void userPatterns;

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/8 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-teal-400/50" strokeWidth={1.5} />
        <h3 className="text-sm font-semibold text-white/50">Pattern Circles</h3>
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-400/10 text-orange-400/60 border border-orange-400/15 uppercase tracking-wider font-semibold">
          Coming Soon
        </span>
      </div>
      <p className="text-xs text-white/25 mb-4">{CIRCLES_EMPTY}</p>
      <button
        disabled
        title="Coming soon. Notify Me does not join a live circle."
        className="text-[10px] text-white/15 px-3 py-1 rounded-full border border-white/8 cursor-not-allowed"
      >
        Notify Me
      </button>
    </div>
  );
}
