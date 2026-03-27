'use client';

import React from 'react';

interface ViaTokensBalanceProps {
  balance: number;
  multiplier: number;
  streak: number;
  lifetimeEarned: number;
  size: 'sm' | 'md' | 'lg';
}

export function ViaTokensBalance({
  balance,
  multiplier,
  streak,
  lifetimeEarned,
  size,
}: ViaTokensBalanceProps) {
  // sm: inline nav bar display
  if (size === 'sm') {
    return (
      <div className="inline-flex items-center gap-1.5">
        <span className="text-sm">🪙</span>
        <span className="text-sm font-semibold" style={{ color: '#2DA5A0' }}>
          {balance.toLocaleString()}
        </span>
      </div>
    );
  }

  // md: widget card
  if (size === 'md') {
    return (
      <div className="glass-v2 p-4 rounded-xl">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg text-2xl"
            style={{ backgroundColor: 'rgba(45, 165, 160, 0.12)' }}
          >
            🪙
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white">
              {balance.toLocaleString()}
            </span>
            <span className="text-xs text-secondary">VT</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">🔥</span>
          <span className="text-xs text-secondary">{streak}</span>
          <span
            className="rounded-full px-2 py-0.5 text-xs font-bold"
            style={{
              backgroundColor: 'rgba(45, 165, 160, 0.12)',
              color: '#2DA5A0',
            }}
          >
            {multiplier}x
          </span>
        </div>
      </div>
    );
  }

  // lg: full display
  return (
    <div className="glass-v2 p-6 rounded-xl">
      <div className="flex items-center gap-4 mb-4">
        <span className="text-4xl">🪙</span>
        <div className="flex items-baseline gap-2">
          <span
            className="text-white"
            style={{ fontSize: '44px', fontWeight: 700, lineHeight: 1.1 }}
          >
            {balance.toLocaleString()}
          </span>
          <span className="text-sm text-secondary">ViaTokens</span>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">🔥</span>
        <span className="text-sm font-bold text-white">
          {streak}-day streak
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-bold"
          style={{
            backgroundColor: 'rgba(45, 165, 160, 0.12)',
            color: '#2DA5A0',
          }}
        >
          {multiplier}x
        </span>
      </div>
      <p className="text-xs text-tertiary">
        Lifetime earned: {lifetimeEarned.toLocaleString()} VT
      </p>
    </div>
  );
}
