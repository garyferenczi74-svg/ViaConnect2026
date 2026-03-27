'use client';

import { motion } from 'framer-motion';
import { HelixIcon } from './HelixIcon';

interface ChallengeCardProps {
  emoji: string;
  title: string;
  description: string;
  helix: number;
  active: boolean;
  progress: number;
  participants: number;
  index?: number;
}

export function ChallengeCard({
  emoji,
  title,
  description,
  helix,
  active,
  progress,
  participants,
  index = 0,
}: ChallengeCardProps) {
  // Generate participant avatars
  const avatarColors = ['#2DA5A0', '#B75E18', '#FFD700', '#C0C0C0', '#8B5CF6', '#F472B6'];
  const showAvatars = Math.min(participants, 4);
  const overflow = participants - showAvatars;

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
        <span className="text-4xl leading-none">{emoji}</span>
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            active
              ? 'bg-[#2DA5A0]/15 text-[#2DA5A0] border border-[#2DA5A0]/30'
              : 'bg-[#B75E18]/15 text-[#B75E18] border border-[#B75E18]/30'
          }`}
        >
          {active ? 'LIVE' : 'ENDED'}
        </span>
      </div>

      {/* Title & description */}
      <h3 className="text-[16px] font-extrabold text-white mb-1">{title}</h3>
      <p className="text-xs text-white/50 mb-4 line-clamp-2">{description}</p>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] mb-1.5">
          <span className="text-white/40 font-semibold uppercase tracking-wider">Progress</span>
          <span className="text-[#2DA5A0] font-bold">{progress}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ delay: index * 0.1 + 0.4, duration: 1.2, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-[#2DA5A0] to-[#35bdb7]"
          />
        </div>
      </div>

      {/* Bottom: avatars + reward */}
      <div className="flex items-center justify-between">
        {/* Stacked avatars */}
        <div className="flex -space-x-2">
          {Array.from({ length: showAvatars }, (_, i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-full border-2 border-[rgba(26,39,68,0.55)] flex items-center justify-center text-[9px] font-bold text-white"
              style={{ background: avatarColors[i % avatarColors.length] }}
            >
              {String.fromCharCode(65 + i)}
            </div>
          ))}
          {overflow > 0 && (
            <div className="w-7 h-7 rounded-full border-2 border-[rgba(26,39,68,0.55)] bg-white/10 flex items-center justify-center text-[9px] font-bold text-white/50">
              +{overflow}
            </div>
          )}
        </div>

        {/* Reward */}
        <div className="flex items-center gap-1">
          <HelixIcon size={14} />
          <span className="text-sm font-extrabold text-[#B75E18]">{helix.toLocaleString()}</span>
        </div>
      </div>
    </motion.div>
  );
}
