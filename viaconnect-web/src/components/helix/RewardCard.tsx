'use client';

import { motion } from 'framer-motion';
import { HelixIcon } from './HelixIcon';

interface RewardCardProps {
  emoji: string;
  name: string;
  description: string;
  cost: number;
  userBalance: number;
  index?: number;
}

export function RewardCard({ emoji, name, description, cost, userBalance, index = 0 }: RewardCardProps) {
  const canAfford = userBalance >= cost;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: 'easeOut' }}
      whileHover={canAfford ? { y: -2, borderColor: 'rgba(255,255,255,0.14)' } : undefined}
      className={`relative overflow-hidden rounded-[20px] p-7 bg-[rgba(26,39,68,0.55)] backdrop-blur-[24px] backdrop-saturate-[160%] border border-white/[0.08] transition-shadow flex flex-col ${
        canAfford ? 'hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]' : 'opacity-50'
      }`}
    >
      {/* Rim light */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }}
      />

      <span className="text-5xl mb-4">{emoji}</span>
      <h3 className="text-[16px] font-extrabold text-white mb-1">{name}</h3>
      <p className="text-xs text-white/50 mb-4 flex-1">{description}</p>

      {/* Cost */}
      <div className="flex items-center gap-1.5 mb-4">
        <HelixIcon size={16} />
        <span className="text-lg font-extrabold text-[#B75E18]">{cost.toLocaleString()}</span>
        <span className="text-xs text-white/35 font-semibold">Helix</span>
      </div>

      {/* Button */}
      {canAfford ? (
        <button className="w-full py-3 rounded-xl bg-gradient-to-r from-[#B75E18] to-[#d4751f] text-white text-sm font-bold hover:opacity-90 transition-opacity">
          Redeem
        </button>
      ) : (
        <button
          disabled
          className="w-full py-3 rounded-xl bg-white/[0.06] text-white/30 text-sm font-bold cursor-not-allowed"
        >
          Need More
        </button>
      )}
    </motion.div>
  );
}
