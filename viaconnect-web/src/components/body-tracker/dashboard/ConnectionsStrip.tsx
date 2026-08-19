'use client';

import Link from 'next/link';
import { Check, Plus } from 'lucide-react';
import {
  CROSS_REFERENCE_SOURCE_LABELS,
  type ConfidenceTier,
  type CrossReferenceAvailability,
  type CrossReferenceSourceId,
} from '@/lib/body-tracker/cross-reference';
import { BentoTile } from '@/components/ui/BentoTile';

const ORDER: CrossReferenceSourceId[] = [
  'body_tracker',
  'supplements',
  'wearable',
  'app',
  'caq',
  'genetics',
];

const HREF: Record<CrossReferenceSourceId, string> = {
  body_tracker: '/body-tracker',
  supplements: '/supplements',
  wearable: '/body-tracker/connections',
  app: '/body-tracker/connections',
  caq: '/profile/assessment',
  genetics: '/genetics',
};

const CHIP_LABEL: Record<CrossReferenceSourceId, string> = {
  body_tracker: 'Body Tracker',
  supplements: 'My Supplements',
  wearable: 'Wearable',
  app: 'App',
  caq: 'Assessment',
  genetics: 'GeneX360',
};

interface ConnectionsStripProps {
  availability: CrossReferenceAvailability;
  tier: ConfidenceTier;
}

export function ConnectionsStrip({ availability, tier }: ConnectionsStripProps) {
  const unlock =
    tier.tier < 3
      ? 'Genetic data unlocks Tier 3, 96 percent'
      : 'Tier 3 unlocked';

  return (
    <BentoTile
      className="min-h-[88px] rounded-[20px] lg:col-span-12"
      contentClassName="gap-3"
      scrim={false}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
          Cross-Reference Sources
        </span>
        <span className="text-xs text-white/70">
          {tier.label}, {tier.pct} percent
          <span className="mx-2 text-white/30">·</span>
          <span className="text-white/50">{unlock}</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {ORDER.map((id) => {
          const connected = Boolean(availability[availabilityKey(id)]);
          return (
            <Link
              key={id}
              href={HREF[id]}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs text-white/80 transition hover:border-[#2DA5A0]/40"
              aria-label={`${CHIP_LABEL[id]}: ${connected ? 'connected' : 'add'}`}
            >
              {connected ? (
                <Check className="h-3.5 w-3.5 text-[#2DA5A0]" strokeWidth={1.5} />
              ) : (
                <Plus className="h-3.5 w-3.5 text-white/50" strokeWidth={1.5} />
              )}
              {CHIP_LABEL[id]}
              <span className="sr-only">{CROSS_REFERENCE_SOURCE_LABELS[id]}</span>
            </Link>
          );
        })}
      </div>
    </BentoTile>
  );
}

function availabilityKey(
  id: CrossReferenceSourceId,
): keyof CrossReferenceAvailability {
  switch (id) {
    case 'body_tracker':
      return 'bodyTracker';
    case 'supplements':
      return 'supplements';
    case 'wearable':
      return 'wearable';
    case 'app':
      return 'app';
    case 'caq':
      return 'caq';
    case 'genetics':
      return 'genetics';
  }
}
