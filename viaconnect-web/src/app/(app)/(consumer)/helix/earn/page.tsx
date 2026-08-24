'use client';

import { motion } from 'framer-motion';
import { Pill, Footprints, Salad, CircleCheckBig, Trophy, Megaphone, Microscope, BarChart3 } from 'lucide-react';
import { HelixIconWrapper, StreakFlameIcon } from '@/components/helix/HelixIcons';
import { GlassCard } from '@/components/helix/GlassCard';
import { HelixIcon } from '@/components/helix/HelixIcon';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const EARN_CATEGORIES = [
  { icon: Pill, label: 'Daily Supplements', helix: '+25/day', description: 'Log each supplement dose on time', glow: 'teal' as const },
  { icon: Footprints, label: 'Steps & Activity', helix: '+10-50/day', description: 'Earn more as your step count climbs', glow: 'teal' as const },
  { icon: Salad, label: 'Nutrition Logging', helix: '+15/day', description: 'Track breakfast, lunch, and dinner', glow: 'teal' as const },
  { icon: CircleCheckBig, label: 'Daily Check-in', helix: '+10/day', description: 'Complete your wellness pulse check', glow: 'teal' as const },
  { icon: Trophy, label: 'Challenge Wins', helix: '+100-1,000', description: 'Finish challenges to earn big', glow: 'orange' as const },
  { icon: StreakFlameIcon, label: 'Streak Bonuses', helix: '2x multiplier', description: 'Keep your streak alive for double Helix', glow: 'orange' as const },
  { icon: Megaphone, label: 'Refer Friends', helix: '+500/referral', description: 'Invite friends to ViaConnect', glow: 'orange' as const },
  { icon: Microscope, label: 'Share for Science', helix: '+200/month', description: 'Contribute anonymous data to research', glow: 'teal' as const },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function EarnPage() {
  return (
    <div className="flex flex-col gap-6 md:gap-8 p-4 md:p-6">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        {EARN_CATEGORIES.map((cat, i) => (
          <motion.div
            key={cat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: 'easeOut' }}
            className="relative overflow-hidden rounded-[20px] p-4 md:p-6 bg-[rgba(26,39,68,0.55)] backdrop-blur-[24px] backdrop-saturate-[160%] border border-white/[0.08] hover:border-white/[0.14] hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-0.5 flex flex-col md:flex-row items-start gap-3 md:gap-4"
          >
            {/* Rim light */}
            <div
              className="absolute top-0 left-0 right-0 h-px pointer-events-none"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }}
            />

            {/* Icon box */}
            <HelixIconWrapper size="lg" glow={cat.glow}>
              <cat.icon size={24} strokeWidth={1.5} className="text-white/60" />
            </HelixIconWrapper>

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
          <BarChart3 size={20} strokeWidth={1.5} className="text-[#B75E18] inline" />{' '}
          Today&apos;s Helix Activity
        </h3>
        <p className="text-sm text-white/45">Not enough data</p>
      </GlassCard>
    </div>
  );
}
