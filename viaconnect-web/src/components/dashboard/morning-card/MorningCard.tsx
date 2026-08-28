'use client';

// Score-first morning card: Bio Optimization Score from blendHannahBos +
// ConnectionsBosDial (Brief 56). Protocol lives on TodaysProtocol lower on
// the dashboard. Seven contributor chips sit in one In today's score row
// under the honesty sentence. Rewards gamification stays off this card.

import { useMemo, useState } from 'react';
import { useDailyScheduleView } from '@/hooks/useDailyScheduleView';
import { useSleepTileSynced } from '@/hooks/useSleepTileSynced';
import { resolveHabitSleepPair } from '@/lib/body-tracker/habit-sleep-pair';
import { HabitSleepPair } from '@/components/body-tracker/connections/HabitSleepPair';
import { ConnectionsBosDial } from '@/components/body-tracker/connections/ConnectionsBosDial';
import { BOS_UNKNOWN_NEVER_ZERO_COPY } from '@/lib/body-tracker/wearable-tiles';
import { useHannahBosDisplay } from '@/hooks/useHannahBosDisplay';
import {
  MORNING_CARD_ARIA_LABEL,
  MORNING_CARD_SCORE_LABEL,
} from '@/lib/dashboard/morning-card/copy';
import { useWearableTilesSnapshot } from '@/hooks/useWearableTilesSnapshot';
import { buildMorningChips, chipByKey } from '@/lib/dashboard/morning-card/contributors';
import { type MorningChipKey } from '@/lib/dashboard/morning-card/keys';
import { MorningChipGrid } from './MorningChipGrid';
import { MorningContributorList } from './MorningContributorList';

export function MorningCard() {
  const schedule = useDailyScheduleView();
  const sleepTileSynced = useSleepTileSynced();
  const wearableSnapshot = useWearableTilesSnapshot();
  const hannahBos = useHannahBosDisplay();
  const habitSleepPair = resolveHabitSleepPair({
    sleepTileSynced,
    schedule: schedule.status === 'ready' ? schedule.view : null,
  });
  const chips = useMemo(
    () =>
      buildMorningChips({
        scoreDetail: wearableSnapshot.scoreDetail,
        lastSyncSynced: sleepTileSynced,
      }),
    [wearableSnapshot.scoreDetail, sleepTileSynced],
  );
  const [selectedKey, setSelectedKey] = useState<MorningChipKey | null>(null);

  const selectedChip = selectedKey ? chipByKey(chips, selectedKey) : null;
  const composite = hannahBos.display;
  const toggleChip = (key: MorningChipKey) => {
    setSelectedKey((prev) => (prev === key ? null : key));
  };

  return (
    <section
      aria-label={MORNING_CARD_ARIA_LABEL}
      data-morning-card="true"
      data-bos-card="dashboard"
      data-home-beat="bos"
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-[rgba(255,255,255,0.035)] p-5 backdrop-blur-sm sm:p-6 md:p-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-10 blur-3xl"
        style={{ backgroundColor: '#2DA5A0' }}
      />

      <div className="relative flex flex-col gap-5 md:gap-6">
        <div className="grid grid-cols-1 justify-items-center gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:grid-rows-[auto_auto] md:items-center md:justify-items-stretch md:gap-x-10 md:gap-y-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/85 md:col-start-1 md:row-start-1">
            {MORNING_CARD_SCORE_LABEL}
          </p>
          <div className="md:col-start-1 md:row-start-2">
            <ConnectionsBosDial composite={composite} brightReadout />
          </div>
          <div className="flex w-full min-w-0 flex-col items-center justify-center gap-2 text-center md:col-start-2 md:row-start-2 md:self-center">
            <p
              className="text-center text-sm leading-relaxed text-white"
              data-bos-honesty="centered"
            >
              {hannahBos.sentence}
            </p>
            <MorningChipGrid
              chips={chips}
              selectedKey={selectedKey}
              onSelect={toggleChip}
            />
            {hannahBos.result.chips.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-1.5">
                {hannahBos.result.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/90"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-center text-[10px] text-white/80">
                {BOS_UNKNOWN_NEVER_ZERO_COPY}
              </p>
            )}
          </div>
        </div>

        <HabitSleepPair pair={habitSleepPair} />

        {selectedChip ? <MorningContributorList chip={selectedChip} /> : null}
      </div>
    </section>
  );
}
