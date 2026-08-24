// Contributor catalog for the eight marketing chips.
// DISPLAY only. Live rows stay pending until Brief 12 honest sync.
// Does not read last_sync_at. Does not rewrite score math.

import {
  MARKETING_CHIP_KEYS,
  MARKETING_CHIP_LABELS,
  type MarketingChipKey,
} from './keys';
import { MORNING_CONTRIBUTOR_PENDING_VALUE } from './copy';
import {
  sourceStatusUntilBrief12,
  type MorningSourceStatus,
} from './source-status';

export interface MorningContributor {
  id: string;
  name: string;
  sourceStatus: MorningSourceStatus;
  displayValue: string;
}

export interface MorningChipView {
  key: MarketingChipKey;
  label: string;
  sourceStatus: MorningSourceStatus;
  contributors: MorningContributor[];
}

export const MARKETING_CHIP_CONTRIBUTORS: Record<
  MarketingChipKey,
  readonly { id: string; name: string }[]
> = {
  recovery: [
    { id: 'whoop', name: 'Whoop' },
    { id: 'oura', name: 'Oura' },
  ],
  sleep: [
    { id: 'whoop', name: 'Whoop' },
    { id: 'oura', name: 'Oura' },
    { id: 'apple_health', name: 'Apple Health' },
  ],
  strain: [{ id: 'whoop', name: 'Whoop' }],
  regimen: [{ id: 'protocol', name: 'Protocol' }],
  nutrients: [{ id: 'nutrition_log', name: 'Nutrition log' }],
  symptoms: [{ id: 'daily_checkin', name: 'Daily check-in' }],
  metabolic: [
    { id: 'hume', name: 'Hume' },
    { id: 'apple_health', name: 'Apple Health' },
  ],
  immune: [{ id: 'labs', name: 'Labs' }],
};

function pendingContributor(id: string, name: string): MorningContributor {
  return {
    id,
    name,
    sourceStatus: sourceStatusUntilBrief12(),
    displayValue: MORNING_CONTRIBUTOR_PENDING_VALUE,
  };
}

/** Live morning-card chips. Every source is pending until Brief 12. */
export function buildMorningChips(): MorningChipView[] {
  return MARKETING_CHIP_KEYS.map((key) => {
    const contributors = MARKETING_CHIP_CONTRIBUTORS[key].map((c) =>
      pendingContributor(c.id, c.name),
    );
    return {
      key,
      label: MARKETING_CHIP_LABELS[key],
      sourceStatus: sourceStatusUntilBrief12(),
      contributors,
    };
  });
}

export function chipByKey(
  chips: readonly MorningChipView[],
  key: MarketingChipKey,
): MorningChipView | null {
  return chips.find((c) => c.key === key) ?? null;
}
