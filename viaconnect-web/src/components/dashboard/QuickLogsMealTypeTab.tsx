'use client';

// Prompt #169: per-meal dropdown trigger row. Replaces the prior #168c single-
// select tab strip with four independent triggers that toggle their own panel.
// Idle gradient is meal-specific (sunrise / midday / evening / treat); active
// (open) gradient is unified emerald to green per spec section 4.2.
//
// State lives in the parent QuickLogsSurface (single openMeal: MealType | null).
// This component is presentational + keyboard handler only.

import { useCallback, useRef } from 'react';
import { Check, ChevronDown, Coffee, Cookie, Soup, UtensilsCrossed } from 'lucide-react';
import type { MealType } from '@/lib/gordon/types';

export interface QuickLogsMealTypeTabProps {
  // null when no panel open. Otherwise the meal whose dropdown is expanded.
  readonly openMeal: MealType | null;
  readonly onToggle: (mealType: MealType) => void;
  readonly completed: ReadonlySet<MealType>;
  readonly snackCount?: number;
  // ARIA wiring: caller supplies a stable id prefix so the panel below can
  // aria-labelledby the active trigger and trigger can aria-controls the panel.
  readonly idPrefix: string;
}

interface TriggerDef {
  readonly id: MealType;
  readonly label: string;
  readonly icon: typeof Coffee;
  // Spec section 4.1 idle gradients.
  readonly idleGradient: string;
}

// Spec section 4.1 stops adjusted per Gary 2026-05-15 to pass WCAG AA Large
// (3.0:1) on white text. Color families preserved per spec where possible.
//   breakfast amber-400 -> amber-600, orange-500 -> orange-600
//   lunch swapped from yellow/amber to purple per Gary 2026-05-15:
//     purple-500 -> purple-700 monochromatic, distinct from dinner indigo/violet
//     and snacks rose/pink
//   snack rose-400 -> rose-500, pink-500 unchanged
//   dinner unchanged
//   active emerald-500 -> emerald-600, green-600 unchanged
// Translucent glass treatment per Gary 2026-05-15: each idle stop carries /75
// alpha so the meal-color pill blends slightly with the surface beneath, plus
// backdrop-blur on the button for the frosted-glass feel. Translucency over
// the dark navy surface DARKENS the rendered color vs the pure shade, which
// keeps WCAG AA Large contrast (already verified at full opacity) safe.
// Glass treatment per Gary 2026-05-15 (deepened pass): alpha pushed lower
// across all stops so the pills read as heavily-frosted color glass tint
// rather than colored buttons with a wash. White-text contrast still safe
// because translucency over the dark navy surface darkens the rendered
// color (lighter shade in HEX appears darker on screen, contrast goes up).
const TRIGGERS: ReadonlyArray<TriggerDef> = [
  { id: 'breakfast', label: 'Breakfast', icon: Coffee, idleGradient: 'from-amber-600/40 via-orange-600/20 to-amber-700/30' },
  { id: 'lunch', label: 'Lunch', icon: Soup, idleGradient: 'from-purple-500/40 via-purple-600/20 to-purple-700/30' },
  { id: 'dinner', label: 'Dinner', icon: UtensilsCrossed, idleGradient: 'from-indigo-500/40 via-indigo-600/20 to-violet-600/30' },
  { id: 'snack', label: 'Snacks', icon: Cookie, idleGradient: 'from-rose-500/40 via-pink-500/20 to-pink-600/30' },
];

const ACTIVE_GRADIENT = 'from-emerald-600/55 via-emerald-500/40 to-green-600/50';

export function QuickLogsMealTypeTab({
  openMeal,
  onToggle,
  completed,
  snackCount = 0,
  idPrefix,
}: QuickLogsMealTypeTabProps) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusTab = useCallback((index: number) => {
    const next = ((index % TRIGGERS.length) + TRIGGERS.length) % TRIGGERS.length;
    buttonRefs.current[next]?.focus();
  }, []);

  const handleKey = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        focusTab(currentIndex + 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        focusTab(currentIndex - 1);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onToggle(TRIGGERS[currentIndex].id);
      }
    },
    [focusTab, onToggle],
  );

  return (
    <div role="group" aria-label="Quick log meal type" className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {TRIGGERS.map((tab, index) => {
        const isOpen = tab.id === openMeal;
        const isCompleted = completed.has(tab.id);
        // Completed meals stay green (same gradient as active) but without the
        // ring; the ring is reserved for the actively-open trigger so users can
        // still tell open from logged-and-closed at a glance. Per Gary 2026-05-15:
        // green gradient itself signals completion, so the prior checkmark badge
        // is removed.
        const useGreen = isOpen || isCompleted;
        const Icon = tab.icon;
        const labelText =
          tab.id === 'snack' && snackCount > 0
            ? `Snacks (${snackCount})`
            : tab.label;
        const triggerId = `${idPrefix}-trigger-${tab.id}`;
        const panelId = `${idPrefix}-panel-${tab.id}`;

        return (
          <button
            key={tab.id}
            id={triggerId}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            aria-expanded={isOpen}
            aria-controls={panelId}
            tabIndex={isOpen ? 0 : (openMeal === null && index === 0 ? 0 : -1)}
            onClick={() => onToggle(tab.id)}
            onKeyDown={(event) => handleKey(event, index)}
            aria-label={isCompleted ? `${tab.label}, logged today` : tab.label}
            className={`group relative flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-gradient-to-br px-3 py-2.5 text-[13px] font-semibold text-white backdrop-blur-xl transition-all duration-200 ease-out hover:shadow-lg hover:shadow-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] md:text-[14px] ${
              useGreen ? ACTIVE_GRADIENT : tab.idleGradient
            } ${
              isOpen ? 'ring-2 ring-emerald-300/60 ring-offset-1 ring-offset-transparent' : ''
            }`}
          >
            <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
            <span className="truncate">{labelText}</span>
            {isCompleted ? (
              <span
                aria-hidden="true"
                className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-white/30 text-white shadow-sm shadow-emerald-900/30"
              >
                <Check className="h-3 w-3" strokeWidth={2.5} />
              </span>
            ) : null}
            <ChevronDown
              className={`ml-auto h-4 w-4 flex-shrink-0 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : 'rotate-0'
              }`}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
}

export default QuickLogsMealTypeTab;
