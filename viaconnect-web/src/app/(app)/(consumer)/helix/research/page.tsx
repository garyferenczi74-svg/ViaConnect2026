'use client';

import { Microscope, ShieldCheck } from 'lucide-react';
import { GlassCard } from '@/components/helix/GlassCard';
import { RESEARCH_EMPTY } from '@/lib/helix/consumer-honesty';

export default function ResearchPage() {
  return (
    <div className="flex flex-col gap-6">
      <GlassCard glow>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2DA5A0]/10 border border-[#2DA5A0]/20 mb-5">
          <ShieldCheck size={12} strokeWidth={1.5} className="text-[#2DA5A0]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#2DA5A0]">
            Consent is not live
          </span>
        </div>

        <h2 className="flex items-center gap-2 text-[20px] font-extrabold text-[#B75E18] mb-2">
          <Microscope size={20} strokeWidth={1.5} className="text-[#B75E18]" />
          Share for Science
        </h2>
        <p className="text-[13px] text-white/40 leading-relaxed mb-4">
          Opt in to share anonymized health data with researchers. Enrollment appears when a
          real research-consent row exists.
        </p>
        <p className="text-sm text-white/45">{RESEARCH_EMPTY}</p>
      </GlassCard>
    </div>
  );
}
