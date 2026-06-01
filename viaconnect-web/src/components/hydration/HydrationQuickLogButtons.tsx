/**
 * Prompt 170o Phase 1 Phase C: HydrationQuickLogButtons component.
 *
 * Shared button row per Hannah §1 + §2 + §3 + §4. Used in Dashboard widget
 * (3 buttons), NutriVision card (2x2 grid of 4 buttons), FAB sheet (4
 * buttons + custom amount), and Detail view (3 full-size buttons).
 *
 * Metric defaults: +250 ml + 500 ml + 750 ml (+ 1000 ml).
 * Imperial defaults: +8 oz + 16 oz + 24 oz (+ 32 oz).
 * v1 ships metric only; imperial filed for Phase 1.1 supplement when
 * locale unit preference plumbing arrives.
 */

'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useHydrationQuickLog, type HydrationLogSurface } from './useHydrationQuickLog';

const VOLUMES_3 = [250, 500, 750] as const;
const VOLUMES_4 = [250, 500, 750, 1000] as const;

export interface HydrationQuickLogButtonsProps {
  surface: HydrationLogSurface;
  variant: 'three' | 'four';
  layout?: 'row' | 'grid';
  size?: 'small' | 'medium' | 'large';
  onLogged?: () => void;
}

export function HydrationQuickLogButtons({
  surface,
  variant,
  layout = 'row',
  size = 'medium',
  onLogged,
}: HydrationQuickLogButtonsProps): JSX.Element {
  const { log, loading } = useHydrationQuickLog();
  const [recentTap, setRecentTap] = useState<number | null>(null);

  const volumes = variant === 'three' ? VOLUMES_3 : VOLUMES_4;

  const handleTap = async (vol: number): Promise<void> => {
    setRecentTap(vol);
    const result = await log({
      volume_ml: vol,
      beverage_kind: 'pure_water',
      log_surface: surface,
    });
    if (result === null) return;
    if (result.deduplicated) {
      toast.success('Already logged within the last few minutes.');
    } else {
      toast.success(`+${vol} ml logged`);
    }
    onLogged?.();
  };

  const containerClass = layout === 'grid'
    ? 'grid grid-cols-2 gap-2'
    : `flex flex-wrap items-stretch ${size === 'small' ? 'gap-1.5' : 'gap-2'}`;

  const buttonHeight = size === 'small' ? 'h-9' : size === 'medium' ? 'h-10' : 'h-12';
  const buttonText = size === 'small' ? 'text-[12px]' : 'text-sm';

  return (
    <div className={containerClass} role="group" aria-label="Quick log hydration">
      {volumes.map((vol) => (
        <button
          key={vol}
          type="button"
          onClick={() => void handleTap(vol)}
          disabled={loading}
          aria-label={`Add ${vol} milliliters`}
          className={`${buttonHeight} ${buttonText} ${layout === 'row' ? 'flex-1 min-w-[64px]' : ''} inline-flex items-center justify-center rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-3 font-medium text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2DA5A0] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${recentTap === vol && loading ? 'opacity-70' : ''}`}
        >
          +{vol} ml
        </button>
      ))}
    </div>
  );
}
