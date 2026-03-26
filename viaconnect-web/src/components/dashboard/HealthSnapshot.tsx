'use client';

import React from 'react';

interface MetricCard {
  icon: string;
  iconColor: string;
  device: string;
  label: string;
  value: string;
  unit?: string;
}

const metrics: MetricCard[] = [
  {
    icon: 'bedtime',
    iconColor: '#60a5fa',
    device: 'Oura',
    label: 'Sleep Score',
    value: '92',
    unit: '/100',
  },
  {
    icon: 'favorite',
    iconColor: '#f87171',
    device: 'Whoop',
    label: 'HRV',
    value: '78',
    unit: ' ms',
  },
  {
    icon: 'directions_run',
    iconColor: '#4ade80',
    device: 'Steps',
    label: 'Today',
    value: '8,432',
  },
  {
    icon: 'battery_charging_full',
    iconColor: '#b75e18',
    device: 'Recovery',
    label: 'Ready State',
    value: 'Optimal',
  },
];

export default function HealthSnapshot() {
  return (
    <section className="px-6 py-4">
      <h2 className="text-xl font-bold text-white mb-4">Health Snapshot</h2>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="glass rounded-2xl p-4 flex flex-col gap-2">
            {/* Top row — Icon + Device tag */}
            <div className="flex items-center justify-between">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '22px', color: m.iconColor }}
              >
                {m.icon}
              </span>
              <span
                className="font-bold uppercase tracking-widest"
                style={{ fontSize: '10px', color: '#64748b' }}
              >
                {m.device}
              </span>
            </div>

            {/* Metric label */}
            <p className="text-xs" style={{ color: '#94a3b8' }}>
              {m.label}
            </p>

            {/* Value */}
            <p className="text-xl font-bold text-white leading-tight">
              {m.value}
              {m.unit && (
                <span style={{ color: '#64748b' }}>{m.unit}</span>
              )}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
