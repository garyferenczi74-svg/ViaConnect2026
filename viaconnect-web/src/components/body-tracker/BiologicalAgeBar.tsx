'use client';

import { biologicalAgeMarkerPosition } from '@/lib/body-tracker/biological-age';

interface BiologicalAgeBarProps {
  biologicalAge: number;
  chronologicalAge: number;
  rangeYears?: number;
}

export function BiologicalAgeBar({
  biologicalAge,
  chronologicalAge,
  rangeYears = 15,
}: BiologicalAgeBarProps) {
  const markerPct = biologicalAgeMarkerPosition(biologicalAge, chronologicalAge, rangeYears) * 100;
  const yearsDelta = biologicalAge - chronologicalAge;
  const isYounger = yearsDelta < 0;
  const isOlder = yearsDelta > 0;
  const markerColor = isYounger ? '#22C55E' : isOlder ? '#B75E18' : '#2DA5A0';

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wider text-white/50">Biological Age</span>
        <span className="text-2xl font-bold text-white">
          {biologicalAge} <span className="text-sm font-normal text-white/50">yrs</span>
        </span>
      </div>

      <div className="relative h-2 rounded-full bg-gradient-to-r from-[#22C55E]/30 via-[#2DA5A0]/30 to-[#B75E18]/30">
        <div
          className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${markerPct}%`, backgroundColor: markerColor, boxShadow: `0 0 6px ${markerColor}` }}
          aria-label={`Biological age marker at ${biologicalAge} years`}
        />
      </div>

      <div className="flex items-baseline justify-between text-[11px] text-white/40">
        <span>Younger</span>
        <span>Older</span>
      </div>

      <div className="flex items-baseline justify-between pt-1">
        <span className="text-xs uppercase tracking-wider text-white/50">Chronological Age</span>
        <span className="text-sm font-semibold text-white">
          {chronologicalAge} <span className="text-white/50">yrs</span>
        </span>
      </div>
    </div>
  );
}
