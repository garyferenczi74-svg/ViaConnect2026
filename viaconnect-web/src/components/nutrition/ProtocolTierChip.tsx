'use client';

// Prompt #162 section 6.2: tier + confidence chip.
// Tier 0 = fallback (gray), 1 = CAQ only (gray), 2 = CAQ + lab (teal),
// 3 = CAQ + lab + genetic (orange premium).

import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';

interface ProtocolTierChipProps {
  readonly tier: 0 | 1 | 2 | 3;
  readonly confidence: number;
  readonly source: 'protocol_engine' | 'fallback';
}

interface ChipStyle {
  readonly border: string;
  readonly bg: string;
  readonly text: string;
  readonly label: string;
}

const TIER_STYLE: Record<number, ChipStyle> = {
  0: { border: 'rgba(255,255,255,0.10)', bg: 'rgba(255,255,255,0.04)', text: '#FFFFFFB8', label: 'Estimated' },
  1: { border: 'rgba(255,255,255,0.14)', bg: 'rgba(255,255,255,0.06)', text: '#FFFFFFCC', label: 'Protocol Tier 1' },
  2: { border: 'rgba(45,165,160,0.45)',  bg: 'rgba(45,165,160,0.12)', text: '#2DA5A0', label: 'Protocol Tier 2' },
  3: { border: 'rgba(183,94,24,0.45)',   bg: 'rgba(183,94,24,0.12)',  text: '#B75E18', label: 'Protocol Tier 3' },
};

function explanation(tier: 0 | 1 | 2 | 3, source: 'protocol_engine' | 'fallback'): string {
  if (source === 'fallback' || tier === 0) {
    return 'These are estimated targets based on a default profile. Complete your profile to refine them, then add lab and genetic data over time for a fully personalized protocol.';
  }
  if (tier === 1) {
    return 'Your protocol targets are calculated from your CAQ. Adding lab data improves accuracy.';
  }
  if (tier === 2) {
    return 'Your protocol targets are calculated from your CAQ and lab data. Adding genetic testing improves accuracy further.';
  }
  return 'Your protocol targets are calculated from your CAQ, lab data, and genetic results. This is the most personalized tier available.';
}

export function ProtocolTierChip({ tier, confidence, source }: ProtocolTierChipProps) {
  const [open, setOpen] = useState(false);
  const style = TIER_STYLE[tier] ?? TIER_STYLE[0];
  const pct = Math.round(confidence * 100);
  const label = source === 'fallback' ? 'Estimated' : style.label;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-90"
        style={{ borderColor: style.border, backgroundColor: style.bg, color: style.text }}
      >
        <Sparkles className="h-3 w-3" strokeWidth={1.5} />
        {label}
        <span className="text-white/45">,</span>
        <span className="tabular-nums">{pct}% confidence</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-white/[0.08] bg-[#1E3054] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-white">{label}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-white/45 transition-colors hover:text-white"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-white/70">{explanation(tier, source)}</p>
          </div>
        </div>
      )}
    </>
  );
}
