'use client';

import React from 'react';

export default function DailyResearch() {
  return (
    <section className="px-6 py-4">
      <h2 className="text-xl font-bold text-white mb-4">Daily Research</h2>

      <div className="glass rounded-2xl overflow-hidden">
        {/* Header Image Area */}
        <div
          className="relative h-32"
          style={{
            background: 'linear-gradient(135deg, #141c35 0%, #1a2444 100%)',
          }}
        >
          {/* Molecular dot pattern overlay */}
          <svg
            className="absolute inset-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <pattern
              id="dots"
              x="0"
              y="0"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.03)" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
          {/* Decorative molecule lines */}
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.04]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line x1="20%" y1="30%" x2="45%" y2="60%" stroke="white" strokeWidth="1" />
            <line x1="45%" y1="60%" x2="70%" y2="35%" stroke="white" strokeWidth="1" />
            <line x1="70%" y1="35%" x2="85%" y2="70%" stroke="white" strokeWidth="1" />
            <circle cx="20%" cy="30%" r="3" fill="rgba(183,94,24,0.3)" />
            <circle cx="45%" cy="60%" r="4" fill="rgba(183,94,24,0.2)" />
            <circle cx="70%" cy="35%" r="3" fill="rgba(183,94,24,0.3)" />
            <circle cx="85%" cy="70%" r="3" fill="rgba(183,94,24,0.2)" />
          </svg>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-3">
          {/* PubMed Tag */}
          <span
            className="inline-block self-start font-bold uppercase tracking-widest rounded px-2 py-0.5"
            style={{
              fontSize: '10px',
              color: '#94a3b8',
              background: '#1a2444',
            }}
          >
            PubMed Ref: 3491208
          </span>

          {/* Title */}
          <h3 className="text-base font-bold text-white leading-snug">
            Effect of NAD+ Precursors on Mitochondrial Biogenesis and Longevity
          </h3>

          {/* Description — 2-line clamp */}
          <p
            className="text-xs leading-relaxed"
            style={{
              color: '#94a3b8',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            Recent clinical trials demonstrate that NMN supplementation
            significantly increases systemic NAD+ levels in adults over 45,
            improving mitochondrial function and cellular energy production.
          </p>

          {/* Read Summary Link */}
          <button
            className="inline-flex items-center gap-1 self-start font-bold uppercase tracking-widest"
            style={{ fontSize: '12px', color: '#b75e18' }}
          >
            Read Summary
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '14px' }}
            >
              arrow_forward
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
