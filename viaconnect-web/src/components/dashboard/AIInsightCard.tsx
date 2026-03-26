'use client';

import React from 'react';

export default function AIInsightCard() {
  return (
    <section className="px-6 py-4">
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'rgba(183, 94, 24, 0.08)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(183, 94, 24, 0.15)',
        }}
      >
        {/* Header — Icon + Title */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
            style={{
              background: '#b75e18',
              boxShadow: '0 0 16px rgba(183, 94, 24, 0.4)',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '18px', color: '#ffffff' }}
            >
              lightbulb
            </span>
          </div>
          <span className="text-sm font-bold" style={{ color: '#b75e18' }}>
            AI Health Insight
          </span>
        </div>

        {/* Body Text */}
        <p
          className="mt-3 text-sm leading-relaxed"
          style={{ color: '#e2e8f0' }}
        >
          Your HRV has been trending up for 3 days. This suggests high metabolic
          flexibility. We recommend increasing your training intensity by 10%
          today.
        </p>
      </div>
    </section>
  );
}
