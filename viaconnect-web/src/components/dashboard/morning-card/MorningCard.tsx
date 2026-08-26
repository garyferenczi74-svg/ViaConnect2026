'use client';

// Score-first morning card: Bio Optimization Score from the Connections
// BOS SSOT (resolveConnectionsBosDisplay + ConnectionsBosDial). One
// TodaysProtocol action, seven Connections contributor chips as DISPLAY only.
// Rewards gamification stays off this card. Chip/detail use last-sync SSOT.

import { useEffect, useMemo, useState } from 'react';
import { useDailyScheduleView } from '@/hooks/useDailyScheduleView';
import { useSleepTileSynced } from '@/hooks/useSleepTileSynced';
import { resolveHabitSleepPair } from '@/lib/body-tracker/habit-sleep-pair';
import { HabitSleepPair } from '@/components/body-tracker/connections/HabitSleepPair';
import { ConnectionsBosDial } from '@/components/body-tracker/connections/ConnectionsBosDial';
import {
  BOS_UNKNOWN_NEVER_ZERO_COPY,
  namedWearableContributorCount,
  resolveConnectionsBosDisplay,
} from '@/lib/body-tracker/wearable-tiles';
import {
  MORNING_CARD_ARIA_LABEL,
  MORNING_CARD_SCORE_LABEL,
} from '@/lib/dashboard/morning-card/copy';
import { useWearableTilesSnapshot } from '@/hooks/useWearableTilesSnapshot';
import { buildMorningChips, chipByKey } from '@/lib/dashboard/morning-card/contributors';
import { type MorningChipKey } from '@/lib/dashboard/morning-card/keys';
import {
  PROTOCOL_CTA_LOADING_BOUND_MS,
  firstIncompleteProtocolAction,
  type MorningProtocolBuckets,
  type MorningProtocolItem,
} from '@/lib/dashboard/morning-card/protocol-cta';
import { MorningChipGrid } from './MorningChipGrid';
import { MorningContributorList } from './MorningContributorList';
import { MorningProtocolCtaButton } from './MorningProtocolCta';

function bucketsFromView(
  view: ReturnType<typeof useDailyScheduleView>['view'],
): MorningProtocolBuckets {
  const toItem = (
    card: (typeof view.morning)[number],
  ): MorningProtocolItem => ({
    slotId: card.slot_id,
    userSupplementId: card.user_supplement_id,
    name: card.name,
    dose: card.dose,
    timeOfDay: card.time_of_day,
    taken: card.taken,
  });
  return {
    morning: view.morning.map(toItem),
    afternoon: view.afternoon.map(toItem),
    evening: view.evening.map(toItem),
  };
}

export function MorningCard() {
  const schedule = useDailyScheduleView();
  const sleepTileSynced = useSleepTileSynced();
  const wearableSnapshot = useWearableTilesSnapshot();
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
  const [taking, setTaking] = useState(false);
  const [loadingElapsedMs, setLoadingElapsedMs] = useState(0);

  useEffect(() => {
    if (schedule.status !== 'loading') {
      setLoadingElapsedMs(0);
      return;
    }
    setLoadingElapsedMs(0);
    const id = window.setTimeout(() => {
      setLoadingElapsedMs(PROTOCOL_CTA_LOADING_BOUND_MS);
    }, PROTOCOL_CTA_LOADING_BOUND_MS);
    return () => window.clearTimeout(id);
  }, [schedule.status]);

  const cta = firstIncompleteProtocolAction(
    schedule.status === 'ready' ? bucketsFromView(schedule.view) : null,
    { status: schedule.status, loadingElapsedMs },
  );
  const selectedChip = selectedKey ? chipByKey(chips, selectedKey) : null;
  const composite = resolveConnectionsBosDisplay(
    namedWearableContributorCount(wearableSnapshot.scoreDetail),
  );

  async function handleTake(): Promise<void> {
    if (cta.kind !== 'action' || !cta.item) return;
    setTaking(true);
    try {
      await schedule.toggleTaken({
        slotId: cta.item.slotId,
        userSupplementId: cta.item.userSupplementId,
        timeOfDay: cta.item.timeOfDay,
        nextTaken: true,
      });
    } finally {
      setTaking(false);
    }
  }

  return (
    <section
      aria-label={MORNING_CARD_ARIA_LABEL}
      data-morning-card="true"
      data-bos-card="dashboard"
      data-home-beat="bos"
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1E3054]/60 via-[#1A2744]/60 to-[#141E33]/60 p-5 sm:p-6 md:p-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: '#2DA5A0' }}
      />

      <div className="relative flex flex-col gap-5 md:gap-6">
        <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-end md:gap-10">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {MORNING_CARD_SCORE_LABEL}
            </p>
            <ConnectionsBosDial composite={composite} />
          </div>
          <div data-home-beat="protocol">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Today protocol
            </p>
            <MorningProtocolCtaButton
              cta={cta}
              onTake={handleTake}
              onRetry={schedule.refresh}
              taking={taking}
            />
          </div>
        </div>

        <MorningChipGrid
          chips={chips}
          selectedKey={selectedKey}
          onSelect={(key) => setSelectedKey((prev) => (prev === key ? null : key))}
        />

        <HabitSleepPair pair={habitSleepPair} />

        {selectedChip ? <MorningContributorList chip={selectedChip} /> : null}

        <p className="text-center text-[10px] text-white/40">{BOS_UNKNOWN_NEVER_ZERO_COPY}</p>
      </div>
    </section>
  );
}
