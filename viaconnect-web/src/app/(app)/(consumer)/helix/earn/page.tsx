'use client';

import { motion } from 'framer-motion';
import {
  Pill,
  Footprints,
  Salad,
  CircleCheckBig,
  Trophy,
  Megaphone,
  Microscope,
  BarChart3,
  ShoppingBag,
  Star,
  Users,
} from 'lucide-react';
import { HelixIconWrapper } from '@/components/helix/HelixIcons';
import { GlassCard } from '@/components/helix/GlassCard';
import { HelixIcon } from '@/components/helix/HelixIcon';
import { useHelixEarnCatalog } from '@/hooks/useHelixEarnCatalog';
import {
  EARN_EVENTS_EMPTY,
  NOT_ENOUGH_DATA,
  type HelixEarningEventView,
} from '@/lib/helix/consumer-honesty';
import type { IconType } from '@/types/icon';

function iconForEvent(event: HelixEarningEventView): { icon: IconType; glow: 'teal' | 'orange' } {
  switch (event.category) {
    case 'purchase':
      return { icon: ShoppingBag, glow: 'orange' };
    case 'assessment':
      return { icon: Microscope, glow: 'teal' };
    case 'tracking':
      return { icon: Footprints, glow: 'teal' };
    case 'referral':
      return { icon: Megaphone, glow: 'orange' };
    case 'milestone':
      return { icon: Star, glow: 'orange' };
    case 'community':
      return { icon: Users, glow: 'teal' };
    case 'engagement':
      return { icon: Trophy, glow: 'orange' };
    default:
      if (event.title.toLowerCase().includes('supplement')) return { icon: Pill, glow: 'teal' };
      if (event.title.toLowerCase().includes('nutrition')) return { icon: Salad, glow: 'teal' };
      if (event.title.toLowerCase().includes('check')) return { icon: CircleCheckBig, glow: 'teal' };
      return { icon: CircleCheckBig, glow: 'teal' };
  }
}

export default function EarnPage() {
  const { loading, events, activity } = useHelixEarnCatalog();

  return (
    <div className="flex flex-col gap-6 md:gap-8 p-4 md:p-6">
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

      {events.length === 0 ? (
        <p className="text-sm text-white/45">{loading ? 'Loading' : EARN_EVENTS_EMPTY}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {events.map((event, i) => {
            const { icon: Icon, glow } = iconForEvent(event);
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: 'easeOut' }}
                className="relative overflow-hidden rounded-[20px] p-4 md:p-6 bg-[rgba(26,39,68,0.55)] backdrop-blur-[24px] backdrop-saturate-[160%] border border-white/[0.08] hover:border-white/[0.14] hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-0.5 flex flex-col md:flex-row items-start gap-3 md:gap-4"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }}
                />
                <HelixIconWrapper size="lg" glow={glow}>
                  <Icon size={24} strokeWidth={1.5} className="text-white/60" />
                </HelixIconWrapper>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-extrabold text-white">{event.title}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <HelixIcon size={13} />
                    <span className="text-[14px] font-bold text-[#2DA5A0]">
                      +{event.points.toLocaleString()}
                    </span>
                  </div>
                  {event.description ? (
                    <p className="text-[12px] text-white/40 mt-1 leading-relaxed">{event.description}</p>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <GlassCard glow>
        <h3 className="text-[20px] font-extrabold text-[#B75E18] mb-5">
          <BarChart3 size={20} strokeWidth={1.5} className="text-[#B75E18] inline" />{' '}
          Today&apos;s Helix Activity
        </h3>
        {activity.length === 0 ? (
          <p className="text-sm text-white/45">{loading ? 'Loading' : NOT_ENOUGH_DATA}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activity.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-2 text-sm text-white/65"
              >
                <span className="truncate">{row.description}</span>
                <span className="flex-shrink-0 font-semibold text-[#22C55E]">
                  +{row.points.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
