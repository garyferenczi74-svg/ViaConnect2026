"use client";

import { ShieldCheck } from "lucide-react";

interface UltrathinkTrustBadgeProps {
  className?: string;
}

export function UltrathinkTrustBadge({ className = "" }: UltrathinkTrustBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/8 ${className}`}>
      <ShieldCheck className="w-3 h-3 text-teal-400/50" strokeWidth={1.5} />
      <span className="text-[10px] text-white/30 font-medium">
        Backed by 14 specialty lenses
      </span>
    </div>
  );
}
