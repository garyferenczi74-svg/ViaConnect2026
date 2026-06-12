'use client';

// Prompt 191 Task C (2026-06-12): the impact segmented control for Your Variants.
//
// A single select segmented control built as an ARIA radiogroup: All, High,
// Moderate, Low, each carrying its live count from the active test. Roving
// tabindex keeps one option tabbable; arrow / Home / End move selection, and
// the whole group reads as one control to assistive tech. Default selection is
// All. This filters the variant list in the parent; it owns no list itself.
//
// Standing rules honored: tokens only (Teal #2DA5A0 for the selected segment,
// white opacity neutrals otherwise), Instrument Sans inherited, no emojis, no em
// or en dashes, TypeScript strict (no any).

import { useRef } from 'react';

export type ImpactFilterValue = 'All' | 'High' | 'Moderate' | 'Low';

interface VariantImpactFilterProps {
  counts: { all: number; high: number; moderate: number; low: number };
  value: ImpactFilterValue;
  onChange: (value: ImpactFilterValue) => void;
}

// The four segments in fixed order, each paired with the counts key it reads.
const SEGMENTS: ReadonlyArray<{ label: ImpactFilterValue; countKey: 'all' | 'high' | 'moderate' | 'low' }> = [
  { label: 'All', countKey: 'all' },
  { label: 'High', countKey: 'high' },
  { label: 'Moderate', countKey: 'moderate' },
  { label: 'Low', countKey: 'low' },
];

export function VariantImpactFilter({ counts, value, onChange }: VariantImpactFilterProps) {
  // One ref per radio so arrow navigation can move DOM focus to the newly
  // selected segment (roving focus), matching the tablist behavior.
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedIndex = SEGMENTS.findIndex((segment) => segment.label === value);

  const focusAndSelect = (index: number) => {
    const count = SEGMENTS.length;
    const wrapped = ((index % count) + count) % count;
    const next = SEGMENTS[wrapped];
    onChange(next.label);
    buttonRefs.current[wrapped]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = selectedIndex < 0 ? 0 : selectedIndex;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        focusAndSelect(current + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        focusAndSelect(current - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusAndSelect(0);
        break;
      case 'End':
        event.preventDefault();
        focusAndSelect(SEGMENTS.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Filter by impact"
      onKeyDown={onKeyDown}
      className="flex flex-wrap gap-2"
    >
      {SEGMENTS.map((segment, index) => {
        const selected = segment.label === value;
        return (
          <button
            key={segment.label}
            ref={(node) => {
              buttonRefs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(segment.label)}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] motion-reduce:transition-none ${
              selected
                ? 'border border-[#2DA5A0]/60 bg-[#2DA5A0]/15 text-white'
                : 'border border-white/15 bg-transparent text-white/65 hover:border-white/30 hover:text-white/85'
            }`}
          >
            <span>{segment.label}</span>
            <span className="tabular-nums text-white/55">{counts[segment.countKey]}</span>
          </button>
        );
      })}
    </div>
  );
}

export default VariantImpactFilter;
