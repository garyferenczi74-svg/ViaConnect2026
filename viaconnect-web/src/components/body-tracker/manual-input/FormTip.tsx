'use client';

import { Info } from 'lucide-react';

export function FormTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-[#2DA5A0]/20 bg-[#2DA5A0]/5 px-3 py-2.5 text-xs text-white/70">
      <Info className="h-4 w-4 flex-none text-[#2DA5A0] mt-0.5" strokeWidth={1.5} />
      <span className="leading-snug">{children}</span>
    </div>
  );
}
