'use client';

// Prompt #168 Apply A: nutrient slider for QuickLogModal.
// Updated 2026-05-15 per Gary: floating value pill rides on the thumb position
// and updates live as the user drags. Pattern mirrors the 21st.dev slider+tooltip
// component but built on the native range input so we don't add a Radix dep.

import { useId, useMemo } from 'react';

export interface NutrientSliderProps {
  readonly id: string;
  readonly label: string;
  readonly unit: 'g' | 'mg' | 'kcal';
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly value: number;
  readonly onChange: (v: number) => void;
  readonly perMealTarget?: number;
  readonly ariaLabel?: string;
  readonly disabled?: boolean;
}

interface MarkerSpec {
  pct: number;
  color: string;
  label: string;
}

function formatValue(value: number, unit: 'g' | 'mg' | 'kcal'): string {
  if (unit === 'kcal') return `${Math.round(value)} kcal`;
  if (unit === 'mg') return `${Math.round(value)} mg`;
  return `${Math.round(value)} g`;
}

export function NutrientSlider(props: NutrientSliderProps) {
  const {
    id,
    label,
    unit,
    min,
    max,
    step,
    value,
    onChange,
    perMealTarget,
    ariaLabel,
    disabled,
  } = props;
  const reactId = useId();
  const inputId = id || reactId;

  const span = max - min;
  const pct = span > 0 ? Math.max(0, Math.min(100, ((value - min) / span) * 100)) : 0;

  const markers: ReadonlyArray<MarkerSpec> = useMemo(() => {
    if (perMealTarget === undefined || perMealTarget <= 0) return [];
    if (span <= 0) return [];
    const baseRaw = ((perMealTarget - min) / span) * 100;
    const overRaw = ((perMealTarget * 1.30 - min) / span) * 100;
    const wideRaw = ((perMealTarget * 1.50 - min) / span) * 100;
    const result: MarkerSpec[] = [];
    if (baseRaw >= 0 && baseRaw <= 100) {
      result.push({ pct: baseRaw, color: '#2DA5A0', label: 'Per meal target' });
    }
    if (overRaw >= 0 && overRaw <= 100) {
      result.push({ pct: overRaw, color: '#C9A23A', label: '30 percent over target' });
    }
    if (wideRaw >= 0 && wideRaw <= 100) {
      result.push({ pct: wideRaw, color: '#B75E18', label: '50 percent over target' });
    }
    return result;
  }, [perMealTarget, min, max, span]);

  const accessibleLabel = ariaLabel ?? `${label} in ${unit}, currently ${Math.round(value)}`;

  return (
    <div className="font-[Instrument_Sans] text-white">
      <div className="mb-1 flex items-baseline justify-between">
        <label htmlFor={inputId} className="text-[13px] font-medium text-white/85">
          {label}
        </label>
      </div>

      {/* Track wrapper. pt-9 reserves space above the rail for the floating
          pill so it never overlaps the label row. */}
      <div className="relative pt-9">
        {/* Floating value pill. left=pct% with translateX(-50%) centers it
            on the thumb. transition-[left] is short so the pill tracks
            visually without lag during drag. pointer-events-none so it
            never intercepts the user's mouse on the track underneath. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 z-10 transition-[left] duration-75 ease-out"
          style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
        >
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-[#2DA5A0] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white shadow-lg shadow-[#2DA5A0]/30 ring-1 ring-white/20">
              {formatValue(value, unit)}
            </div>
            <svg viewBox="0 0 10 6" className="h-1.5 w-2.5 fill-[#2DA5A0]" aria-hidden="true">
              <path d="M5 6L0 0h10z" />
            </svg>
          </div>
        </div>

        <input
          id={inputId}
          type="range"
          role="slider"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-valuenow={Math.round(value)}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-label={accessibleLabel}
          className="h-11 w-full min-h-[44px] cursor-pointer appearance-none bg-transparent accent-[#2DA5A0] disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: `linear-gradient(to right, rgba(45,165,160,0.55) 0%, rgba(45,165,160,0.55) ${pct}%, rgba(255,255,255,0.10) ${pct}%, rgba(255,255,255,0.10) 100%)`,
            borderRadius: '9999px',
          }}
        />

        {markers.length > 0 ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-9 h-11"
          >
            {markers.map((marker, idx) => (
              <span
                key={`${marker.color}-${idx}`}
                className="absolute top-1/2 block h-3 w-[2px] -translate-y-1/2 rounded-full"
                style={{
                  left: `${marker.pct}%`,
                  background: marker.color,
                  transform: 'translate(-1px, -50%)',
                }}
                title={marker.label}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default NutrientSlider;
