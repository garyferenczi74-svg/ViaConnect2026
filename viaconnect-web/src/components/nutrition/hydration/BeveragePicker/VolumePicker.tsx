// Prompt 172e Phase B: VolumePicker component.
//
// Step UI for the selected beverage's volume. Shows the default volume from
// the catalog row and the user's current value side by side so the user can
// see how their adjustment compares. Comma separated copy per the master
// brief: "Default 240 ml, Yours 350 ml". No em or en dashes.
//
// Volume is clamped 30 ml to 1000 ml per spec section 10. Steps are 50 ml
// or 1 oz (mapped to 30 ml) when the parent passes the oz hint.

'use client';

import { Minus, Plus } from 'lucide-react';
import {
  getHydrationMicrocopy,
  type HydrationMicrocopyVariant,
} from '@/lib/nutrition/microcopy/hydration';
import type { BeverageCatalogRow } from './BeveragePicker.types';
import { VOLUME_MAX_ML, VOLUME_MIN_ML } from './picker-state';

export interface VolumePickerProps {
  beverage: BeverageCatalogRow;
  volumeMl: number;
  onIncrement: () => void;
  onDecrement: () => void;
  variant: HydrationMicrocopyVariant;
  unit: 'ml' | 'oz';
}

function mlToOz(ml: number): number {
  return Math.round(ml / 29.5735);
}

function formatVolume(ml: number, unit: 'ml' | 'oz'): string {
  if (unit === 'oz') {
    return `${mlToOz(ml)} oz`;
  }
  return `${ml} ml`;
}

export function VolumePicker({
  beverage,
  volumeMl,
  onIncrement,
  onDecrement,
  variant,
  unit,
}: VolumePickerProps): JSX.Element {
  const title = getHydrationMicrocopy('volume.title', variant);
  const defaultLabel = getHydrationMicrocopy('volume.default_label', variant);
  const yoursLabel = getHydrationMicrocopy('volume.yours_label', variant);
  const decrementLabel = getHydrationMicrocopy('volume.decrement_label', variant);
  const incrementLabel = getHydrationMicrocopy('volume.increment_label', variant);

  const atMin = volumeMl <= VOLUME_MIN_ML;
  const atMax = volumeMl >= VOLUME_MAX_ML;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[#1E3054]/55 p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <span className="text-[11px] text-white/55">{beverage.display_name}</span>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onDecrement}
          disabled={atMin}
          aria-label={decrementLabel}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white transition-colors hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2DA5A0] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
        </button>

        <div
          className="min-w-[120px] text-center text-3xl font-semibold text-white tabular-nums"
          aria-live="polite"
        >
          {formatVolume(volumeMl, unit)}
        </div>

        <button
          type="button"
          onClick={onIncrement}
          disabled={atMax}
          aria-label={incrementLabel}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white transition-colors hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2DA5A0] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      <p className="text-center text-[12px] text-white/65">
        {defaultLabel} {formatVolume(beverage.default_volume_ml, unit)} · {yoursLabel} {formatVolume(volumeMl, unit)}
      </p>
    </div>
  );
}
