'use client';

import type { ConnectionsBosDisplay } from '@/lib/body-tracker/wearable-tiles';

export function ConnectionsBosDial({
  composite,
}: {
  composite: ConnectionsBosDisplay;
}) {
  return (
    <div
      className="mt-5 flex flex-col items-center"
      data-bos-composite={composite.band.toLowerCase()}
    >
      <div className="relative h-36 w-36">
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
          <span className="text-3xl font-bold text-white/40" aria-label="No score yet">
            {composite.value}
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            {composite.band}
          </span>
        </div>
      </div>
    </div>
  );
}
