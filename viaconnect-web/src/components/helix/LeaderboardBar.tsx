'use client';

import { motion } from 'framer-motion';
import { AvatarRing } from './AvatarRing';
import { HelixIcon } from './HelixIcon';

interface LeaderboardBarProps {
  rank: number;
  name: string;
  initials: string;
  helix: number;
  maxHelix: number;
  color: string;
  isYou?: boolean;
  index: number;
}

function getBarGradient(rank: number, color: string): string {
  if (rank === 1) return 'linear-gradient(90deg, #FFD700, #B75E18)';
  if (rank === 2) return 'linear-gradient(90deg, #C0C0C0, #2DA5A0)';
  return `linear-gradient(90deg, #2DA5A0, ${color})`;
}

export function LeaderboardBar({
  rank,
  name,
  initials,
  helix,
  maxHelix,
  color,
  isYou = false,
  index,
}: LeaderboardBarProps) {
  const percent = Math.min((helix / maxHelix) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: 'easeOut' }}
      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
        isYou
          ? 'bg-[#2DA5A0]/10 border border-[#2DA5A0]/20'
          : 'bg-white/[0.02] border border-transparent'
      }`}
    >
      {/* Rank */}
      <span className="text-sm font-bold text-white/40 w-6 text-center">{rank}</span>

      {/* Avatar */}
      <AvatarRing
        initials={initials}
        color={color}
        helix={helix}
        rank={rank <= 3 ? rank : undefined}
        size={40}
        online={rank <= 5}
      />

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white truncate">{name}</span>
          {isYou && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#2DA5A0]/20 text-[#2DA5A0] rounded">
              YOU
            </span>
          )}
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] mt-1.5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ delay: index * 0.1 + 0.3, duration: 1.2, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: getBarGradient(rank, color) }}
          />
        </div>
      </div>

      {/* Helix count */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <HelixIcon size={14} />
        <span className="text-sm font-extrabold text-white">{helix.toLocaleString()}</span>
      </div>
    </motion.div>
  );
}
