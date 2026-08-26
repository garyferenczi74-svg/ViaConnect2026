'use client';

// TodaysProtocol — Daily Schedule on the Dashboard.
// Prompt 219d: renders EXCLUSIVELY from the shared schedule read
// (useDailyScheduleView → GET /api/supplements/schedule). No client-side
// frequency heuristics for slots; slots and taken state match My Supplements.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Pill,
  Sunrise,
  Sun,
  Moon,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { useDailyScheduleView } from '@/hooks/useDailyScheduleView';
import { useTodaysMealsLogged } from '@/hooks/useTodaysMealsLogged';
import { currentLocalScheduleBucket } from '@/lib/supplements/dailyScheduleShared';
import type { TimeOfDay } from '@/lib/caq/supplements/timing/types';
import { ProtocolCheckItem, type ProtocolCheckItemData } from './ProtocolCheckItem';
import { ProtocolProgressGauge } from './ProtocolProgressGauge';
import {
  buildProtocolHomework,
  formatHomeworkText,
} from '@/lib/supplements/protocolHomework';

interface SlotHeader {
  id: TimeOfDay;
  label: string;
  icon: LucideIcon;
  time: string;
  color: string;
}

const TIME_BLOCKS: SlotHeader[] = [
  { id: 'morning', label: 'Morning', icon: Sunrise, time: '12 AM to 12 PM', color: '#FBBF24' },
  { id: 'afternoon', label: 'Afternoon', icon: Sun, time: '12 PM to 6 PM', color: '#B75E18' },
  { id: 'evening', label: 'Evening', icon: Moon, time: '6 PM to 12 AM', color: '#60A5FA' },
];

function ConfettiBurst() {
  const pieces = Array.from({ length: 18 });
  const colors = ['#2DA5A0', '#22C55E', '#FFB347', '#B75E18', '#A855F7'];
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {pieces.map((_, i) => {
        const angle = (i / pieces.length) * Math.PI * 2;
        const distance = 80 + Math.random() * 40;
        return (
          <motion.span
            key={i}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            animate={{
              opacity: 0,
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              scale: 0.4,
            }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: colors[i % colors.length] }}
          />
        );
      })}
    </div>
  );
}

/**
 * Prompt 219d: no longer accepts a separate supplements prop.
 * Both surfaces share useDailyScheduleView so counts cannot drift.
 */
export function TodaysProtocol(_props?: { supplements?: unknown }) {
  const { view, counts, status, errorMessage, refresh, toggleTaken } =
    useDailyScheduleView();
  const { loggedCount: mealsDone, mealsTotal } = useTodaysMealsLogged();
  const [showConfetti, setShowConfetti] = useState(false);

  const { total: totalCount, completed: completedCount, adherencePercent } =
    counts;

  useEffect(() => {
    if (totalCount > 0 && completedCount === totalCount) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 1100);
      return () => clearTimeout(t);
    }
  }, [completedCount, totalCount]);

  const barColor =
    adherencePercent === 100
      ? '#22C55E'
      : adherencePercent >= 67
        ? '#2DA5A0'
        : adherencePercent >= 33
          ? '#F59E0B'
          : '#EF4444';

  if (status === 'loading') {
    return (
      <section className="flex min-h-[200px] items-center justify-center rounded-2xl border border-white/10 bg-[#1E3054]/60 p-6">
        <Loader2 className="h-5 w-5 animate-spin text-[#2DA5A0]" strokeWidth={1.5} />
        <span className="ml-2 text-sm text-white/40">Loading today&apos;s schedule...</span>
      </section>
    );
  }

  if (status === 'unavailable') {
    return (
      <section className="rounded-2xl border border-white/10 bg-[#1E3054]/60 p-6 text-center">
        <p className="text-sm text-white/60">
          {errorMessage ?? 'Schedule unavailable. Retry when ready.'}
        </p>
        <button
          type="button"
          onClick={refresh}
          className="mt-3 min-h-[44px] rounded-xl border border-[#2DA5A0]/40 px-4 py-2 text-sm text-[#2DA5A0]"
        >
          Retry
        </button>
      </section>
    );
  }

  if (totalCount === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-6 text-center">
        <Pill className="mx-auto mb-3 h-8 w-8 text-[#2DA5A0]/60" strokeWidth={1.5} />
        <h3 className="text-base font-semibold text-white">No Active Protocol Yet</h3>
        <p className="mx-auto mt-1 max-w-sm text-xs text-white/40">
          Complete your assessment to receive a personalized supplement protocol.
        </p>
        <Link
          href="/onboarding/i-caq-intro"
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 px-4 py-2 text-sm font-medium text-[#2DA5A0] hover:bg-[#2DA5A0]/25"
        >
          Take Assessment
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </section>
    );
  }

  const currentSlotId = currentLocalScheduleBucket();
  const headerConfig = TIME_BLOCKS.find((b) => b.id === currentSlotId)!;
  const slotCards = view[currentSlotId] ?? [];
  const items: ProtocolCheckItemData[] = slotCards.map((c) => {
    const homework =
      c.homework ??
      buildProtocolHomework({
        name: c.name,
        dosageForm: c.dosage_form,
        source: c.source,
      });
    const homeworkLine = formatHomeworkText(homework);
    return {
      id: c.slot_id,
      productName: c.name,
      productSlug: c.user_supplement_id,
      deliveryForm: null,
      dosage: c.dose,
      isCompleted: c.taken,
      homeworkLine: homeworkLine || null,
      inputChip: homework.inputChip,
    };
  });
  const blockDone = items.filter((i) => i.isCompleted).length;
  const Icon = headerConfig.icon;

  return (
    <section
      className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md"
      data-testid="dashboard-daily-schedule"
      data-schedule-total={totalCount}
      data-schedule-completed={completedCount}
      data-schedule-adherence={adherencePercent}
    >
      <AnimatePresence>{showConfetti && <ConfettiBurst />}</AnimatePresence>

      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#2DA5A0]/30 bg-gradient-to-br from-[#1A2744] to-[#2DA5A0]">
            <Pill className="h-[18px] w-[18px] text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Daily Schedule</h2>
            <p className="text-[11px] text-white/40">Your supplement checklist for today</p>
          </div>
        </div>
        <ProtocolProgressGauge
          supplementsDone={completedCount}
          supplementsTotal={totalCount}
          mealsDone={mealsDone}
          mealsTotal={mealsTotal}
        />
      </div>

      <div className="border-b border-white/5 px-4 py-3 sm:px-5">
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span className="text-white/50">Today&apos;s adherence</span>
          <span className="font-semibold" style={{ color: barColor }}>
            {adherencePercent}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${adherencePercent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ backgroundColor: barColor }}
          />
        </div>
        <p className="mt-1.5 text-[10px] text-white/35">
          {completedCount} of {totalCount} total today
          {' · '}
          Morning {counts.perSlot.morning.completed}/{counts.perSlot.morning.total}
          {' · '}
          Afternoon {counts.perSlot.afternoon.completed}/{counts.perSlot.afternoon.total}
          {' · '}
          Evening {counts.perSlot.evening.completed}/{counts.perSlot.evening.total}
        </p>
      </div>

      <div className="flex-1 space-y-3 p-4 sm:p-5">
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-2.5 border-b border-white/5 px-3 py-2.5 sm:px-4">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{
                background: `${headerConfig.color}22`,
                border: `1px solid ${headerConfig.color}44`,
              }}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: headerConfig.color }} />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-semibold" style={{ color: headerConfig.color }}>
                {headerConfig.label}
                <span
                  className="ml-1.5 text-[10px] font-normal"
                  style={{ color: headerConfig.color, opacity: 0.7 }}
                >
                  · now
                </span>
              </h4>
              <p className="text-[10px]" style={{ color: headerConfig.color, opacity: 0.7 }}>
                {blockDone} of {items.length} done
              </p>
            </div>
          </div>
          {items.length > 0 ? (
            <div className="divide-y divide-white/[0.04]">
              {items.map((item) => {
                const card = slotCards.find((c) => c.slot_id === item.id);
                return (
                  <ProtocolCheckItem
                    key={item.id}
                    item={item}
                    onToggle={() => {
                      if (!card) return;
                      void toggleTaken({
                        slotId: card.slot_id,
                        userSupplementId: card.user_supplement_id,
                        timeOfDay: card.time_of_day,
                        nextTaken: !card.taken,
                      });
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center px-4 py-8">
              <p className="text-center text-xs text-white/30">
                No supplements scheduled for {headerConfig.label.toLowerCase()}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/5 p-4 sm:p-5">
        <Link
          href="/supplements"
          className="group relative inline-flex min-h-[40px] items-center gap-2 overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-[0_0_16px_rgba(45,165,160,0.35)] active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #2DA5A0 0%, #1E3054 100%)' }}
        >
          <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <span className="relative">View Full Protocol</span>
          <ArrowRight className="relative h-4 w-4" strokeWidth={2} />
        </Link>
      </div>
    </section>
  );
}
