'use client';

// Prompt 191 Task C (2026-06-12): the accessible test switcher for Your Variants.
//
// A horizontal pill tablist following the WAI-ARIA tabs pattern with automatic
// activation: arrow keys move focus AND activate in one step (the panel is cheap
// to render, so automatic activation is the better UX here). Roving tabindex
// keeps exactly one pill in the tab order; the arrow / Home / End keys move
// among the pills, and Enter / Space activate the focused pill (a no op when it
// is already active, kept for completeness and screen reader expectation).
//
// Mobile: the row is a single horizontally scrollable line (no wrap) with
// scroll snap and edge fade masks so partially scrolled pills hint at more. At
// md+ the row may wrap to two lines and the fade is dropped.
//
// Gary 2026-06-13: the ACTIVE pill uses the blue glass treatment (Deep Navy
// #1A2744 outline + white translucent glass fill + white text), matching the
// Upload Labs CTA; the inactive (static) pills keep their original white outline.
// Instrument Sans inherited, no emojis, no em or en dashes, TypeScript strict
// (no any).

import { useRef } from 'react';
import { countsForTest, type GeneticTest } from './geneticsVariantSamples';

interface VariantPillTabsProps {
  tests: GeneticTest[];
  activeId: string;
  onActivate: (id: string) => void;
  // The id of the single tabpanel all pills control via aria-controls.
  panelId: string;
}

export function VariantPillTabs({ tests, activeId, onActivate, panelId }: VariantPillTabsProps) {
  // One ref per pill button so arrow navigation can move DOM focus to the newly
  // activated tab (roving focus). Indexed by position in the tests array.
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeIndex = tests.findIndex((test) => test.id === activeId);

  // Move focus + activation to the test at the given index, wrapping at the
  // ends. Activating updates the parent state (which flips aria-selected and the
  // roving tabIndex); we then pull DOM focus onto that same button so keyboard
  // users keep moving from where they landed.
  const focusAndActivate = (index: number) => {
    const count = tests.length;
    if (count === 0) return;
    const wrapped = ((index % count) + count) % count;
    const next = tests[wrapped];
    onActivate(next.id);
    buttonRefs.current[wrapped]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Operate relative to the active tab. Under automatic activation focus and
    // activation stay in sync, so the active index is the focused index.
    const current = activeIndex < 0 ? 0 : activeIndex;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        focusAndActivate(current + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        focusAndActivate(current - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusAndActivate(0);
        break;
      case 'End':
        event.preventDefault();
        focusAndActivate(tests.length - 1);
        break;
      case 'Enter':
      case ' ':
        // The focused pill is already the active one under automatic
        // activation; re activate for parity with the ARIA expectation.
        event.preventDefault();
        focusAndActivate(current);
        break;
      default:
        break;
    }
  };

  return (
    // Relative wrapper hosts the edge fade masks (mobile only). The scroller
    // itself carries the tablist semantics.
    <div className="relative">
      {/* Left + right edge fade masks. Hint at horizontal overflow on mobile;
          dropped at md+ where the row wraps. Pointer events pass through so they
          never block a pill tap. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-6 bg-gradient-to-r from-[#1A2744] to-transparent md:hidden"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-6 bg-gradient-to-l from-[#1A2744] to-transparent md:hidden"
      />

      <div
        role="tablist"
        aria-label="GENEX360 tests"
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        className="scrollbar-hide flex snap-x snap-mandatory flex-nowrap gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible"
      >
        {tests.map((test, index) => {
          const active = test.id === activeId;
          const counts = countsForTest(test);
          return (
            <button
              key={test.id}
              ref={(node) => {
                buttonRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${panelId}-tab-${test.id}`}
              aria-selected={active}
              aria-controls={panelId}
              tabIndex={active ? 0 : -1}
              onClick={() => onActivate(test.id)}
              className={`flex min-h-[44px] flex-none snap-start items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] motion-reduce:transition-none ${
                active
                  ? 'border border-[#1A2744]/60 bg-white/[0.08] text-white backdrop-blur-md [text-shadow:0_1px_2px_rgba(0,0,0,0.8)] hover:border-[#1A2744]/80 hover:bg-white/[0.16]'
                  : 'border border-white/20 bg-transparent text-white/70 hover:border-white/35 hover:text-white/90'
              }`}
            >
              <span>{test.label}</span>
              {/* Trailing count badge: total variants in this test. On the active
                  teal pill the badge sits on a dark translucent chip so the dark
                  text stays legible; on inactive pills it is a subtle white chip. */}
              <span
                className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${
                  active ? 'bg-[#1A2744]/40 text-white' : 'bg-white/10 text-white/70'
                }`}
              >
                {counts.all}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default VariantPillTabs;
