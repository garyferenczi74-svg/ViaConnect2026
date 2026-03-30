"use client";

import { Lightbulb } from "lucide-react";

interface DailyTip {
  content: string;
  sourcePattern: string;
}

interface DailyUltrathinkTipProps {
  tip: DailyTip;
}

export function DailyUltrathinkTip({ tip }: DailyUltrathinkTipProps) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
      <div className="flex items-start gap-3">
        <Lightbulb className="w-4 h-4 text-amber-400/60 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
        <div>
          <p className="text-xs text-white/25 uppercase tracking-wider font-semibold mb-1">
            Today&apos;s Insight
          </p>
          <p className="text-sm text-white/50 leading-relaxed">{tip.content}</p>
          <p className="text-[10px] text-white/15 mt-1">
            Based on your {tip.sourcePattern} pattern
          </p>
        </div>
      </div>
    </div>
  );
}
