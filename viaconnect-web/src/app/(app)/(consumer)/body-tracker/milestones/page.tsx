'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Hexagon, Plus, Star, Trophy } from 'lucide-react';
import { MilestoneGauge } from '@/components/body-tracker/MilestoneGauge';
import { getMilestoneMessage } from '@/lib/body-tracker/calculations';
import { MilestoneCreatorForm } from '@/components/body-tracker/manual-input/forms/MilestoneCreatorForm';

const SAMPLE_MILESTONES = [
  {
    id: '1', title: 'First 5 lbs', grade: 'A+', expected_days: 14, actual_days: 10,
    start_value: 192, current_value: 187, target_value: 187, target_unit: 'lbs', helix_tokens: 200,
    colors: { light: '#FBBF24', mid: '#F59E0B', dark: '#D97706', text: '#78350F' }, // gold
  },
  {
    id: '2', title: 'Hit 185 lbs', grade: 'A', expected_days: 14, actual_days: 12,
    start_value: 187, current_value: 185, target_value: 185, target_unit: 'lbs', helix_tokens: 175,
    colors: { light: '#5EEAD4', mid: '#2DA5A0', dark: '#0D9488', text: '#134E4A' }, // teal
  },
  {
    id: '3', title: 'Sub 20% Body Fat', grade: 'B+', expected_days: 30, actual_days: 28,
    start_value: 23.1, current_value: 19.8, target_value: 20, target_unit: '%', helix_tokens: 125,
    colors: { light: '#C084FC', mid: '#A855F7', dark: '#7E22CE', text: '#3B0764' }, // violet
  },
];

type Milestone = (typeof SAMPLE_MILESTONES)[number];

function PerformanceCard({ m }: { m: Milestone }) {
  const progress = m.actual_days / m.expected_days;
  return (
    <motion.div
      key={m.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-5 backdrop-blur-sm"
    >
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: m.colors.mid }}>{m.title}</h3>
        <span className="text-sm font-bold" style={{ color: m.colors.mid }}>{m.grade}</span>
      </div>
      <p className="mb-4 text-[11px] text-white/40">Expected: {m.expected_days}d; Completed: {m.actual_days}d</p>

      {/* Progress bar */}
      <div className="relative mb-2 h-3 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(progress * 100, 100)}%`, backgroundColor: progress <= 1 ? m.colors.mid : '#B75E18' }}
        />
        <div className="absolute top-0 h-full w-0.5 bg-white/60" style={{ left: '100%' }} />
      </div>

      <p className="mt-3 text-xs italic text-white/60">
        {getMilestoneMessage(m.grade, m.actual_days, m.expected_days)}
      </p>

      <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
        <Hexagon className="h-4 w-4" strokeWidth={1.5} style={{ color: m.colors.mid }} />
        <span className="text-xs font-semibold text-white">+{m.helix_tokens} tokens earned</span>
      </div>
    </motion.div>
  );
}

export default function MilestonesPage() {
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const m = SAMPLE_MILESTONES[idx];

  return (
    <div className="space-y-6" key={refreshKey}>
      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 backdrop-blur-md p-4 sm:p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Milestones</h2>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 px-3 py-2 text-xs font-medium text-[#2DA5A0] hover:bg-[#2DA5A0]/25 min-h-[44px]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            New milestone
          </button>
        </div>

        {/* Mobile: navigator + single badge */}
        <div className="md:hidden space-y-5">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setIdx(Math.max(0, idx - 1))}
              disabled={idx === 0}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-all hover:bg-white/[0.06] disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <span className="text-sm font-semibold" style={{ color: m.colors.mid }}>Milestone {idx + 1} / {SAMPLE_MILESTONES.length}</span>
            <button
              onClick={() => setIdx(Math.min(SAMPLE_MILESTONES.length - 1, idx + 1))}
              disabled={idx === SAMPLE_MILESTONES.length - 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-all hover:bg-white/[0.06] disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex justify-center">
            <MilestoneGauge grade={m.grade} title={m.title} colors={m.colors} size="md" icon={Trophy} animate />
          </div>
        </div>

        {/* Desktop: all gauges in a row */}
        <div className="hidden md:flex md:flex-wrap md:justify-center md:gap-4">
          {SAMPLE_MILESTONES.map((ms) => (
            <MilestoneGauge key={ms.id} grade={ms.grade} title={ms.title} colors={ms.colors} size="md" icon={Trophy} animate />
          ))}
        </div>
      </div>

      <MilestoneCreatorForm open={open} onOpenChange={setOpen} onSaved={() => setRefreshKey((k) => k + 1)} />

      {/* Mobile: single performance card + helix rewards for the selected milestone */}
      <div className="md:hidden space-y-6">
        <PerformanceCard m={m} />
        <div className="rounded-xl border border-white/[0.08] bg-gradient-to-r from-[#2DA5A0]/10 to-[#B75E18]/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white/50">
            <Star className="h-3.5 w-3.5 text-[#FBBF24]" strokeWidth={1.5} />
            Helix Rewards
          </div>
          <div className="flex items-center gap-2">
            <Hexagon className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
            <span className="text-sm font-bold text-white">+{m.helix_tokens} tokens earned</span>
          </div>
        </div>
      </div>

      {/* Desktop: all performance cards stacked */}
      <div className="hidden md:flex md:flex-col md:gap-4">
        {SAMPLE_MILESTONES.map((ms) => <PerformanceCard key={ms.id} m={ms} />)}
      </div>
    </div>
  );
}
