'use client';

import type { IconType } from '@/types/icon';
import React from 'react';
import { motion } from 'framer-motion';
import { HelixIcon } from './HelixIcon';
import {
  Footprints,
  Pill,
  Salad,
  Dumbbell,
  Scale,
  CircleCheckBig,
  Target,
  Moon,
  Activity,
  Clock,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Icon lookup                                                        */
/* ------------------------------------------------------------------ */

const CHALLENGE_ICONS: Record<string, IconType> = {
  steps: Footprints,
  supplements: Pill,
  nutrition: Salad,
  workout: Dumbbell,
  weight: Scale,
  checkin: CircleCheckBig,
  markers: Target,
  sleep: Moon,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface ChallengeCardProps {
  type: string;
  title: string;
  description: string;
  helix: number;
  active: boolean;
  progress: number | null;
  participants: number | null;
  index?: number;
}

export function ChallengeCard({
  type,
  title,
  description,
  helix,
  active,
  progress,
  participants,
  index = 0,
}: ChallengeCardProps) {
  const ChIcon = CHALLENGE_ICONS[type] || Footprints;
  const progressLabel =
    typeof progress === 'number' && Number.isFinite(progress) ? `${progress}%` : 'Not enough data';
  const joinedLabel =
    typeof participants === 'number' && Number.isFinite(participants)
      ? `${participants} joined`
      : 'Not enough data';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: 'easeOut' }}
      whileHover={{ y: -2, borderColor: 'rgba(255,255,255,0.14)' }}
      className="relative overflow-hidden rounded-[20px] p-7 bg-[rgba(26,39,68,0.55)] backdrop-blur-[24px] backdrop-saturate-[160%] border border-white/[0.08] hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] transition-shadow"
    >
      {/* Rim light */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 rounded-[14px] bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
          <ChIcon size={28} strokeWidth={1.5} className="text-white/70" />
        </div>
        <span
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            active
              ? 'bg-[#2DA5A0]/15 text-[#2DA5A0] border border-[#2DA5A0]/30'
              : 'bg-[#B75E18]/15 text-[#B75E18] border border-[#B75E18]/30'
          }`}
        >
          {active ? (
            <>
              <Activity size={10} strokeWidth={1.5} className="text-[#2DA5A0]" />
              LIVE
            </>
          ) : (
            <>
              <Clock size={10} strokeWidth={1.5} className="text-[#B75E18]" />
              ENDED
            </>
          )}
        </span>
      </div>

      {/* Title & description */}
      <h3 className="text-[16px] font-extrabold text-white mb-1">{title}</h3>
      <p className="text-xs text-white/50 mb-4 line-clamp-2">{description}</p>

      {/* Progress bar: only a percent from a real participant row */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] mb-1.5">
          <span className="text-white/40 font-semibold uppercase tracking-wider">Progress</span>
          <span className="text-[#2DA5A0] font-bold">{progressLabel}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
          {typeof progress === 'number' ? (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ delay: index * 0.1 + 0.4, duration: 1.2, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-[#2DA5A0] to-[#35bdb7]"
            />
          ) : null}
        </div>
      </div>

      {/* Bottom: real joined count, never invented avatars */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-white/40">{joinedLabel}</span>

        {/* Reward */}
        <div className="flex items-center gap-1">
          <HelixIcon size={14} />
          <span className="text-sm font-extrabold text-[#B75E18]">{helix.toLocaleString()}</span>
        </div>
      </div>
    </motion.div>
  );
}
