'use client';

import React from 'react';

type ChallengeStatus = 'enrolled' | 'in_progress' | 'completed' | 'failed';

interface Challenge {
  name: string;
  description: string;
  progress: number;
  goalValue: number;
  goalUnit: string;
  tokensReward: number;
  daysRemaining: number;
  status: ChallengeStatus;
}

interface ChallengeCardProps {
  challenge: Challenge;
  onEnroll: () => void;
  onViewDetails: () => void;
}

export function ChallengeCard({
  challenge,
  onEnroll,
  onViewDetails,
}: ChallengeCardProps) {
  const progressPct = Math.min(
    (challenge.progress / challenge.goalValue) * 100,
    100
  );

  return (
    <div className="glass-v2 p-4 rounded-xl">
      {/* Name */}
      <h3 className="font-semibold text-white mb-1" style={{ color: '#B75E18' }}>
        {challenge.name}
      </h3>

      {/* Description */}
      <p className="text-sm text-secondary line-clamp-2 mb-3">
        {challenge.description}
      </p>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-navy-700 mb-1.5" style={{ backgroundColor: 'rgb(30, 41, 59)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progressPct}%`,
            backgroundColor: '#2DA5A0',
          }}
        />
      </div>

      {/* Progress text */}
      <p className="text-xs text-secondary mb-2">
        {challenge.progress}/{challenge.goalValue} {challenge.goalUnit}
      </p>

      {/* Token reward & days remaining */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs" style={{ color: '#2DA5A0' }}>
          🪙 {challenge.tokensReward.toLocaleString()} ViaTokens
        </span>
        <span className="text-xs text-tertiary">
          {challenge.daysRemaining} days left
        </span>
      </div>

      {/* Bottom action */}
      <div>
        {challenge.status === 'enrolled' && (
          <button
            onClick={onEnroll}
            className="w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#2DA5A0' }}
          >
            Enroll Now
          </button>
        )}

        {challenge.status === 'in_progress' && (
          <button
            onClick={onViewDetails}
            className="w-full rounded-lg px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/5"
            style={{
              color: '#2DA5A0',
              border: '1px solid #2DA5A0',
              backgroundColor: 'transparent',
            }}
          >
            View Details
          </button>
        )}

        {challenge.status === 'completed' && (
          <div className="flex items-center justify-center gap-1.5 py-2">
            <span className="text-sm">✅</span>
            <span className="text-sm font-semibold text-green-400">
              Completed
            </span>
          </div>
        )}

        {challenge.status === 'failed' && (
          <div className="flex items-center justify-center py-2">
            <span className="text-sm font-semibold text-red-400">
              Expired
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
