'use client';

// Prompt #162 section 3.4: empty-day CTA. Tappable, switches to Log a Meal tab.

import { Info, ArrowRight } from 'lucide-react';

interface EmptyDayCtaProps {
  readonly onGoToLog: () => void;
}

export function EmptyDayCta({ onGoToLog }: EmptyDayCtaProps) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-4 w-4 flex-none text-[#2DA5A0]" strokeWidth={1.5} />
        <div className="flex-1">
          <p className="text-sm text-white/80">No logs yet for this day. Tap Log a Meal to start tracking.</p>
          <button
            type="button"
            onClick={onGoToLog}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/15 px-3 py-2 text-xs font-semibold text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/25 min-h-[40px]"
          >
            Go to Log a Meal
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
