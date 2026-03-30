"use client";

import { DISCLAIMERS } from "@/config/regulatory/disclaimers";
import { Shield } from "lucide-react";

interface WADAWarningProps {
  className?: string;
}

export default function WADAWarning({ className = "" }: WADAWarningProps) {
  return (
    <div className={`rounded-xl border border-red-500/20 bg-red-500/5 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <Shield className="h-4 w-4 shrink-0 text-red-400/80 mt-0.5" strokeWidth={1.5} />
        <div>
          <p className="text-xs font-medium text-red-300/80 mb-1">WADA Anti-Doping Notice</p>
          <p className="text-xs text-white/50 leading-relaxed">{DISCLAIMERS.athleteWADA.text}</p>
        </div>
      </div>
    </div>
  );
}
