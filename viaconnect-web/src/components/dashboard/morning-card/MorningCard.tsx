'use client';

// Score-first morning card: Bio Optimization Score from /api/bos/current,
// one TodaysProtocol action, seven Connections contributor chips as DISPLAY only.
// Rewards gamification stays off this card. Chip/detail use last-sync SSOT.

import { useMemo, useState } from 'react';
import { useBOSCurrent } from '@/hooks/use-bos-current';
import { useDailyScheduleView } from '@/hooks/useDailyScheduleView';
import { useSleepTileSynced } from '@/hooks/useSleepTileSynced';
import { resolveHabitSleepPair } from '@/lib/body-tracker/habit-sleep-pair';
import { HabitSleepPair } from '@/components/body-tracker/connections/HabitSleepPair';
import { BOS_INSUFFICIENT_DATA_COPY, resolveHonestBosDisplay } from '@/lib/scoring/bos-display';
import {
  MORNING_CARD_ARIA_LABEL,
  MORNING_CARD_PENDING_SCORE,
  MORNING_CARD_SCORE_LABEL,
  morningScoreAria,
} from '@/lib/dashboard/morning-card/copy';
import { useWearableTilesSnapshot } from '@/hooks/useWearableTilesSnapshot';
import { buildMorningChips, chipByKey } from '@/lib/dashboard/morning-card/contributors';
import { MORNING_CHIP_KEYS, type MorningChipKey } from '@/lib/dashboard/morning-card/keys';
import {
  firstIncompleteProtocolAction,
  type MorningProtocolBuckets,
  type MorningProtocolItem,
} from '@/lib/dashboard/morning-card/protocol-cta';
import { colorForScore, labelForScore, sentenceCase } from '../bos-gauge-helpers';
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
  const { data, error, isLoading, refetch } = useBOSCurrent();
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

  const cta = firstIncompleteProtocolAction(
    schedule.status === 'ready' ? bucketsFromView(schedule.view) : null,
    { status: schedule.status },
  );
  const selectedChip = selectedKey ? chipByKey(chips, selectedKey) : null;
  const honest = resolveHonestBosDisplay(data ?? { score: null, contributors: [] });
  const score = honest.score;
  const bandColor = score === null ? '#2DA5A0' : colorForScore(score);
  const bandLabel = score === null ? null : sentenceCase(labelForScore(score));

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

  if (isLoading && !data) {
    return (
      <section
        aria-busy="true"
        aria-label="Loading Bio Optimization Score"
        className="rounded-3xl border border-white/10 bg-[#1E3054]/60 p-5 sm:p-6 md:p-8"
      >
        <div className="h-3 w-40 animate-pulse rounded-full bg-white/10" />
        <div className="mt-4 h-16 w-28 animate-pulse rounded-xl bg-white/10" />
        <div className="mt-4 h-11 w-48 animate-pulse rounded-xl bg-white/10" />
        <div className="mt-4 grid grid-cols-4 gap-2 md:grid-cols-7">
          {MORNING_CHIP_KEYS.map((key) => (
            <div key={key} className="h-11 animate-pulse rounded-xl bg-white/10" />
          ))}
        </div>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section
        aria-label={MORNING_CARD_ARIA_LABEL}
        className="rounded-3xl border border-white/10 bg-[#1E3054]/60 p-5 sm:p-6 md:p-8"
      >
        <p className="text-sm text-white/70">Bio Optimization Score could not load.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 min-h-[44px] rounded-xl border border-[#2DA5A0]/40 px-4 py-2 text-sm text-[#2DA5A0]"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <section
      aria-label={MORNING_CARD_ARIA_LABEL}
      data-morning-card="true"
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1E3054]/60 via-[#1A2744]/60 to-[#141E33]/60 p-5 sm:p-6 md:p-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: bandColor }}
      />

      <div className="relative flex flex-col gap-5 md:gap-6">
        <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-end md:gap-10">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {MORNING_CARD_SCORE_LABEL}
            </p>
            <p
              className="mt-1 text-5xl font-bold text-white sm:text-6xl"
              aria-live="polite"
              aria-label={morningScoreAria(score)}
            >
              {score === null ? MORNING_CARD_PENDING_SCORE : score}
            </p>
            {bandLabel ? (
              <p className="mt-1 text-sm font-medium" style={{ color: bandColor }}>
                {bandLabel}
              </p>
            ) : (
              <p className="mt-1 text-sm text-white/50">{BOS_INSUFFICIENT_DATA_COPY}</p>
            )}
            {honest.contributorLine ? (
              <p className="mt-1 text-sm text-white/60">{honest.contributorLine}</p>
            ) : null}
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Today protocol
            </p>
            <MorningProtocolCtaButton cta={cta} onTake={handleTake} taking={taking} />
          </div>
        </div>

        <MorningChipGrid
          chips={chips}
          selectedKey={selectedKey}
          onSelect={(key) => setSelectedKey((prev) => (prev === key ? null : key))}
        />

        <HabitSleepPair pair={habitSleepPair} />

        {selectedChip ? <MorningContributorList chip={selectedChip} /> : null}
      </div>
    </section>
  );
}
