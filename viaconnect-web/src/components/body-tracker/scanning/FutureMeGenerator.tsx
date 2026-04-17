'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { AvatarViewer } from './AvatarViewer';
import { NumberField } from '@/components/body-tracker/manual-input/NumberField';
import { projectFutureMe } from '@/lib/arnold/scanning/futureMeProjector';
import type { BodyModelParameters } from '@/lib/arnold/scanning/types';

interface FutureMeGeneratorProps {
  currentParams: BodyModelParameters;
  currentWeightKg: number;
}

export function FutureMeGenerator({ currentParams, currentWeightKg }: FutureMeGeneratorProps) {
  const defaultGoalBF = Math.max(
    currentParams.sex === 'male' ? 12 : 22,
    Math.round(currentParams.bodyFatPct - 4),
  );
  const [goalBF, setGoalBF] = useState<number | null>(defaultGoalBF);
  const [goalWeightKg, setGoalWeightKg] = useState<number | null>(
    Math.max(40, Math.round(currentWeightKg - 4.5)),
  );

  const projection = useMemo(() => {
    if (goalBF === null || goalWeightKg === null) return null;
    return projectFutureMe({
      currentParams,
      currentWeightKg,
      goalWeightKg,
      goalBodyFatPct: goalBF,
    });
  }, [currentParams, currentWeightKg, goalBF, goalWeightKg]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8803A]/20">
          <Sparkles className="h-4 w-4 text-[#E8803A]" strokeWidth={1.5} />
        </div>
        <h3 className="text-sm font-bold text-white">FutureMe, goal visualization</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <NumberField
          label="Goal weight"
          value={goalWeightKg === null ? null : Math.round(goalWeightKg * 2.20462262 * 10) / 10}
          onChange={(v) => setGoalWeightKg(v === null ? null : v / 2.20462262)}
          unit="lbs"
        />
        <NumberField
          label="Goal body fat"
          value={goalBF}
          onChange={(v) => setGoalBF(v)}
          unit="%"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Today</p>
          <AvatarViewer params={currentParams} showControls={false} initialView="front" />
          <p className="text-xs text-white/65 text-center">
            {currentParams.bodyFatPct.toFixed(1)}% body fat, waist {currentParams.waistCircCm.toFixed(1)} cm
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#E8803A]">Your goal</p>
          {projection ? (
            <>
              <AvatarViewer params={projection.params} showControls={false} initialView="front" />
              <p className="text-xs text-white/65 text-center">
                {projection.params.bodyFatPct.toFixed(1)}% body fat, waist {projection.params.waistCircCm.toFixed(1)} cm
              </p>
            </>
          ) : (
            <div className="aspect-[3/4] rounded-2xl border border-white/[0.08] bg-[#0B1520] flex items-center justify-center text-white/40 text-xs">
              Enter goal values
            </div>
          )}
        </div>
      </div>

      {projection && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/75 p-4 space-y-3 text-xs text-white/75 leading-relaxed">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
            <DeltaCell label="Waist"  value={projection.measurementDeltas.waistCm} />
            <DeltaCell label="Hip"    value={projection.measurementDeltas.hipCm} />
            <DeltaCell label="Chest"  value={projection.measurementDeltas.chestCm} />
            <DeltaCell label="Thigh"  value={projection.measurementDeltas.thighCm} />
            <DeltaCell label="Bicep"  value={projection.measurementDeltas.bicepCm} />
          </div>

          <p>
            <span className="text-white font-semibold">Timeline, </span>
            approximately {projection.weeksToGoal} weeks
            {projection.estimatedDate ? `, reaching ${formatDate(projection.estimatedDate)}` : ''}.
          </p>
          <p className="text-white/55">{projection.assumptionsNote}</p>

          <div className="flex items-start gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-2 text-[11px] text-[#FCD34D]">
            <AlertTriangle className="h-4 w-4 flex-none mt-0.5" strokeWidth={1.5} />
            <span>
              FutureMe is an AI projection, not a guarantee. Actual results depend on nutrition,
              training consistency, sleep, and individual biology.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function DeltaCell({ label, value }: { label: string; value: number }) {
  const positive = value > 0;
  const negative = value < 0;
  const color = negative ? '#22C55E' : positive ? '#EF4444' : '#9CA3AF';
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1.5">
      <p className="text-[10px] text-white/50">{label}</p>
      <p className="text-xs font-semibold" style={{ color }}>
        {value > 0 ? '+' : ''}{value.toFixed(1)} cm
      </p>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}
