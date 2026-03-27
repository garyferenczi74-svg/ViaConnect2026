'use client';

import React from 'react';
import { Share2 } from 'lucide-react';

type Tier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
type Status = 'locked' | 'in_progress' | 'unlocked';

interface Achievement {
  id: string;
  name: string;
  icon: string;
  tier: Tier;
  status: Status;
  progress: number;
  requirementValue: number;
  unlockedAt?: string;
}

interface AchievementBadgeProps {
  achievement: Achievement;
  size: 'sm' | 'md' | 'lg';
  showProgress: boolean;
  onShare?: () => void;
}

const TIER_COLORS: Record<Tier, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
};

const SIZE_CONFIG = {
  sm: { container: 'w-16 h-20', icon: 'text-2xl', ring: 48, ringStroke: 3, nameClass: 'text-xs' },
  md: { container: 'w-20 h-24', icon: 'text-3xl', ring: 60, ringStroke: 3, nameClass: 'text-sm' },
  lg: { container: 'w-28 h-32', icon: 'text-4xl', ring: 80, ringStroke: 4, nameClass: 'text-sm' },
};

export function AchievementBadge({
  achievement,
  size,
  showProgress,
  onShare,
}: AchievementBadgeProps) {
  const tierColor = TIER_COLORS[achievement.tier];
  const config = SIZE_CONFIG[size];
  const progressPct = Math.min(
    (achievement.progress / achievement.requirementValue) * 100,
    100
  );

  const ringRadius = (config.ring - config.ringStroke * 2) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference - (progressPct / 100) * ringCircumference;

  const getBorderStyle = (): React.CSSProperties => {
    if (achievement.status === 'locked') {
      return {
        border: `2px dashed ${tierColor}4D`, // 30% opacity
        backgroundColor: 'rgb(30, 41, 59)', // navy-700 approx
      };
    }
    if (achievement.status === 'in_progress') {
      return {
        border: `2px solid ${tierColor}80`, // 50% opacity
      };
    }
    // unlocked
    return {
      border: `2px solid ${tierColor}`,
      boxShadow: `0 0 12px ${tierColor}40`,
    };
  };

  const getIconStyle = (): React.CSSProperties => {
    if (achievement.status === 'locked') {
      return { filter: 'grayscale(1)' };
    }
    if (achievement.status === 'in_progress') {
      return { opacity: 0.7 };
    }
    return {};
  };

  const showRing =
    showProgress && achievement.status !== 'unlocked';

  return (
    <div className={`${config.container} flex flex-col items-center gap-1 relative`}>
      {/* Share button */}
      {onShare && achievement.status === 'unlocked' && (
        <button
          onClick={onShare}
          className="absolute -top-1 -right-1 z-10 p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <Share2 size={12} className="text-white" />
        </button>
      )}

      {/* Badge circle */}
      <div
        className="relative flex items-center justify-center rounded-full flex-shrink-0"
        style={{
          width: config.ring,
          height: config.ring,
          ...getBorderStyle(),
        }}
      >
        {/* Progress ring */}
        {showRing && (
          <svg
            className="absolute inset-0"
            width={config.ring}
            height={config.ring}
            style={{ transform: 'rotate(-90deg)' }}
          >
            <circle
              cx={config.ring / 2}
              cy={config.ring / 2}
              r={ringRadius}
              fill="none"
              stroke={`${tierColor}20`}
              strokeWidth={config.ringStroke}
            />
            <circle
              cx={config.ring / 2}
              cy={config.ring / 2}
              r={ringRadius}
              fill="none"
              stroke={tierColor}
              strokeWidth={config.ringStroke}
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
        )}

        {/* Icon */}
        <span className={config.icon} style={getIconStyle()}>
          {achievement.icon}
        </span>
      </div>

      {/* Name */}
      <span
        className={`${config.nameClass} text-center text-white leading-tight line-clamp-2`}
      >
        {achievement.name}
      </span>

      {/* Progress / Date info */}
      {achievement.status === 'in_progress' && (
        <span className="text-[10px] text-secondary">
          {Math.round(progressPct)}%
        </span>
      )}
      {achievement.status === 'unlocked' && achievement.unlockedAt && (
        <span className="text-[10px] text-tertiary">
          {new Date(achievement.unlockedAt).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}
