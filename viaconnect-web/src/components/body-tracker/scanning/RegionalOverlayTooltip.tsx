'use client';

// RegionalOverlayTooltip  the region-tap tooltip for the Phase 1 regional
// composition overlay (ViaConnect Prompt #169e(a), Section 6.2). Shows, for a
// tapped region: the region name, estimated fat mass (X.X kg), estimated share
// (X.X percent), and the line "Based on sex-typical distribution". No dashes, no
// emojis, ASCII only ("percent" spelled out, never a >= glyph).

import type { BodyRegion } from '@/lib/body-tracker/regional-distribution-ratios';
import type { RegionDistributionEntry } from '@/lib/body-tracker/regional-fat-distribution';

const REGION_LABEL: Record<BodyRegion, string> = {
  trunk: 'Trunk',
  arms: 'Arms',
  legs: 'Legs',
  head_neck: 'Head and neck',
};

export function regionLabel(region: BodyRegion): string {
  return REGION_LABEL[region];
}

interface RegionalOverlayTooltipProps {
  entry: RegionDistributionEntry;
  /** Whether the user is hiding specific numbers (#169b numbers-optional). */
  hideNumbers?: boolean;
  className?: string;
}

export function RegionalOverlayTooltip({
  entry,
  hideNumbers = false,
  className = '',
}: RegionalOverlayTooltipProps) {
  const fatKg = entry.fatMassKg.toFixed(1);
  const sharePct = (entry.share * 100).toFixed(1);
  return (
    <div
      role="tooltip"
      className={`rounded-xl border border-white/[0.1] bg-[#0B1520]/95 px-3 py-2 text-xs shadow-lg ${className}`}
    >
      <p className="font-semibold text-white">{regionLabel(entry.region)}</p>
      {hideNumbers ? (
        <p className="mt-0.5 text-white/55">Estimated regional distribution hidden</p>
      ) : (
        <dl className="mt-1 space-y-0.5 text-white/65">
          <div className="flex items-center justify-between gap-4">
            <dt>Estimated fat mass</dt>
            <dd className="tabular-nums text-white/80">{fatKg} kg</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt>Estimated share</dt>
            <dd className="tabular-nums text-white/80">{sharePct} percent</dd>
          </div>
        </dl>
      )}
      <p className="mt-1.5 text-[10px] text-white/40">Based on sex-typical distribution</p>
    </div>
  );
}
