'use client';

// TodaysProtocol — daily supplement schedule grouped by time-of-day with
// per-item check-off, animated adherence bar, and a 100% confetti burst.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Pill, Sunrise, Sun, Moon, Clock, type LucideIcon } from 'lucide-react';
import type { DashboardSupplement } from '@/hooks/useUserDashboardData';
import { useTodaysAdherence } from '@/hooks/useTodaysAdherence';
import {
  supplementToSlot,
  supplementSlug,
  adherenceKey,
  type ProtocolSlot,
} from '@/lib/protocolSlot';
import { ProtocolCheckItem, type ProtocolCheckItemData } from './ProtocolCheckItem';

interface TodaysProtocolProps {
  supplements: DashboardSupplement[];
}

interface ScheduleBlock {
  id: ProtocolSlot;
  label: string;
  icon: LucideIcon;
  color: string;
  items: ProtocolCheckItemData[];
}

const TIME_BLOCKS: { id: ProtocolSlot; label: string; icon: LucideIcon; time: string; color: string }[] = [
  { id: 'morning', label: 'Morning', icon: Sunrise, time: '12 AM to 12 PM', color: '#FFB347' },
  { id: 'afternoon', label: 'Afternoon', icon: Sun, time: '12 PM to 6 PM', color: '#2DA5A0' },
  { id: 'evening', label: 'Night', icon: Moon, time: '6 PM to 12 AM', color: '#7C6FE0' },
  { id: 'asNeeded', label: 'As Needed', icon: Clock, time: 'Flexible', color: '#9CA3AF' },
];

function ConfettiBurst() {
  // 18 small particles bursting outward
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

export function TodaysProtocol({ supplements }: TodaysProtocolProps) {
  const { entries, toggle } = useTodaysAdherence();
  const [showConfetti, setShowConfetti] = useState(false);

  // Build schedule blocks from supplements + adherence state
  const blocks: ScheduleBlock[] = useMemo(() => {
    const grouped: Record<ProtocolSlot, ProtocolCheckItemData[]> = {
      morning: [],
      afternoon: [],
      evening: [],
      asNeeded: [],
    };
    supplements.forEach((s) => {
      const slot = supplementToSlot(s);
      const slug = supplementSlug(s);
      const item: ProtocolCheckItemData = {
        id: s.id,
        productName: s.product_name || s.supplement_name || 'Supplement',
        productSlug: slug,
        deliveryForm: s.dosage_form,
        dosage: s.dosage,
        isCompleted: !!entries[adherenceKey(slug, slot)],
      };
      grouped[slot].push(item);
    });
    return TIME_BLOCKS.filter((b) => grouped[b.id].length > 0).map((b) => ({
      id: b.id,
      label: b.label,
      icon: b.icon,
      color: b.color,
      items: grouped[b.id],
    }));
  }, [supplements, entries]);

  const totalCount = blocks.reduce((sum, b) => sum + b.items.length, 0);
  const completedCount = blocks.reduce(
    (sum, b) => sum + b.items.filter((i) => i.isCompleted).length,
    0,
  );
  const adherencePercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Trigger confetti once when reaching 100%
  useEffect(() => {
    if (totalCount > 0 && completedCount === totalCount) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 1100);
      return () => clearTimeout(t);
    }
  }, [completedCount, totalCount]);

  // Adherence bar color
  const barColor =
    adherencePercent === 100
      ? '#22C55E'
      : adherencePercent >= 67
        ? '#2DA5A0'
        : adherencePercent >= 33
          ? '#F59E0B'
          : '#EF4444';

  if (supplements.length === 0) {
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

  return (
    <section className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md">
      <AnimatePresence>{showConfetti && <ConfettiBurst />}</AnimatePresence>

      {/* Header */}
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
        <span className="text-xs font-semibold text-white/60">
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* Adherence bar */}
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
      </div>

      {/* Blocks — single container for the current time slot only; items
          are the ones classified for that slot (no cross slot fallback) */}
      <div className="flex-1 space-y-3 p-4 sm:p-5">
        {(() => {
          // 00:00-11:59 → morning, 12:00-17:59 → afternoon, 18:00-23:59 → night
          const hour = new Date().getHours();
          const currentSlotId: ProtocolSlot =
            hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
          const headerConfig = TIME_BLOCKS.find((b) => b.id === currentSlotId)!;
          const currentBlock = blocks.find((b) => b.id === currentSlotId);
          const items = currentBlock?.items ?? [];
          const Icon = headerConfig.icon;
          const blockDone = items.filter((i) => i.isCompleted).length;

          return (
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
                  <h4 className="text-xs font-semibold text-white">
                    {headerConfig.label}
                    <span className="ml-1.5 text-[10px] font-normal text-white/40">· now</span>
                  </h4>
                  <p className="text-[10px] text-white/35">
                    {blockDone} of {items.length} done
                  </p>
                </div>
              </div>
              {items.length > 0 ? (
                <div className="divide-y divide-white/[0.04]">
                  {items.map((item) => (
                    <ProtocolCheckItem
                      key={item.id}
                      item={item}
                      onToggle={(slug) => toggle(slug, currentSlotId, totalCount)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 px-4">
                  <p className="text-xs text-white/30 text-center">
                    No supplements scheduled for {headerConfig.label.toLowerCase()}
                  </p>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Footer link */}
      <div className="border-t border-white/5 p-4 sm:p-5">
        <Link
          href="/supplements"
          className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-4 py-2 text-sm font-medium text-[#2DA5A0] transition-all hover:border-[#2DA5A0]/50 hover:bg-[#2DA5A0]/20"
        >
          View Full Protocol
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </div>
    </section>
  );
}
