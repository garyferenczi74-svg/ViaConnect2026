'use client';

// Prompt #168 Apply A: nutrient slider for QuickLogModal.
// Pure presentational. Parent owns debounce + scoring effect.
// Token map per Section 6 of docs/superpowers/plans/2026-05-14-prompt-168-meal-foundation.md.

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

  const markers: ReadonlyArray<MarkerSpec> = useMemo(() => {
    if (perMealTarget === undefined || perMealTarget <= 0) return [];
    const span = max - min;
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
  }, [perMealTarget, min, max]);

  const accessibleLabel = ariaLabel ?? `${label} in ${unit}, currently ${Math.round(value)}`;

  return (
    <div className="font-[Instrument_Sans] text-white">
      <div className="mb-1 flex items-baseline justify-between">
        <label htmlFor={inputId} className="text-[13px] font-medium text-white/85">
          {label}
        </label>
        <span className="text-[13px] tabular-nums text-white/95">
          {formatValue(value, unit)}
        </span>
      </div>

      <div className="relative">
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
            background: `linear-gradient(to right, rgba(45,165,160,0.55) 0%, rgba(45,165,160,0.55) ${
              max - min > 0 ? ((value - min) / (max - min)) * 100 : 0
            }%, rgba(255,255,255,0.10) ${
              max - min > 0 ? ((value - min) / (max - min)) * 100 : 0
            }%, rgba(255,255,255,0.10) 100%)`,
            borderRadius: '9999px',
          }}
        />

        {markers.length > 0 ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-1/2 h-3 -translate-y-1/2"
          >
            {markers.map((marker, idx) => (
              <span
                key={`${marker.color}-${idx}`}
                className="absolute top-0 block h-3 w-[2px] rounded-full"
                style={{
                  left: `${marker.pct}%`,
                  background: marker.color,
                  transform: 'translateX(-1px)',
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
