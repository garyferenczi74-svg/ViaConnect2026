// Contributor chips for the morning card. Same 7 CONTRIBUTOR_METRICS
// and last-sync gate as Connections (wearable-tiles / scoreDetail /
// buildContributorRows). Coming soon or not connected stays UNKNOWN
// or Connect your device. Never invents HRV/RHR or last-sync.

import type { DimensionSourceRow } from '@/lib/body-tracker/source-disagreement';
import {
  buildContributorRows,
  matchRowForMetric,
  type ContributorMetric,
} from '@/lib/body-tracker/contributor-rows';
import { WEARABLE_TILE_SPECS } from '@/lib/body-tracker/wearable-tiles';
import {
  MORNING_CHIP_KEYS,
  MORNING_CHIP_LABELS,
  type MorningChipKey,
} from './keys';
import {
  MORNING_CONNECTIONS_HREF,
  MORNING_CONNECT_YOUR_DEVICE,
  MORNING_CONTRIBUTOR_PENDING_VALUE,
} from './copy';
import {
  classifySourceStatus,
  type MorningSourceStatus,
} from './source-status';

export interface MorningContributor {
  id: string;
  name: string;
  sourceStatus: MorningSourceStatus;
  displayValue: string;
  href: string;
}

export interface MorningChipView {
  key: MorningChipKey;
  label: string;
  sourceStatus: MorningSourceStatus;
  displayValue: string;
  href: string;
  contributors: MorningContributor[];
}

export interface BuildMorningChipsInput {
  scoreDetail?: DimensionSourceRow[];
  lastSyncSynced?: boolean;
}

function unknownSleepRow(): DimensionSourceRow {
  return {
    dimension: 'sleep',
    source: null,
    value: null,
    displayValue: MORNING_CONTRIBUTOR_PENDING_VALUE,
    status: 'pending',
    showRing: false,
    manual: false,
    disagreement: null,
    sources: [],
  };
}

function gateSleepContributorRows(
  rows: DimensionSourceRow[],
  lastSyncSynced: boolean,
): DimensionSourceRow[] {
  if (lastSyncSynced) return rows;
  return rows.map((row) => (row.dimension === 'sleep' ? unknownSleepRow() : row));
}

function sourceName(id: string): string {
  const spec = WEARABLE_TILE_SPECS.find((row) => row.id === id);
  return spec?.name ?? id;
}

function honestDisplayValue(value: string | null | undefined): string {
  if (typeof value !== 'string') return MORNING_CONTRIBUTOR_PENDING_VALUE;
  const trimmed = value.trim();
  if (trimmed.length === 0) return MORNING_CONTRIBUTOR_PENDING_VALUE;
  return trimmed;
}

export function buildMorningChips(input: BuildMorningChipsInput = {}): MorningChipView[] {
  const gated = gateSleepContributorRows(input.scoreDetail ?? [], input.lastSyncSynced === true);
  const rows = buildContributorRows(gated);

  return rows.map((row) => {
    const key = row.metric as MorningChipKey;
    const matched = matchRowForMetric(row.metric as ContributorMetric, gated);
    const connected = row.connectedSource !== null;
    const disagree = connected && matched?.disagreement?.showDisagreeChrome === true;
    const sourceStatus = classifySourceStatus({
      hasNamedSource: connected,
      devicesDisagree: disagree,
    });
    const displayValue = connected
      ? honestDisplayValue(matched?.displayValue)
      : MORNING_CONTRIBUTOR_PENDING_VALUE;
    const contributors: MorningContributor[] = connected && row.connectedSource
      ? [
          {
            id: row.connectedSource,
            name: sourceName(row.connectedSource),
            sourceStatus,
            displayValue,
            href: MORNING_CONNECTIONS_HREF,
          },
        ]
      : [
          {
            id: 'connect',
            name: MORNING_CONNECT_YOUR_DEVICE,
            sourceStatus: 'pending',
            displayValue: MORNING_CONTRIBUTOR_PENDING_VALUE,
            href: MORNING_CONNECTIONS_HREF,
          },
        ];

    return {
      key,
      label: MORNING_CHIP_LABELS[key] ?? row.label,
      sourceStatus,
      displayValue,
      href: MORNING_CONNECTIONS_HREF,
      contributors,
    };
  });
}

export function chipByKey(
  chips: readonly MorningChipView[],
  key: MorningChipKey,
): MorningChipView | null {
  return chips.find((c) => c.key === key) ?? null;
}

export const MORNING_CHIP_ORDER = MORNING_CHIP_KEYS;
