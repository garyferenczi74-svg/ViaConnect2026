'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Droplet,
  Dumbbell,
  Footprints,
  Gauge,
  HeartPulse,
  Moon,
} from 'lucide-react';
import type { MorningChipKey } from '@/lib/dashboard/morning-card/keys';
import type { MorningChipView } from '@/lib/dashboard/morning-card/contributors';

const CHIP_ICONS: Record<MorningChipKey, LucideIcon> = {
  hrv: HeartPulse,
  sleep: Moon,
  resting_hr: Gauge,
  recovery: Activity,
  workouts: Dumbbell,
  body_composition: Droplet,
  steps: Footprints,
};

export interface MorningChipGridProps {
  chips: readonly MorningChipView[];
  selectedKey: MorningChipKey | null;
  onSelect: (key: MorningChipKey) => void;
}

export function MorningChipGrid({
  chips,
  selectedKey,
  onSelect,
}: MorningChipGridProps) {
  return (
    <ul
      role="list"
      aria-label="Bio Optimization contributors"
      className="grid grid-cols-4 gap-2 md:grid-cols-7"
    >
      {chips.map((chip) => {
        const Icon = CHIP_ICONS[chip.key];
        const selected = selectedKey === chip.key;
        return (
          <li key={chip.key} className="min-w-0">
            <Link
              href={chip.href}
              data-chip={chip.key}
              data-source-status={chip.sourceStatus}
              data-display-value={chip.displayValue}
              aria-pressed={selected}
              aria-expanded={selected}
              aria-label={`${chip.label}, sources ${chip.sourceStatus}`}
              onClick={(event) => {
                event.preventDefault();
                onSelect(chip.key);
              }}
              className={`flex min-h-[44px] w-full flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] ${
                selected
                  ? 'border-[#2DA5A0]/50 bg-[#2DA5A0]/15'
                  : 'border-white/10 bg-[#1A2744]/70 hover:border-white/20'
              }`}
            >
              <Icon className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} aria-hidden="true" />
              <span className="truncate text-[10px] font-medium text-white/80 sm:text-[11px]">
                {chip.label}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
