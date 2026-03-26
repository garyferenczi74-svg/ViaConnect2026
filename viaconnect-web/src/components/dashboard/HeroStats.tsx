'use client';

import React from 'react';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SCORE = 87;
const OFFSET = CIRCUMFERENCE - (SCORE / 100) * CIRCUMFERENCE;

export default function HeroStats() {
  return (
    <section className="flex items-center gap-5 px-6 pt-6 pb-2">
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

      {/* Right — Stat Cards */}
      <div className="flex flex-col gap-3 flex-1 min-w-0">
        {/* FarmaTokens Card */}
        <div
          className="glass rounded-2xl px-4 py-3"
        >
          <p
            className="font-bold uppercase tracking-widest"
            style={{ fontSize: '10px', color: '#94a3b8' }}
          >
            <span className="mr-1">🪙</span> FarmaTokens
          </p>
          <p className="text-2xl font-bold text-white mt-0.5">1,247</p>
        </div>

        {/* Streak Card */}
        <div
          className="glass rounded-2xl px-4 py-3 flex items-center justify-between"
        >
          <div>
            <p
              className="font-bold uppercase tracking-widest"
              style={{ fontSize: '10px', color: '#94a3b8' }}
            >
              <span className="mr-1">🔥</span> Streak
            </p>
            <p className="text-lg font-bold text-white mt-0.5">14 days</p>
          </div>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '24px', color: '#b75e18' }}
          >
            trending_up
          </span>
        </div>
      </div>
    </section>
  );
}
