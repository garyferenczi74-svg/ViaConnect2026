'use client';

import { Info, ShieldAlert } from 'lucide-react';

/** Persistent accuracy disclaimer. NOT dismissible per standing rule. */
export function CalibrationDisclaimerBanner() {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-3 py-2.5 text-xs text-white/80 leading-relaxed">
        <Info className="h-4 w-4 flex-none text-[#2DA5A0] mt-0.5" strokeWidth={1.5} />
        <span>
          <span className="font-semibold text-white">AI body scanning provides ESTIMATES for trend tracking, not clinical measurements. </span>
          For the most accurate results, pair scans with manual inputs: use a reliable scale,
          take tape measurements monthly, input accurate height and weight, and get a
          professional scan (InBody, DEXA) once per year.
        </span>
      </div>
      <div className="flex items-start gap-2 rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/5 px-3 py-2 text-[11px] text-white/65 leading-relaxed">
        <ShieldAlert className="h-4 w-4 flex-none text-[#FCA5A5] mt-0.5" strokeWidth={1.5} />
        <span>
          <span className="font-semibold">Not a medical device. </span>
          ViaConnect AI body scanning is not FDA cleared or approved and is not intended to
          diagnose, treat, cure, or prevent any disease. All health decisions should be made
          with a qualified healthcare provider.
        </span>
      </div>
    </div>
  );
}
