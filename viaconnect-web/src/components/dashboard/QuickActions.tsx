'use client';

import React from 'react';

const actions = [
  { label: 'Log Activity', icon: 'bolt', primary: true },
  { label: 'Sync Data', icon: 'fingerprint' },
  { label: 'Log Meal', icon: 'restaurant' },
  { label: 'Lab Results', icon: 'science' },
];

export default function QuickActions() {
  return (
    <section className="px-6 py-4">
      <div className="flex gap-3 overflow-x-auto no-scrollbar">
        {actions.map((action) =>
          action.primary ? (
            <button
              key={action.label}
              className="flex items-center gap-2 h-10 px-5 rounded-full font-bold text-sm text-white flex-shrink-0 transition-shadow"
              style={{
                background: '#b75e18',
                boxShadow: '0 0 16px rgba(183, 94, 24, 0.25)',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '18px', color: '#ffffff' }}
              >
                {action.icon}
              </span>
              {action.label}
            </button>
          ) : (
            <button
              key={action.label}
              className="flex items-center gap-2 h-10 px-5 rounded-full font-medium text-sm flex-shrink-0 glass glass-hover transition-colors"
              style={{ color: '#e2e8f0' }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '18px', color: '#b75e18' }}
              >
                {action.icon}
              </span>
              {action.label}
            </button>
          )
        )}
      </div>
    </section>
  );
}
