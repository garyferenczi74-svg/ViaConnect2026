'use client';

import { Award, ScanLine, Dna } from 'lucide-react';
import { BIO_OPTIMIZATION_SCORE_LABEL } from '@/lib/body-tracker/scan-constants';
import { TIER_BADGE_META } from '@/lib/body-tracker/scan-tier';
import type { ScanTier } from '@/lib/body-tracker/scan-tier';

interface TierBadgeProps {
  tier: ScanTier;
  bosDelta?: number | null;
}

const ICON_MAP = {
  Award,
  ScanLine,
  Dna,
} as const;

const TIER_COLOR: Record<ScanTier, { bg: string; border: string; text: string }> = {
  1: { bg: 'rgba(45,165,160,0.12)',  border: 'rgba(45,165,160,0.35)',  text: '#2DA5A0' },
  2: { bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.35)',  text: '#60A5FA' },
  3: { bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)', text: '#A78BFA' },
};

export function TierBadge({ tier, bosDelta }: TierBadgeProps) {
  const meta   = TIER_BADGE_META[tier];
  const colors = TIER_COLOR[tier];
  const Icon   = ICON_MAP[meta.lucideIconName];

  const deltaSign   = bosDelta != null && bosDelta > 0 ? '+' : '';
  const deltaColor  = bosDelta == null ? '#9CA3AF' : bosDelta > 0 ? '#22C55E' : bosDelta < 0 ? '#F97316' : '#9CA3AF';

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
      style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} style={{ color: colors.text }} />
      <span className="text-xs font-semibold" style={{ color: colors.text }}>
        {meta.label}
      </span>
      {bosDelta != null && (
        <span className="text-[10px] font-medium" style={{ color: deltaColor }}>
          {BIO_OPTIMIZATION_SCORE_LABEL}: {deltaSign}{bosDelta.toFixed(1)}
        </span>
      )}
    </div>
  );
}
