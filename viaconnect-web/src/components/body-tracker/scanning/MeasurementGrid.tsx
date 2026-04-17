'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { MeasurementCard } from './MeasurementCard';
import type { ExtractedMeasurements } from '@/lib/arnold/scanning/types';

interface MeasurementGridProps {
  measurements: ExtractedMeasurements;
  unitSystem: 'imperial' | 'metric';
  heightCm: number;
}

export function MeasurementGrid({ measurements, unitSystem, heightCm }: MeasurementGridProps) {
  const [expanded, setExpanded] = useState(false);
  const isImperial = unitSystem === 'imperial';
  const lengthUnit = isImperial ? 'in' : 'cm';

  const conv = (cm: number): number => isImperial ? cm / 2.54 : cm;

  const primary = [
    { label: 'Neck',  m: measurements.neckCirc },
    { label: 'Chest', m: measurements.chestCirc },
    { label: 'Waist, natural', m: measurements.waistNaturalCirc },
    { label: 'Hips',  m: measurements.hipCirc },
  ];

  const extended = [
    { label: 'Shoulder',    m: measurements.shoulderCirc },
    { label: 'Waist, navel', m: measurements.waistNavelCirc },
    { label: 'Right bicep',  m: measurements.rightBicepCirc },
    { label: 'Left bicep',   m: measurements.leftBicepCirc },
    { label: 'Right forearm', m: measurements.rightForearmCirc },
    { label: 'Left forearm',  m: measurements.leftForearmCirc },
    { label: 'Right thigh',  m: measurements.rightThighCirc },
    { label: 'Left thigh',   m: measurements.leftThighCirc },
    { label: 'Right calf',   m: measurements.rightCalfCirc },
    { label: 'Left calf',    m: measurements.leftCalfCirc },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {primary.map((row) => (
          <MeasurementCard key={row.label} label={row.label} measured={row.m} unitSystem={unitSystem} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <RatioCell label="Waist to hip"    value={measurements.waistToHipRatio} />
        <RatioCell label="Waist to height" value={measurements.waistToHeightRatio} />
        <RatioCell label="Shoulder to waist" value={measurements.shoulderToWaistRatio} />
      </div>

      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-white/70 hover:bg-white/[0.04] min-h-[40px]"
      >
        {expanded ? 'Hide detail' : 'View all 18+ measurements'}
        {expanded ? <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} /> : <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />}
      </button>

      {expanded && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {extended.map((row) => (
              <MeasurementCard key={row.label} label={row.label} measured={row.m} unitSystem={unitSystem} />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <LengthCell label="Inseam"       cm={measurements.inseamCm}      unit={lengthUnit} conv={conv} />
            <LengthCell label="Torso length" cm={measurements.torsoLengthCm} unit={lengthUnit} conv={conv} />
            <LengthCell label="Height"       cm={heightCm}                   unit={lengthUnit} conv={conv} />
          </div>
        </>
      )}
    </div>
  );
}

function RatioCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-center">
      <p className="text-[10px] text-white/50 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-white mt-0.5">
        {value > 0 ? value.toFixed(2) : '—'}
      </p>
    </div>
  );
}

function LengthCell({ label, cm, unit, conv }: { label: string; cm: number; unit: string; conv: (cm: number) => number }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] text-white/50 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-white mt-0.5">
        {cm > 0 ? `${conv(cm).toFixed(1)} ${unit}` : '—'}
      </p>
    </div>
  );
}
