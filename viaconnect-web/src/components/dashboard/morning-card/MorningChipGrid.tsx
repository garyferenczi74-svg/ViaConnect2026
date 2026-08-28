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
  keys?: readonly MorningChipKey[];
  showHeading?: boolean;
  /** Extra alignment/gap classes for the chip list (footer band uses justify-center). */
  listClassName?: string;
}

function chipsForKeys(
  chips: readonly MorningChipView[],
  keys: readonly MorningChipKey[] | undefined,
): readonly MorningChipView[] {
  if (!keys) return chips;
  const byKey = new Map(chips.map((chip) => [chip.key, chip]));
  const next: MorningChipView[] = [];
  for (const key of keys) {
    const chip = byKey.get(key);
    if (chip) next.push(chip);
  }
  return next;
}

export function MorningChipGrid({
  chips,
  selectedKey,
  onSelect,
  keys,
  showHeading = true,
  listClassName,
}: MorningChipGridProps) {
  const visible = chipsForKeys(chips, keys);
  return (
    <div
      data-morning-contributors="inline"
      data-morning-chip-slot={showHeading ? 'honesty' : 'footer'}
    >
      {showHeading ? (
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
          {MORNING_CARD_CONTRIBUTORS_LABEL}
        </p>
      ) : null}
      <ul
        role="list"
        aria-label="Bio Optimization contributors"
        className={`flex flex-wrap gap-y-0.5 ${listClassName ?? 'gap-x-1'}`}
      >
        {visible.map((chip) => {
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
                    : 'text-white/70 hover:text-white/90'
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
