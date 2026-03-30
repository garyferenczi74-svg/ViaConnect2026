"use client";

import { RefreshCw } from "lucide-react";

interface QuickReassessmentCardProps {
  daysElapsed: number;
}

export function QuickReassessmentCard({ daysElapsed }: QuickReassessmentCardProps) {
  if (daysElapsed < 14) return null;

  const isReady = daysElapsed >= 30;

  return (
    <div className="rounded-xl bg-teal-400/[0.03] border border-teal-400/10 p-4 md:p-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div className="absolute blur-lg -inset-1 rounded-2xl opacity-60" style={{ backgroundColor: "#2DA5A033" }} />
          <div className="relative w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2DA5A033, #2DA5A01A, transparent)", border: "1px solid #2DA5A026" }}>
            <RefreshCw className="w-4 h-4 text-teal-400" strokeWidth={1.5} />
          </div>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white">
            {isReady ? "30-day check-in ready" : `${30 - daysElapsed} days until check-in`}
          </h4>
          <p className="text-xs text-white/30 mt-0.5">
            {isReady
              ? "Quick 2-min reassessment \u2014 see how your patterns are shifting"
              : "Your next assessment will track pattern changes"}
          </p>
        </div>
        {isReady && (
          <a
            href="/onboarding/i-caq-intro"
            className="min-h-[44px] px-4 py-2 rounded-lg bg-teal-400/15 border border-teal-400/30 text-teal-400 text-xs font-medium hover:bg-teal-400/20 transition-colors flex items-center gap-2"
          >
            Check In
          </a>
        )}
      </div>
    </div>
  );
}
