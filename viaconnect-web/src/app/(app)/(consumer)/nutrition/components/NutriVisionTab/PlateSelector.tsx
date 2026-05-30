'use client';

// Prompt #170a supplement §17.2: plate-size selector for the result review
// screen. Renders only when no credit-card reference was detected upstream.
// Three chips (Small 8 in / Medium 10 in / Large 12 in) with Medium pre-
// selected on mount; the choice rides on the meal_logs row via the meals
// insert payload's plate_size field.
//
// Deviation A acknowledged: the capture screen pill is static, not fade-on-
// detect. Per-meal selection here is the recovery path for users whose photo
// did not include a card-shaped reference.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { useState } from 'react';
import type { ReferenceObjectKind } from '@/lib/nutrition/portion/types';

export type PlateSelectorKind = Extract<
  ReferenceObjectKind,
  'plate_8in' | 'plate_10in' | 'plate_12in'
>;

export interface PlateSelectorProps {
  value?: PlateSelectorKind;
  onSelect: (kind: PlateSelectorKind) => void;
}

interface PlateOption {
  id: PlateSelectorKind;
  size: string;
  label: string;
  aria: string;
}

const OPTIONS: ReadonlyArray<PlateOption> = [
  { id: 'plate_8in',  size: '8 in',  label: 'Small',  aria: 'Small plate, 8 inches' },
  { id: 'plate_10in', size: '10 in', label: 'Medium', aria: 'Medium plate, 10 inches' },
  { id: 'plate_12in', size: '12 in', label: 'Large',  aria: 'Large plate, 12 inches' },
];

const DEFAULT_KIND: PlateSelectorKind = 'plate_10in';

export function PlateSelector(props: PlateSelectorProps) {
  // Medium pre-selected on mount per Hannah §17.3 silent pre-select.
  const initial = props.value ?? DEFAULT_KIND;
  const [selected, setSelected] = useState<PlateSelectorKind>(initial);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);

  const onPick = (id: PlateSelectorKind) => {
    setSelected(id);
    setHasInteracted(true);
    props.onSelect(id);
  };

  return (
    <section
      className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/55 p-4 backdrop-blur-md"
      aria-labelledby="plate-selector-heading"
    >
      {hasInteracted ? (
        <div
          id="plate-selector-heading"
          className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-white/55"
        >
          Plate size:
        </div>
      ) : (
        <div id="plate-selector-heading" className="mb-2">
          <p className="text-base font-semibold text-[#2DA5A0]">
            No card detected for scale.
          </p>
          <p className="text-base font-normal text-white/80">
            What plate size is this?
          </p>
        </div>
      )}

      <div
        role="radiogroup"
        aria-label="Plate size for portion scaling"
        className="flex gap-3"
      >
        {OPTIONS.map((opt) => {
          const isSelected = opt.id === selected;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={opt.aria}
              onClick={() => onPick(opt.id)}
              className={`group inline-flex h-14 min-w-[80px] flex-1 flex-col items-center justify-center rounded-xl px-3 text-center transition-transform duration-150 active:scale-[0.96] ${
                isSelected
                  ? 'bg-[#2DA5A0] text-[#1A2744]'
                  : 'border-[1.5px] border-[#2DA5A0]/40 bg-[#1A2744] text-[#2DA5A0]'
              }`}
            >
              <span
                className={`text-sm font-semibold ${
                  isSelected ? 'text-[#1A2744]' : 'text-[#2DA5A0]'
                }`}
              >
                {opt.label}
              </span>
              <span
                className={`mt-0.5 text-[11px] font-normal ${
                  isSelected ? 'text-[#1A2744]/80' : 'text-[#2DA5A0]/80'
                }`}
              >
                {opt.size}
              </span>
            </button>
          );
        })}
      </div>

      <span className="sr-only">
        Plate size: Medium plate, 10 inches selected. You can change this.
      </span>
    </section>
  );
}
