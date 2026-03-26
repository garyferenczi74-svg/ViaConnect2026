'use client';

import React from 'react';

const portalTabs = [
  { label: 'ADMIN', isAdmin: true },
  { label: 'Consumer', isActive: true },
  { label: 'Practitioner' },
  { label: 'Naturopath' },
];

export default function TopNav() {
  return (
    <nav
      className="sticky top-0 z-50 w-full"
      style={{
        background: 'rgba(13, 18, 37, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      {/* ROW 1 — Portal Tabs */}
      <div className="flex items-center gap-2 px-6 pt-4 pb-3">
        {portalTabs.map((tab) => {
          if (tab.isAdmin) {
            return (
              <button
                key={tab.label}
                className="text-sm font-bold tracking-wide mr-1"
                style={{ color: '#b75e18' }}
              >
                {tab.label}
              </button>
            );
          }
          if (tab.isActive) {
            return (
              <button
                key={tab.label}
                className="glass text-sm font-semibold text-white rounded-full px-4 py-1.5"
              >
                {tab.label}
              </button>
            );
          }
          return (
            <button
              key={tab.label}
              className="text-sm font-medium px-3 py-1.5"
              style={{ color: '#cbd5e1' }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ROW 2 — Greeting Bar */}
      <div className="flex items-center justify-between px-6 pb-4">
        {/* Left — Brand + Greeting */}
        <div>
          <p
            className="font-bold uppercase tracking-widest"
            style={{ fontSize: '11px', color: '#94a3b8' }}
          >
            ViaConnect&trade;
          </p>
          <h1 className="text-2xl font-bold text-white leading-tight">
            Good morning, Gary
          </h1>
        </div>

        {/* Right — Bell + Avatar */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <button
            className="relative flex items-center justify-center w-10 h-10 rounded-full glass-hover transition-colors"
            style={{
              background: 'rgba(18, 27, 55, 0.7)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', color: '#94a3b8' }}
            >
              notifications
            </span>
            {/* Amber dot indicator */}
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ background: '#b75e18' }}
            />
          </button>

          {/* User Avatar */}
          <div
            className="w-10 h-10 rounded-full overflow-hidden"
            style={{ border: '2px solid #b75e18' }}
          >
            <div
              className="w-full h-full rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: '#1a2444' }}
            >
              GF
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
