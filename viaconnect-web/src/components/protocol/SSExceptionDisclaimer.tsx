"use client";

import { DISCLAIMERS } from "@/config/regulatory/disclaimers";
import { ShieldAlert } from "lucide-react";

interface SSExceptionDisclaimerProps {
  className?: string;
}

export default function SSExceptionDisclaimer({ className = "" }: SSExceptionDisclaimerProps) {
  return (
    <div className={`rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400/80 mt-0.5" strokeWidth={1.5} />
        <div>
          <p className="text-xs font-medium text-amber-300/80 mb-1">SS-31 / Forzinity Regulatory Notice</p>
          <p className="text-xs text-white/50 leading-relaxed">{DISCLAIMERS.ssException.text}</p>
        </div>
      </div>
    </div>
  );
}
