"use client";

import { DISCLAIMERS } from "@/config/regulatory/disclaimers";
import { MapPin } from "lucide-react";

interface CanadaDisclaimerProps {
  className?: string;
}

export default function CanadaDisclaimer({ className = "" }: CanadaDisclaimerProps) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.03] p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <MapPin className="h-4 w-4 shrink-0 text-[#2DA5A0]/70 mt-0.5" strokeWidth={1.5} />
        <div>
          <p className="text-xs font-medium text-[#2DA5A0]/80 mb-1">Health Canada Notice</p>
          <p className="text-xs text-white/50 leading-relaxed">{DISCLAIMERS.canadaSpecific.text}</p>
        </div>
      </div>
    </div>
  );
}
