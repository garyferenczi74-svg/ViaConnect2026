'use client';

import React from 'react';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  multiplier: number;
  recoveryAvailable: boolean;
  nextMilestone: number;
  nextMultiplier: number;
}

export function StreakDisplay({
  currentStreak,
  longestStreak,
  multiplier,
  recoveryAvailable,
  nextMilestone,
  nextMultiplier,
}: StreakDisplayProps) {
  const getFlameSize = () => {
    if (currentStreak >= 90) return { fontSize: '48px', badge: '3x', pulse: true };
    if (currentStreak >= 30) return { fontSize: '40px', badge: '2x', pulse: false };
    if (currentStreak >= 7) return { fontSize: '32px', badge: '1.5x', pulse: false };
    return { fontSize: '24px', badge: null, pulse: false };
  };

  const flame = getFlameSize();

  return (
    <div className="flex items-center gap-3">
      {/* Flame icon with optional badge */}
      <div className="relative flex-shrink-0">
        <span
          className={flame.pulse ? 'animate-pulse' : ''}
          style={{ fontSize: flame.fontSize, lineHeight: 1 }}
        >
          🔥
        </span>
        {flame.badge && (
          <span
            className="absolute -top-1 -right-2 rounded-full px-1 py-0.5 text-[10px] font-bold"
            style={{
              backgroundColor: 'rgba(45, 165, 160, 0.15)',
              color: '#2DA5A0',
            }}
          >
            {flame.badge}
          </span>
        )}
      </div>

      {/* Streak info */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">
            {currentStreak}-day streak
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-xs font-bold"
            style={{
              backgroundColor: 'rgba(45, 165, 160, 0.15)',
              color: '#2DA5A0',
            }}
          >
            {multiplier}x
          </span>
          {recoveryAvailable && (
            <span className="relative group cursor-help" title="Recovery available">
              <span className="text-sm">🛡️</span>
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded bg-navy-800 px-2 py-1 text-xs text-white shadow-lg">
                Recovery available
              </span>
            </span>
          )}
        </div>
        <span className="text-xs text-tertiary">
          Next: {nextMilestone} days → {nextMultiplier}x
        </span>
      </div>
    </div>
  );
}
