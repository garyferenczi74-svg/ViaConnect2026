'use client';

import { motion } from 'framer-motion';
import { Dna, Pill, Gift, ShoppingBag, Star } from 'lucide-react';
import { RewardCard } from '@/components/helix/RewardCard';
import { ConsultIcon } from '@/components/helix/HelixIcons';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const USER_BALANCE = 4350;

const REWARDS = [
  { icon: Dna,         glow: 'teal' as const,   name: 'GeneX360 Retest',    description: 'Full genetic health panel retest with updated insights and recommendations', cost: 5000 },
  { icon: Pill,        glow: 'teal' as const,   name: 'Free Month Supply',   description: 'One month of your personalized supplement protocol, completely free', cost: 3500 },
  { icon: Gift,        glow: 'orange' as const, name: 'Product Upgrade',     description: 'Upgrade to premium-tier supplements with enhanced bioavailability', cost: 2000 },
  { icon: ConsultIcon, glow: 'teal' as const,   name: '1:1 Consult',         description: '30-minute private session with a certified health practitioner', cost: 4000 },
  { icon: ShoppingBag, glow: 'orange' as const, name: 'Merch Drop',          description: 'Exclusive ViaConnect branded wellness gear and accessories', cost: 1500 },
  { icon: Star,        glow: 'orange' as const, name: 'VIP Early Access',    description: 'Be first to try new products, features, and health programs', cost: 2500 },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function RedeemPage() {
  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-[22px] font-extrabold text-[#B75E18]">Spend Your Helix</h2>
        <p className="text-[14px] text-white/40 mt-1">
          Redeem your earned Helix for premium rewards, products, and experiences
        </p>
      </motion.div>

      {/* Rewards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {REWARDS.map((rw, i) => (
          <RewardCard
            key={rw.name}
            icon={rw.icon}
            glow={rw.glow}
            name={rw.name}
            description={rw.description}
            cost={rw.cost}
            userBalance={USER_BALANCE}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
