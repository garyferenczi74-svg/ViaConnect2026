'use client';

// Prompt #168c section 2.1: horizontal tab strip for the Dashboard Quick Logs
// surface. Four tabs: Breakfast, Lunch, Dinner, Snacks. Green checkmark badge
// when at least one meal of that type is logged today. Keyboard arrow + Enter
// navigation. Selected tab uses Teal #2DA5A0 highlight.

import { useCallback, useRef } from 'react';
import { Check, Coffee, Salad, Soup, UtensilsCrossed } from 'lucide-react';
import type { MealType } from '@/lib/gordon/types';

export interface QuickLogsMealTypeTabProps {
  readonly selected: MealType;
  readonly onSelect: (mealType: MealType) => void;
  readonly completed: ReadonlySet<MealType>;
  readonly snackCount?: number;
}

interface TabDef {
  readonly id: MealType;
  readonly label: string;
  readonly icon: typeof Coffee;
}

const TABS: ReadonlyArray<TabDef> = [
  { id: 'breakfast', label: 'Breakfast', icon: Coffee },
  { id: 'lunch', label: 'Lunch', icon: Salad },
  { id: 'dinner', label: 'Dinner', icon: UtensilsCrossed },
  { id: 'snack', label: 'Snacks', icon: Soup },
];

export function QuickLogsMealTypeTab({ selected, onSelect, completed, snackCount = 0 }: QuickLogsMealTypeTabProps) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusTab = useCallback((index: number) => {
    const next = ((index % TABS.length) + TABS.length) % TABS.length;
    buttonRefs.current[next]?.focus();
  }, []);

  const handleKey = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, currentIndex: number) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        focusTab(currentIndex + 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        focusTab(currentIndex - 1);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(TABS[currentIndex].id);
      }
    },
    [focusTab, onSelect],
  );

  return (
    <div role="tablist" aria-label="Meal type" className="flex gap-1.5 overflow-x-auto pb-1">
      {TABS.map((tab, index) => {
        const isSelected = tab.id === selected;
        const isCompleted = completed.has(tab.id);
        const Icon = tab.icon;
        const labelText =
          tab.id === 'snack' && snackCount > 0
            ? `Snacks (${snackCount})`
            : tab.label;

        return (
          <button
            key={tab.id}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(tab.id)}
            onKeyDown={(event) => handleKey(event as unknown as React.KeyboardEvent<HTMLDivElement>, index)}
            className={`relative flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors md:text-[13px] ${
              isSelected
                ? 'bg-[#2DA5A0] text-white'
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.5} />
            <span>{labelText}</span>
            {isCompleted ? (
              <span
                aria-label="Logged today"
                className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#27AE60] text-white"
              >
                <Check className="h-3 w-3" strokeWidth={2} />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default QuickLogsMealTypeTab;
