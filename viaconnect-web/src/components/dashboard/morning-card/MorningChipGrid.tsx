'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Apple,
  ClipboardList,
  Heart,
  Leaf,
  Moon,
  Pill,
  Shield,
} from 'lucide-react';
import type { MarketingChipKey } from '@/lib/dashboard/morning-card/keys';
import type { MorningChipView } from '@/lib/dashboard/morning-card/contributors';

const CHIP_ICONS: Record<MarketingChipKey, LucideIcon> = {
  recovery: Heart,
  sleep: Moon,
  strain: Activity,
  regimen: Pill,
  nutrients: Apple,
  symptoms: ClipboardList,
  metabolic: Leaf,
  immune: Shield,
};

export interface MorningChipGridProps {
  chips: readonly MorningChipView[];
  selectedKey: MarketingChipKey | null;
  onSelect: (key: MarketingChipKey) => void;
}

export function MorningChipGrid({
  chips,
  selectedKey,
  onSelect,
}: MorningChipGridProps) {
  return (
    <ul
      role="list"
      aria-label="Marketing dimensions"
      className="grid grid-cols-4 gap-2 md:grid-cols-8"
    >
      {chips.map((chip) => {
        const Icon = CHIP_ICONS[chip.key];
        const selected = selectedKey === chip.key;
        return (
          <li key={chip.key} className="min-w-0">
            <button
              type="button"
              data-chip={chip.key}
              data-source-status={chip.sourceStatus}
              aria-pressed={selected}
              aria-expanded={selected}
              aria-label={`${chip.label}, sources ${chip.sourceStatus}`}
              onClick={() => onSelect(chip.key)}
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
            </button>
          </li>
        );
      })}
    </ul>
  );
}
