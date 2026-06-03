/**
 * Gary 2026-06-03: self-contained Hydration accordion wrapper. Same dropdown
 * pattern as the Quick Log meal pills (header pill with intake chip +
 * ChevronDown rotation, expanding body) without needing to share state with
 * a parent. Body mounts HydrationFullSection so every surface stays in sync.
 */

'use client';

import { useState } from 'react';
import { ChevronDown, Droplet } from 'lucide-react';
import { HydrationFullSection } from './HydrationFullSection';
import { useHydrationToday } from './useHydrationToday';
import { formatVolumeLabel } from './HydrationRing';
import type { HydrationLogSurface } from './useHydrationQuickLog';

export interface HydrationAccordionProps {
  readonly logSurface: HydrationLogSurface;
  // Default closed; pass true to render expanded on first paint.
  readonly defaultOpen?: boolean;
}

export function HydrationAccordion({
  logSurface,
  defaultOpen = false,
}: HydrationAccordionProps): JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);
  const { data } = useHydrationToday();
  const totalMl = data?.total_ml ?? 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="group relative flex w-full min-h-[48px] items-center justify-between gap-2 rounded-xl border border-white/15 bg-gradient-to-br from-sky-600/40 via-blue-500/20 to-sky-700/30 px-3 py-2.5 text-[13px] font-semibold text-white backdrop-blur-xl transition-all duration-200 ease-out hover:shadow-lg hover:shadow-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] md:text-[14px]"
      >
        <span className="flex items-center gap-2">
          <Droplet className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
          <span>Hydration</span>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] tabular-nums text-white/85">
            {formatVolumeLabel(totalMl)}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
          strokeWidth={1.5}
        />
      </button>

      {isOpen ? (
        <div className="mt-2">
          <HydrationFullSection logSurface={logSurface} />
        </div>
      ) : null}
    </div>
  );
}

export default HydrationAccordion;
