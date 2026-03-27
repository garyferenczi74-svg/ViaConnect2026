'use client';

import React from 'react';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SCORE = 87;
const OFFSET = CIRCUMFERENCE - (SCORE / 100) * CIRCUMFERENCE;

export default function HeroStats() {
  return (
    <section className="flex items-start justify-between px-6 pt-6 pb-2">
      {/* Genome Score Ring */}
      <div className="relative flex-shrink-0" style={{ width: 128, height: 128 }}>
        <svg
          width="128"
          height="128"
          viewBox="0 0 128 128"
          className="transform -rotate-90"
        >
          {/* Track */}
          <circle
            cx="64"
            cy="64"
            r={RADIUS}
            fill="none"
            stroke="#1a2444"
            strokeWidth="10"
          />
          {/* Progress */}
          <circle
            cx="64"
            cy="64"
            r={RADIUS}
            fill="none"
            stroke="#b75e18"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={OFFSET}
            style={{
              filter: 'drop-shadow(0 0 10px rgba(183, 94, 24, 0.5))',
            }}
          />
        </svg>
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[30px] font-bold text-white leading-none">
            {SCORE}
          </span>
          <span
            className="font-bold uppercase tracking-widest"
            style={{ fontSize: '10px', color: '#94a3b8' }}
          >
            SCORE
          </span>
        </div>
      </div>

      {/* Right — Pill Stat Cards (matches Log Activity button size) */}
      <div className="flex flex-col gap-2 flex-shrink-0">
        <div className="glass h-10 rounded-full px-5 flex items-center justify-center gap-2">
          <span style={{ fontSize: '14px' }}>🪙</span>
          <span className="text-sm font-bold text-white">1,247</span>
        </div>
        <div className="glass h-10 rounded-full px-5 flex items-center justify-center gap-2">
          <span style={{ fontSize: '14px' }}>🔥</span>
          <span className="text-sm font-bold text-white">14 days</span>
        </div>
      </div>
    </section>
  );
}
