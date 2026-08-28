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
import { MORNING_CARD_CONTRIBUTORS_LABEL } from '@/lib/dashboard/morning-card/copy';

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
    <div data-morning-contributors="inline" data-morning-chip-slot="honesty" className="w-full">
      <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-white/80">
        {MORNING_CARD_CONTRIBUTORS_LABEL}
      </p>
      <ul
        role="list"
        aria-label="Bio Optimization contributors"
        className="flex flex-wrap justify-center gap-x-1 gap-y-0.5"
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
                className={`inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 px-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                  selected
                    ? 'text-[#2DA5A0] underline decoration-[#2DA5A0]/70 underline-offset-4'
                    : 'text-white/90 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5 text-[#2DA5A0]" strokeWidth={1.5} aria-hidden="true" />
                <span className="whitespace-nowrap">{chip.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
