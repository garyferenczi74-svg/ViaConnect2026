'use client';

import React from 'react';

export default function HealthSnapshot() {
  return (
    <section className="px-6 py-4">
      <h2 className="text-xl font-bold text-white mb-4">Health Snapshot</h2>
      <div className="glass rounded-2xl p-4">
        <p className="text-sm font-semibold text-white">Not enough data</p>
        <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
          Sleep, HRV, steps, and recovery appear after a real last-sync row. This card does not invent scores.
        </p>
      </div>
    </section>
  );
}
