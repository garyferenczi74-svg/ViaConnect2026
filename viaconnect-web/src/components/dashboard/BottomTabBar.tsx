'use client';

import React from 'react';

interface TabItem {
  label: string;
  icon: string;
  active?: boolean;
}

const tabs: TabItem[] = [
  { label: 'Home', icon: 'home', active: true },
  { label: 'Genomics', icon: 'genetics' },
  { label: 'Protocol', icon: 'assignment' },
  { label: 'Shop', icon: 'shopping_bag' },
  { label: 'AI Chat', icon: 'smart_toy' },
];

export default function BottomTabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6">
      <div
        className="flex items-center justify-between rounded-full px-6 py-3"
        style={{
          background: 'rgba(18, 27, 55, 0.8)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.label}
            className="flex flex-col items-center gap-0.5 min-w-0"
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '24px',
                color: tab.active ? '#b75e18' : '#64748b',
              }}
            >
              {tab.icon}
            </span>
            <span
              className="font-medium"
              style={{
                fontSize: '10px',
                color: tab.active ? '#b75e18' : '#64748b',
              }}
            >
              {tab.label}
            </span>
            {/* Active dot indicator */}
            {tab.active && (
              <span
                className="w-1 h-1 rounded-full mt-0.5"
                style={{ background: '#b75e18' }}
              />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
