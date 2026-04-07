'use client';

// PeptideTierHeader — section header for each distribution tier in the
// shop peptide catalog. Displays the tier icon, label, peptide count, and
// description with the appropriate accent color and practitioner notice.
// Reads tier metadata from PEPTIDE_TIERS in the peptide-database.

import {
  Shield,
  Stethoscope,
  FlaskConical,
  Microscope,
  type LucideIcon,
} from 'lucide-react';
import type { PeptideTierMeta } from '@/config/peptide-database/tiers';

const ICON_MAP: Record<string, LucideIcon> = {
  Shield,
  Stethoscope,
  FlaskConical,
  Microscope,
};

interface PeptideTierHeaderProps {
  tier: PeptideTierMeta;
  peptideCount: number;
}

export function PeptideTierHeader({ tier, peptideCount }: PeptideTierHeaderProps) {
  const Icon = ICON_MAP[tier.icon] ?? Shield;

  return (
    <div
      className="rounded-r-2xl border-l-4 bg-[rgba(255,255,255,0.03)] p-4 sm:p-5"
      style={{ borderLeftColor: tier.color }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10"
          style={{
            background: `${tier.color}1A`,
            border: `1px solid ${tier.color}40`,
          }}
        >
          <Icon
            className="h-4 w-4 sm:h-5 sm:w-5"
            strokeWidth={1.5}
            style={{ color: tier.color }}
          />
        </div>
        <h2 className="break-words text-sm font-bold sm:text-base" style={{ color: tier.color }}>
          {tier.label}
        </h2>
        <span
          className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${tier.badgeBg} ${tier.badgeText}`}
          style={{ borderColor: `${tier.color}40` }}
        >
          {peptideCount} {peptideCount === 1 ? 'peptide' : 'peptides'}
        </span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-[rgba(255,255,255,0.55)] sm:text-sm">
        {tier.description}
      </p>

      {tier.requiresPractitioner && (
        <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-medium sm:text-xs">
          <Stethoscope
            className="h-3 w-3 flex-shrink-0"
            strokeWidth={1.5}
            style={{ color: tier.color }}
          />
          <span style={{ color: tier.color }}>
            Practitioner guidance recommended for this tier
          </span>
        </div>
      )}
    </div>
  );
}
