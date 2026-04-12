'use client';

import Link from 'next/link';
import { Dna, ArrowRight } from 'lucide-react';
import type { ConfidenceTier } from '@/lib/agents/gordan/generateNutritionalGuide';

const TIER_STYLES: Record<ConfidenceTier, { border: string; bg: string; text: string }> = {
  1: { border: 'border-[#B75E18]/30', bg: 'bg-[#B75E18]/10', text: 'text-[#B75E18]' },
  2: { border: 'border-[#2DA5A0]/30', bg: 'bg-[#2DA5A0]/10', text: 'text-[#2DA5A0]' },
  3: { border: 'border-[#22C55E]/30', bg: 'bg-[#22C55E]/10', text: 'text-[#22C55E]' },
};

interface TierBannerProps {
  tier: ConfidenceTier;
  percent: number;
  sources: string[];
  generatedAt: string;
}

export function TierBanner({ tier, percent, sources, generatedAt }: TierBannerProps) {
  const style = TIER_STYLES[tier];
  const date = new Date(generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} p-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dna className={`h-5 w-5 ${style.text}`} strokeWidth={1.5} />
          <span className={`text-sm font-semibold ${style.text}`}>
            Tier {tier} Guide: {percent}% Confidence
          </span>
        </div>
        {tier < 3 && (
          <Link
            href="/genetics"
            className="flex items-center gap-1 text-xs text-[#2DA5A0] hover:text-[#2DA5A0]/80"
          >
            Unlock Tier {tier + 1}
            <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
          </Link>
        )}
      </div>
      <p className="mt-1 text-xs text-white/50">
        Based on: {sources.join(' + ')} · Updated {date}
      </p>
    </div>
  );
}
