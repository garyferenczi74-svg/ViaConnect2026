'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Hexagon, Star } from 'lucide-react';
import { AchievementBadge } from '@/components/body-tracker/AchievementBadge';
import { getMilestoneMessage } from '@/lib/body-tracker/calculations';

const SAMPLE_MILESTONES = [
  { id: '1', title: 'First 5 lbs', grade: 'A+', expected_days: 14, actual_days: 10, start_value: 192, current_value: 187, target_value: 187, target_unit: 'lbs', helix_tokens: 200 },
  { id: '2', title: 'Hit 185 lbs', grade: 'A', expected_days: 14, actual_days: 12, start_value: 187, current_value: 185, target_value: 185, target_unit: 'lbs', helix_tokens: 175 },
  { id: '3', title: 'Sub 20% Body Fat', grade: 'B+', expected_days: 30, actual_days: 28, start_value: 23.1, current_value: 19.8, target_value: 20, target_unit: '%', helix_tokens: 125 },
];

export default function MilestonesPage() {
  const [idx, setIdx] = useState(0);
  const m = SAMPLE_MILESTONES[idx];
  const progress = m.actual_days / m.expected_days;

  return (
    <div className="space-y-6">
      {/* Navigator */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setIdx(Math.max(0, idx - 1))}
          disabled={idx === 0}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-all hover:bg-white/[0.06] disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <span className="text-sm text-white/70">Milestone {idx + 1} / {SAMPLE_MILESTONES.length}</span>
        <button
          onClick={() => setIdx(Math.min(SAMPLE_MILESTONES.length - 1, idx + 1))}
          disabled={idx === SAMPLE_MILESTONES.length - 1}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-all hover:bg-white/[0.06] disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Achievement badge */}
      <div className="flex justify-center">
        <AchievementBadge grade={m.grade} size="lg" animated />
      </div>

      {/* Performance card */}
      <motion.div
        key={m.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 p-5 backdrop-blur-sm"
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{m.title}</h3>
          <span className="text-sm font-bold text-white">{m.grade}</span>
        </div>
        <p className="mb-4 text-[11px] text-white/40">Expected: {m.expected_days}d; Completed: {m.actual_days}d</p>

        {/* Progress bar */}
        <div className="relative mb-2 h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${progress <= 1 ? 'bg-[#2DA5A0]' : 'bg-[#B75E18]'}`}
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
          <div className="absolute top-0 h-full w-0.5 bg-white/60" style={{ left: '100%' }} />
        </div>

        <p className="mt-3 text-xs italic text-white/60">
          {getMilestoneMessage(m.grade, m.actual_days, m.expected_days)}
        </p>
      </motion.div>

      {/* Helix Rewards (Consumer only) */}
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
  );
}
