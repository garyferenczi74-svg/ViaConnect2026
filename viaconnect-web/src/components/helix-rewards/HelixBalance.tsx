'use client';

import { DNAHelixIcon } from '@/components/ui/ViaConnectLogo';
import { Trophy, Flame } from 'lucide-react';

interface HelixBalanceProps {
  balance: number;
  streak: number;
  level: number;
  levelName: string;
  lifetimeEarned: number;
  xpCurrent: number;
  xpToNextLevel: number;
  nextLevelName: string;
}

function getMultiplier(streak: number): number {
  if (streak >= 100) return 5;
  if (streak >= 30) return 3;
  if (streak >= 7) return 2;
  return 1;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function HelixBalance({
  balance,
  streak,
  level,
  levelName,
  lifetimeEarned,
  xpCurrent,
  xpToNextLevel,
  nextLevelName,
}: HelixBalanceProps) {
  const multiplier = getMultiplier(streak);
  const progressPercent = Math.min((xpCurrent / xpToNextLevel) * 100, 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Title row */}
      <div className="flex items-center gap-3">
        <DNAHelixIcon size={32} />
        <h1 className="text-heading-1 text-[#B75E18]">Helix Rewards</h1>
      </div>

      {/* Balance */}
      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-extrabold text-white">
          {formatNumber(balance)}
        </span>
        <span className="text-lg text-secondary">Helix$</span>
      </div>

      {/* Streak */}
      <div className="flex items-center gap-2">
        <Flame className="w-5 h-5 text-orange-400" />
        <span className="text-sm text-white">{streak}-day streak</span>
        {multiplier > 1 && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#2DA5A0]/20 text-[#2DA5A0] border border-[#2DA5A0]/30">
            {multiplier}x
          </span>
        )}
      </div>

      {/* Level + Progress */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#2DA5A0]" />
          <span className="text-sm text-white">
            Level {level}: {levelName}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#1A2744]">
          <div
            className="h-2 rounded-full bg-[#2DA5A0] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs text-tertiary">
          {formatNumber(xpCurrent)} / {formatNumber(xpToNextLevel)} to{' '}
          {nextLevelName}
        </span>
      </div>

      {/* Lifetime */}
      <span className="text-xs text-tertiary">
        Lifetime earned: {formatNumber(lifetimeEarned)} Helix$
      </span>
    </div>
  );
}
