'use client';

// Gary (2026-06-12): shared red "Remove Meal" pill for the two Today's
// Meals surfaces (/nutrition card + My Nutrition hub accordion). One
// pill per logged meal so a specific entry can be targeted; the actual
// removal semantics (optimistic cache removal + 5 second undo toast)
// live in useRemoveMeal, not here. Red accent uses the existing error
// red family (a translucent red tint with red-300 text), NOT the orange
// the old trash controls carried.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { Trash2 } from 'lucide-react';

export interface RemoveMealPillProps {
  readonly onClick: () => void;
  readonly ariaLabel: string;
  // Gary (2026-06-12): the pill sits in the section footer's bottom right
  // corner now, so when a section holds several meals each pill carries the
  // meal name to stay targetable. Default stays the plain Remove Meal.
  readonly label?: string;
}

export function RemoveMealPill({ onClick, ariaLabel, label = 'Remove Meal' }: RemoveMealPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="inline-flex min-h-[32px] max-w-[14rem] items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 text-[12px] font-semibold text-red-300 transition-colors hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
    >
      <Trash2 className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.5} />
      <span className="truncate">{label}</span>
    </button>
  );
}

export default RemoveMealPill;
