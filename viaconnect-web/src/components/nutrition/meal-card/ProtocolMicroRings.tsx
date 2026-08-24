'use client';

// Brief 3: protocol-tied micro rings. Fill is this-plate contribution, never
// a gene score. Educational. Existing chrome. 390 wraps, 1280 four-up.

import type { ProtocolMicroRing } from '@/lib/nutrition/meal-card-contract/types';

interface ProtocolMicroRingsProps {
  readonly rings: readonly ProtocolMicroRing[];
}

function RingSvg({ fillPct, unmeasured }: { fillPct: number; unmeasured: boolean }) {
  const size = 56;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, fillPct));
  const dash = unmeasured ? 0 : (clamped / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={unmeasured ? 'rgba(255,255,255,0.18)' : '#2DA5A0'}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

export function ProtocolMicroRings({ rings }: ProtocolMicroRingsProps) {
  if (rings.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/60 p-4 backdrop-blur-md sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
        Protocol micros
      </p>
      <p className="mt-1 text-[11px] text-white/45">
        This plate contribution. Not a gene score.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {rings.map((ring) => (
          <div
            key={ring.id}
            className="flex flex-col items-center rounded-xl border border-white/[0.08] bg-white/5 p-3 text-center"
          >
            <div className="relative">
              <RingSvg fillPct={ring.fillPct} unmeasured={ring.unmeasured} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-[11px] text-white">
                  {ring.unmeasured ? 'n/a' : ring.amount?.toFixed(ring.amount >= 10 ? 0 : 1)}
                </span>
              </div>
            </div>
            <p className="mt-1 text-[11px] font-medium text-white">{ring.label}</p>
            <p className="text-[10px] text-white/45">
              {ring.unmeasured ? 'Not on this log' : ring.unit}
            </p>
            {ring.gene && (
              <p className="mt-0.5 text-[10px] text-[#2DA5A0]/80">{ring.gene}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
