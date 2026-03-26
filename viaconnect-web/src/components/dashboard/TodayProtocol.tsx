'use client';

import React from 'react';

interface ProtocolItem {
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  completed: boolean;
}

const protocols: ProtocolItem[] = [
  {
    title: 'AM Bio-Stack',
    subtitle: 'Omega-3, Vitamin D3 + K2',
    icon: 'pill',
    iconColor: '#b75e18',
    completed: true,
  },
  {
    title: 'Zone 2 Cardio',
    subtitle: '45 minutes at 135 bpm',
    icon: 'fitness_center',
    iconColor: '#4ade80',
    completed: false,
  },
];

export default function TodayProtocol() {
  return (
    <section className="px-6 py-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Today&apos;s Protocol</h2>
        <button
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: '#b75e18' }}
        >
          View All
        </button>
      </div>

      {/* Protocol Cards */}
      <div className="flex flex-col gap-3">
        {protocols.map((item) => (
          <div
            key={item.title}
            className="glass rounded-2xl p-4 flex items-center gap-3"
          >
            {/* Icon Container */}
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
              style={{ background: `${item.iconColor}1f` }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '22px', color: item.iconColor }}
              >
                {item.icon}
              </span>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-white">{item.title}</p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>
                {item.subtitle}
              </p>
            </div>

            {/* Checkbox */}
            {item.completed ? (
              <div
                className="flex items-center justify-center w-6 h-6 rounded flex-shrink-0"
                style={{
                  border: '2px solid #b75e18',
                  background: 'rgba(183, 94, 24, 0.12)',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '16px', color: '#b75e18' }}
                >
                  check
                </span>
              </div>
            ) : (
              <div
                className="w-6 h-6 rounded flex-shrink-0"
                style={{ border: '2px solid #334155' }}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
