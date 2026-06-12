'use client';

// Prompt 193 Task T3 (2026-06-12): the interactive pill tablist that switches
// between the six GENEX360 panel description cards on /shop/genex360.
//
// WAI-ARIA tabs pattern with automatic activation: arrow keys move focus AND
// activate in one step. Roving tabindex keeps exactly one pill in the tab order;
// arrow / Home / End move among the pills and Enter / Space activate the focused
// pill. Each pill is a REAL anchor (href={`#${slug}`}) so it works without
// JavaScript and is right click shareable; onClick calls preventDefault then
// hands off to the parent island, which drives smooth scroll, hash, and active
// state.
//
// Shared id convention (must match PanelDescriptionCard exactly):
//   pill tab  : id={`genex360-tab-${slug}`}, role="tab", aria-controls={slug}
//   pill row  : id="genex360-panels", role="tablist"
//   card id   : the slug itself (lives on the active card; the parent renders
//               sr-only stubs for the other five so every slug stays addressable)
//
// Mobile: a single horizontally scrollable line (no wrap) with scroll snap and
// edge fade masks so partially scrolled pills hint at more. At md+ the row may
// wrap to two lines and the fade is dropped. No layout shift.
//
// Standing rules honored: tokens only (Teal #2DA5A0 active fill with Deep Navy
// #1A2744 dark text for AA contrast, Card #1E3054 + white opacity neutrals for
// inactive), Instrument Sans inherited, no emojis, no em or en dashes,
// TypeScript strict (no any).

import { useRef } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import type { PanelSlug } from '@/data/genex360/types';

interface PanelPillTabsProps {
  panels: ReadonlyArray<{ slug: PanelSlug; pillLabel: string }>;
  activeSlug: PanelSlug;
  onSelect: (slug: PanelSlug) => void;
}

export function PanelPillTabs({ panels, activeSlug, onSelect }: PanelPillTabsProps) {
  // One ref per pill anchor so arrow navigation can move DOM focus to the newly
  // activated tab (roving focus). Indexed by position in the panels array.
  const anchorRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const activeIndex = panels.findIndex((panel) => panel.slug === activeSlug);

  // Move focus + activation to the panel at the given index, wrapping at the
  // ends. Activating updates the parent state (which flips aria-selected and the
  // roving tabIndex and scrolls the card); we then pull DOM focus onto that same
  // anchor so keyboard users keep moving from where they landed.
  const focusAndActivate = (index: number) => {
    const count = panels.length;
    if (count === 0) return;
    const wrapped = ((index % count) + count) % count;
    const next = panels[wrapped];
    onSelect(next.slug);
    anchorRefs.current[wrapped]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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
        focusAndActivate(panels.length - 1);
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

  // Click on a pill: the anchor href is the no JavaScript fallback, but when JS
  // is present we preventDefault and let the island own scroll + hash + state.
  // We also scroll the chosen pill into view within the row so it stays visible
  // on mobile.
  const onPillClick = (event: MouseEvent<HTMLAnchorElement>, slug: PanelSlug, index: number) => {
    event.preventDefault();
    onSelect(slug);
    anchorRefs.current[index]?.scrollIntoView({ inline: 'center', block: 'nearest' });
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
        id="genex360-panels"
        role="tablist"
        aria-label="GENEX360 panels"
        aria-orientation="horizontal"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="scrollbar-hide flex snap-x snap-mandatory flex-nowrap gap-2 overflow-x-auto pb-1 focus:outline-none md:flex-wrap md:overflow-visible"
      >
        {panels.map((panel, index) => {
          const active = panel.slug === activeSlug;
          return (
            <a
              key={panel.slug}
              ref={(node) => {
                anchorRefs.current[index] = node;
              }}
              href={`#${panel.slug}`}
              id={`genex360-tab-${panel.slug}`}
              role="tab"
              aria-selected={active}
              aria-controls={panel.slug}
              tabIndex={active ? 0 : -1}
              onClick={(event) => onPillClick(event, panel.slug, index)}
              className={`flex min-h-[44px] flex-none snap-start items-center rounded-full px-4 py-2 text-[13px] font-semibold no-underline transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] motion-reduce:transition-none ${
                active
                  ? 'bg-[#2DA5A0] text-[#1A2744]'
                  : 'border border-white/15 bg-[#1E3054] text-white/70 hover:border-white/35 hover:text-white/90'
              }`}
            >
              {panel.pillLabel}
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default PanelPillTabs;
