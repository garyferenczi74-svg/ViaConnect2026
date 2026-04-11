'use client';

// HelixRewardsSummary — tier badge, points, streak (Flame icon), progress
// to next tier, and recent activity. Consumer portal ONLY.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Flame, Hexagon, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface HelixRewardsSummaryProps {
  totalPoints: number;
  currentStreak: number;
  longestStreak?: number;
}

type TierName = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

interface TierStyle {
  bg: string;
  border: string;
  text: string;
  multiplier: number;
}

const TIER_STYLES: Record<TierName, TierStyle> = {
  Bronze:   { bg: 'bg-amber-900/20',  border: 'border-amber-700/30',  text: 'text-amber-500',  multiplier: 1 },
  Silver:   { bg: 'bg-gray-400/10',   border: 'border-gray-400/30',   text: 'text-gray-300',   multiplier: 1.5 },
  Gold:     { bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', text: 'text-yellow-400', multiplier: 2 },
  Platinum: { bg: 'bg-cyan-400/10',   border: 'border-cyan-400/30',   text: 'text-cyan-300',   multiplier: 5 },
  Diamond:  { bg: 'bg-purple-400/10', border: 'border-purple-400/30', text: 'text-purple-300', multiplier: 5 },
};

const TIER_THRESHOLDS: { name: TierName; min: number }[] = [
  { name: 'Bronze',   min: 0 },
  { name: 'Silver',   min: 500 },
  { name: 'Gold',     min: 2000 },
  { name: 'Platinum', min: 5000 },
  { name: 'Diamond',  min: 10000 },
];

const tierForPoints = (points: number): { current: TierName; next: TierName | null; toNext: number; progressPct: number } => {
  let current: TierName = 'Bronze';
  let next: TierName | null = 'Silver';
  let nextMin = 500;
  let currentMin = 0;
  for (let i = 0; i < TIER_THRESHOLDS.length; i++) {
    if (points >= TIER_THRESHOLDS[i].min) {
      current = TIER_THRESHOLDS[i].name;
      currentMin = TIER_THRESHOLDS[i].min;
      next = TIER_THRESHOLDS[i + 1]?.name ?? null;
      nextMin = TIER_THRESHOLDS[i + 1]?.min ?? TIER_THRESHOLDS[i].min;
    }
  }
  const span = Math.max(1, nextMin - currentMin);
  const progressPct = next ? Math.min(100, Math.round(((points - currentMin) / span) * 100)) : 100;
  const toNext = next ? Math.max(0, nextMin - points) : 0;
  return { current, next, toNext, progressPct };
};

interface RecentActivity {
  id: string;
  description: string;
  points: number;
  createdAt: string;
}

const formatActivityDate = (iso: string): string => {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export function HelixRewardsSummary({ totalPoints, currentStreak, longestStreak = 0 }: HelixRewardsSummaryProps) {
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const tierInfo = tierForPoints(totalPoints);
  const style = TIER_STYLES[tierInfo.current];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data } = await (supabase as any)
          .from('helix_transactions')
          .select('id, description, amount, created_at, transaction_type')
          .eq('user_id', user.id)
          .eq('transaction_type', 'earn')
          .order('created_at', { ascending: false })
          .limit(4);

        if (cancelled || !Array.isArray(data)) return;
        setActivity(
          data.map((row: any) => ({
            id: row.id,
            description: row.description || 'Activity',
            points: row.amount || 0,
            createdAt: row.created_at,
          })),
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-4 sm:p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Hexagon className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">
          Helix Rewards
        </h2>
      </div>

      {/* Tier + balance */}
      <div className={`rounded-xl border ${style.border} ${style.bg} p-3.5`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Hexagon className={`h-5 w-5 flex-shrink-0 ${style.text}`} strokeWidth={1.5} />
            <div className="min-w-0">
              <p className={`truncate text-sm font-bold ${style.text}`}>{tierInfo.current} Tier</p>
              <p className="text-[10px] text-white/40">{style.multiplier}× multiplier</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-white">{totalPoints.toLocaleString()}</p>
            <p className="text-[10px] text-white/40">Helix Points</p>
          </div>
        </div>
      </div>

      {/* Streak */}
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
        <motion.div
          animate={currentStreak >= 7 ? { y: [0, -2, 0] } : {}}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Flame
            className={`h-5 w-5 ${currentStreak >= 7 ? 'text-[#B75E18]' : 'text-white/40'}`}
            strokeWidth={1.5}
          />
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">
            {currentStreak > 0 ? `${currentStreak}-day active streak` : 'Start your streak today'}
          </p>
          {longestStreak > 0 && (
            <p className="text-[10px] text-white/40">Best: {longestStreak} days</p>
          )}
        </div>
      </div>

      {/* Progress */}
      {tierInfo.next && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="text-white/50">Progress to {tierInfo.next}</span>
            <span className="font-semibold text-white/70">{tierInfo.progressPct}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${tierInfo.progressPct}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
              className="h-2.5 rounded-full bg-gradient-to-r from-[#2DA5A0] to-[#22C55E]"
            />
          </div>
          <p className="mt-1.5 text-[10px] text-white/40">
            {tierInfo.toNext.toLocaleString()} more points to {tierInfo.next} Tier
          </p>
        </div>
      )}

      {/* Recent activity */}
      {activity.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Recent activity
          </p>
          <ul className="space-y-1.5">
            {activity.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 text-xs text-white/65"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <Sparkles className="h-3 w-3 flex-shrink-0 text-[#2DA5A0]" strokeWidth={1.5} />
                  <span className="truncate">{a.description}</span>
                </span>
                <span className="flex flex-shrink-0 items-center gap-2">
                  <span className="font-semibold text-[#22C55E]">+{a.points}</span>
                  <span className="text-[10px] text-white/35">{formatActivityDate(a.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        href="/helix"
        className="mt-4 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-4 py-2 text-sm font-medium text-[#2DA5A0] transition-all hover:border-[#2DA5A0]/50 hover:bg-[#2DA5A0]/20"
      >
        View All Rewards
        <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
      </Link>
    </section>
  );
}
