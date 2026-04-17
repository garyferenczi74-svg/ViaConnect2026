'use client';

import { AvatarViewer } from './AvatarViewer';
import type { BodyModelParameters } from '@/lib/arnold/scanning/types';

interface AvatarComparisonProps {
  beforeParams: BodyModelParameters;
  afterParams: BodyModelParameters;
  beforeLabel: string;
  afterLabel: string;
}

export function AvatarComparison({ beforeParams, afterParams, beforeLabel, afterLabel }: AvatarComparisonProps) {
  const deltas = {
    bodyFat: round1(afterParams.bodyFatPct - beforeParams.bodyFatPct),
    waist:   round1(afterParams.waistCircCm - beforeParams.waistCircCm),
    chest:   round1(afterParams.chestCircCm - beforeParams.chestCircCm),
    hip:     round1(afterParams.hipCircCm - beforeParams.hipCircCm),
    bicep:   round1(afterParams.bicepCircCm - beforeParams.bicepCircCm),
    thigh:   round1(afterParams.thighCircCm - beforeParams.thighCircCm),
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">{beforeLabel}</p>
          <AvatarViewer params={beforeParams} showControls={false} initialView="front" />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2DA5A0]">{afterLabel}</p>
          <AvatarViewer params={afterParams} showControls={false} initialView="front" />
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-2">Deltas</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
          <DeltaCell label="Body fat" value={deltas.bodyFat} unit="%" preferDown />
          <DeltaCell label="Waist"    value={deltas.waist}   unit="cm" preferDown />
          <DeltaCell label="Chest"    value={deltas.chest}   unit="cm" preferDown={false} />
          <DeltaCell label="Hip"      value={deltas.hip}     unit="cm" preferDown />
          <DeltaCell label="Bicep"    value={deltas.bicep}   unit="cm" preferDown={false} />
          <DeltaCell label="Thigh"    value={deltas.thigh}   unit="cm" preferDown={false} />
        </div>
      </div>
    </div>
  );
}

function DeltaCell({ label, value, unit, preferDown }: { label: string; value: number; unit: string; preferDown: boolean }) {
  const isGood = preferDown ? value < 0 : value > 0;
  const color = value === 0 ? '#9CA3AF' : isGood ? '#22C55E' : '#F97316';
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1.5">
      <p className="text-[10px] text-white/50">{label}</p>
      <p className="text-xs font-semibold" style={{ color }}>
        {value > 0 ? '+' : ''}{value.toFixed(1)} {unit}
      </p>
    </div>
  );
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
