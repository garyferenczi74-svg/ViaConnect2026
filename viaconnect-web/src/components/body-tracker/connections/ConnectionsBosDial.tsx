'use client';

import type { ConnectionsBosDisplay } from '@/lib/body-tracker/wearable-tiles';

export function ConnectionsBosDial({
  composite,
  size = 'hero',
}: {
  composite: ConnectionsBosDisplay;
  size?: 'hero' | 'cluster';
}) {
  const unknown = composite.band === 'UNKNOWN' || composite.value === '--';
  const box = size === 'cluster' ? 'h-16 w-16' : 'h-36 w-36';
  const valueClass = size === 'cluster' ? 'text-lg' : 'text-3xl';
  const bandClass = size === 'cluster' ? 'text-[8px]' : 'text-[10px]';
  const valueColor = unknown ? 'text-white/40' : 'text-white';
  const bandColor = unknown ? 'text-white/40' : 'text-white/70';

  return (
    <div
      className={`flex flex-col items-center ${size === 'hero' ? 'mt-5' : ''}`}
      data-bos-composite={composite.band.toLowerCase()}
    >
      <div className={`relative ${box}`}>
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
          <circle
            cx="60"
            cy="60"
            r="48"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="8"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`${valueClass} font-bold ${valueColor}`}
            aria-label={unknown ? 'No score yet' : `Bio Optimization Score ${composite.value}`}
          >
            {composite.value}
          </span>
          <span
            className={`mt-1 ${bandClass} font-semibold uppercase tracking-[0.18em] ${bandColor}`}
          >
            {composite.band}
          </span>
        </div>
      </div>
    </div>
  );
}
