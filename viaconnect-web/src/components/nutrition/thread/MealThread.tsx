'use client';

// Prompt 172 Phase 2 (172c): light thread presentation.
//
// Per spec section 0: "the responsive logged moment and the light thread
// over existing entry paths" and 172c scope. NOT a chat thread, NOT a
// feed. A lightweight stack of cards showing the just logged meal
// prominently and 1 to 2 previous logged meals beneath with partial
// opacity, no interactivity.
//
// Purely presentational. No fetching. Consumes a list of prior meal
// summaries passed in by the parent (the existing user meals query the
// page already owns). When the parent has not loaded priors yet the
// thread renders the current card slot only without a placeholder.
//
// The top of stack lives where the post save MealCard already mounts; the
// component lays a stack underneath via translated and opacity reduced
// siblings, never replacing or duplicating the MealCard subtree.
//
// Hard rules honored: no em or en dashes, no emojis, no any, Lucide
// strokeWidth 1.5, brand tokens only.

import type { ReactNode } from 'react';

export interface MealThreadEntry {
  /** Stable identifier (the saved meal_id). */
  mealId: string;
  /** Short label rendered on the stacked sibling card (e.g., meal name). */
  title: string;
  /** ISO 8601 timestamp; rendered as a relative time hint when present. */
  loggedAt?: string;
}

export interface MealThreadProps {
  /**
   * The current meal subtree (typically the post save MealCard) rendered as
   * the top of stack card.
   */
  children: ReactNode;
  /**
   * Up to two prior meals shown beneath the top card with partial opacity.
   * The component renders them in stack order: priors[0] sits closest to
   * the top card, priors[1] sits further back. Anything past index 1 is
   * ignored to keep the stack visually shallow.
   */
  priors?: ReadonlyArray<MealThreadEntry>;
}

function relativeHint(iso: string | undefined): string | null {
  if (typeof iso !== 'string' || iso.length === 0) return null;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return null;
  const deltaMin = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (deltaMin < 60) return `${deltaMin}m ago`;
  const deltaHr = Math.round(deltaMin / 60);
  if (deltaHr < 24) return `${deltaHr}h ago`;
  const deltaDay = Math.round(deltaHr / 24);
  return `${deltaDay}d ago`;
}

export function MealThread(props: MealThreadProps) {
  const priors = (props.priors ?? []).slice(0, 2);

  return (
    <div className="relative">
      {/* Stacked siblings below the top card. Rendered first so the top
          card lays over them via DOM order; CSS transforms shift them
          downward and back to suggest depth without absolute positioning
          that would break responsive flow. */}
      {priors.length > 0 && (
        <div
          className="pointer-events-none flex flex-col gap-2"
          aria-hidden="true"
          data-meal-thread-priors
        >
          {priors.map((entry, index) => {
            const hint = relativeHint(entry.loggedAt);
            const offsetY = (index + 1) * 6;
            const opacity = index === 0 ? 0.55 : 0.32;
            return (
              <div
                key={entry.mealId}
                className="rounded-2xl border border-white/[0.06] bg-[#1E3054]/35 px-4 py-3 text-[12px] text-white/65"
                style={{
                  transform: `translateY(${offsetY}px) scale(${1 - index * 0.02})`,
                  opacity,
                }}
                data-meal-thread-prior
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate">{entry.title}</span>
                  {hint !== null && (
                    <span className="text-[10px] uppercase tracking-wide text-white/45">{hint}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Top of thread: the post save MealCard subtree the parent renders. */}
      <div className="relative z-10" data-meal-thread-top>
        {props.children}
      </div>
    </div>
  );
}

export default MealThread;
