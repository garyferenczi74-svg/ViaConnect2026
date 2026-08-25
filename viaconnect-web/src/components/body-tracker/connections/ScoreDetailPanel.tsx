'use client';

import { Info } from 'lucide-react';
import type { DimensionSourceRow } from '@/lib/body-tracker/source-disagreement';
import {
  SCORE_DETAIL_DIMENSIONS,
  namedWearableContributorCount,
  resolveConnectionsBosDisplay,
} from '@/lib/body-tracker/wearable-tiles';
import { ConnectionsBosDial } from './ConnectionsBosDial';
import { ContributorColumn } from './ContributorColumn';
import {
  EMPTY_BEDTIME_STRIP,
  type BedtimeStripView,
} from '@/lib/body-tracker/sleep-bedtime-strip';
import {
  EMPTY_HABIT_SLEEP_PAIR,
  type HabitSleepPairView,
} from '@/lib/body-tracker/habit-sleep-pair';
import { SleepBedtimeStrip } from './SleepBedtimeStrip';
import { HabitSleepPair } from './HabitSleepPair';

function unknownSleepRow(): DimensionSourceRow {
  return {
    dimension: 'sleep',
    source: null,
    value: null,
    displayValue: 'UNKNOWN',
    status: 'pending',
    showRing: false,
    manual: false,
    disagreement: null,
    sources: [],
  };
}

export function lockScoreDetailRows(
  rows: DimensionSourceRow[],
  options?: { lastSyncSynced?: boolean },
): DimensionSourceRow[] {
  const lastSyncSynced = options?.lastSyncSynced === true;
  return SCORE_DETAIL_DIMENSIONS.map((dimension) => {
    if (dimension === 'sleep' && !lastSyncSynced) {
      return unknownSleepRow();
    }
    const found = rows.find((r) => r.dimension === dimension);
    if (found) return found;
    return {
      dimension,
      source: null,
      value: null,
      displayValue: 'UNKNOWN',
      status: 'pending',
      showRing: false,
      manual: false,
      disagreement: null,
      sources: [],
    };
  });
}

// Prompt 230 follow-up (contributor 7-dim gate): the contributor column and
// the DimensionDetailSheet must surface ALL 7 MetricKey rows -- Task 7b added
// hrv / resting_hr / steps -- with only the Sleep row gated to UNKNOWN until a
// real last-sync. lockScoreDetailRows above collapses to the 4 BOS display
// dims and exists only for the composite-ring count; feeding it to the column
// silently hid the 3 Task-7b rows even when real data existed. This keeps every
// row and gates Sleep alone, exactly as lockScoreDetailRows gates it.
export function gateSleepContributorRows(
  rows: DimensionSourceRow[],
  options?: { lastSyncSynced?: boolean },
): DimensionSourceRow[] {
  if (options?.lastSyncSynced === true) return rows;
  return rows.map((row) => (row.dimension === 'sleep' ? unknownSleepRow() : row));
}

interface ScoreDetailPanelProps {
  rows: DimensionSourceRow[];
  lastUpdatedAt: string | null;
  onOpenDimension?: (metric: string) => void;
  bedtimeStrip?: BedtimeStripView;
  habitSleepPair?: HabitSleepPairView;
}

export function ScoreDetailPanel({
  rows,
  onOpenDimension,
  bedtimeStrip = EMPTY_BEDTIME_STRIP,
  habitSleepPair = EMPTY_HABIT_SLEEP_PAIR,
}: ScoreDetailPanelProps) {
  const lastSyncSynced = bedtimeStrip.sleepTileSynced === true;
  const locked = lockScoreDetailRows(rows, { lastSyncSynced });
  const contributorRows = gateSleepContributorRows(rows, { lastSyncSynced });
  const named = namedWearableContributorCount(locked);
  const composite = resolveConnectionsBosDisplay(named);

  return (
    <section
      aria-labelledby="bos-detail-title"
      data-bos-card="connections"
      className="relative rounded-[24px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.07)] p-4 backdrop-blur-md sm:p-5 h-full flex flex-col"
    >
      <div className="flex items-center gap-2">
        <h2 id="bos-detail-title" className="text-lg font-bold text-white">
          Bio Optimization Score
        </h2>
        <Info className="h-3.5 w-3.5 text-white/40" strokeWidth={1.5} aria-hidden />
      </div>

      <ConnectionsBosDial composite={composite} />

      <ContributorColumn rows={contributorRows} onOpenDimension={onOpenDimension ?? (() => undefined)} />

      <article
        data-dimension="sleep"
        data-bedtime-strip={bedtimeStrip.kind}
        data-habit-sleep-pair={habitSleepPair.kind}
      >
        <SleepBedtimeStrip strip={bedtimeStrip} />
        <HabitSleepPair pair={habitSleepPair} />
      </article>

      <p className="mt-auto pt-2 text-center text-[10px] text-white/40">Missing stays UNKNOWN, never 0.</p>
    </section>
  );
}
