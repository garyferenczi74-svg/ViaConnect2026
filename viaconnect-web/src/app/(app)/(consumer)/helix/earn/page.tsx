'use client';

import { motion } from 'framer-motion';
import { GlassCard } from '@/components/helix/GlassCard';
import { HelixIcon } from '@/components/helix/HelixIcon';
import { DailyActionRow } from '@/components/helix/DailyActionRow';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const EARN_CATEGORIES = [
  { emoji: '💊', label: 'Daily Supplements', helix: '+25/day',       description: 'Log each supplement dose on time' },
  { emoji: '👟', label: 'Steps & Activity',  helix: '+10-50/day',    description: 'Earn more as your step count climbs' },
  { emoji: '🥗', label: 'Nutrition Logging',  helix: '+15/day',      description: 'Track breakfast, lunch, and dinner' },
  { emoji: '✅', label: 'Daily Check-in',     helix: '+10/day',      description: 'Complete your wellness pulse check' },
  { emoji: '🏆', label: 'Challenge Wins',     helix: '+100-1,000',   description: 'Finish challenges to earn big' },
  { emoji: '🔥', label: 'Streak Bonuses',     helix: '2x multiplier', description: 'Keep your streak alive for double Helix' },
  { emoji: '📢', label: 'Refer Friends',      helix: '+500/referral', description: 'Invite friends to ViaConnect' },
  { emoji: '🔬', label: 'Share for Science',  helix: '+200/month',   description: 'Contribute anonymous data to research' },
];

const DAILY_ACTIONS = [
  { emoji: '💊', label: 'Morning Supplements',    helix: 25, completed: true },
  { emoji: '👟', label: '10K Steps',              helix: 50, completed: true },
  { emoji: '🥗', label: 'Meal Logging',           helix: 15, completed: true },
  { emoji: '💊', label: 'Afternoon Supplements',  helix: 25, completed: true },
  { emoji: '✅', label: 'Wellness Check-in',      helix: 10, completed: false },
  { emoji: '💊', label: 'Evening Supplements',    helix: 25, completed: false },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function EarnPage() {
  const earned = DAILY_ACTIONS.filter((a) => a.completed).reduce((s, a) => s + a.helix, 0);
  const possible = DAILY_ACTIONS.reduce((s, a) => s + a.helix, 0);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-[22px] font-extrabold text-[#B75E18]">Ways to Earn Helix</h2>
        <p className="text-[14px] text-white/40 mt-1">
          Every healthy action earns redeemable Helix credits
        </p>
      </motion.div>

      {/* Earning categories grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {EARN_CATEGORIES.map((cat, i) => (
          <motion.div
            key={cat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: 'easeOut' }}
            className="relative overflow-hidden rounded-[20px] p-6 bg-[rgba(26,39,68,0.55)] backdrop-blur-[24px] backdrop-saturate-[160%] border border-white/[0.08] hover:border-white/[0.14] hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-0.5 flex items-start gap-4"
          >
            {/* Rim light */}
            <div
              className="absolute top-0 left-0 right-0 h-px pointer-events-none"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }}
            />

            {/* Icon box */}
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-[#B75E18]/[0.08] flex items-center justify-center text-2xl">
              {cat.emoji}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-extrabold text-white">{cat.label}</p>
              <div className="flex items-center gap-1 mt-1">
                <HelixIcon size={13} />
                <span className="text-[14px] font-bold text-[#2DA5A0]">{cat.helix}</span>
              </div>
              <p className="text-[12px] text-white/40 mt-1 leading-relaxed">{cat.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Daily Activity Tracker */}
      <GlassCard glow>
        <h3 className="text-[20px] font-extrabold text-[#B75E18] mb-5">
          📊 Today&apos;s Helix Activity
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {DAILY_ACTIONS.map((action, i) => (
            <DailyActionRow
              key={action.label}
              emoji={action.emoji}
              label={action.label}
              helix={action.helix}
              completed={action.completed}
              index={i}
            />
          ))}
        </div>

        {/* Summary */}
        <div className="mt-5 pt-4 border-t border-white/[0.06] text-center">
          <p className="text-[14px] text-white/55">
            Today&apos;s earnings:{' '}
            <span className="font-extrabold text-[#2DA5A0]">+{earned} Helix</span>
            {' / '}
            <span className="text-white/35">{possible} possible</span>
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
