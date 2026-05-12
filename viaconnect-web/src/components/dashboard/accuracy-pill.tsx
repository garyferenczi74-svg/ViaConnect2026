'use client';

// AccuracyPill: single accuracy pill (CAQ, Labs, Genetics).
//
// State machine per #161e §6.6. The three states share the same pill
// shape and size, but the visual signals differ so the user can read
// the row at a glance:
//
//   complete           bg-[#2DA5A0]/15, border-[#2DA5A0], Check icon
//                      (teal), label "Complete"
//   incomplete         bg-transparent, border-[#B75E18]/60, ArrowUpRight
//                      icon (orange), label "Unlock"
//   awaiting_results   bg-transparent, border-white/30, Clock icon
//                      (white/60), label "Awaiting results"
//
// Mobile fit (#161e §6.7 + AC11): at 380px viewport with grid-cols-3
// gap-2, each pill cell is roughly 110px wide. Layout: vertical stack
// (lever icon + name on row 1; state icon + state label on row 2).
// Label and state-label use text-[11px] with truncate so long
// labels (e.g., "Awaiting results") shrink gracefully.
//
// Pure helpers (state classifier + aria-label builder) live in
// bos-pill-helpers.ts so they can be imported by JSX-free tests.

import Link from 'next/link';
import { Check, Clock, ArrowUpRight } from 'lucide-react';
import type { AccuracyPill as AccuracyPillData } from '@/lib/scoring/types';
import { ACCURACY_PILL_ICONS } from '@/lib/scoring/pill-icons';
import { getPillRoute } from '@/lib/scoring/pill-routes';
import {
  accuracyPillClassesForState,
  buildAccuracyAriaLabel,
} from './bos-pill-helpers';

export interface AccuracyPillProps {
  pill: AccuracyPillData;
}

export { accuracyPillClassesForState, buildAccuracyAriaLabel };

export function AccuracyPill({ pill }: AccuracyPillProps) {
  const classes = accuracyPillClassesForState(pill.state);
  const ariaLabel = buildAccuracyAriaLabel(pill);
  const route = getPillRoute(pill.destination_key);
  const Icon = ACCURACY_PILL_ICONS[pill.key];

  let stateIcon: React.ReactNode;
  if (pill.state === 'complete') {
    stateIcon = (
      <Check
        className="h-3 w-3 flex-shrink-0 text-[#2DA5A0]"
        strokeWidth={1.5}
        aria-hidden="true"
      />
    );
  } else if (pill.state === 'awaiting_results') {
    stateIcon = (
      <Clock
        className="h-3 w-3 flex-shrink-0 text-white/60"
        strokeWidth={1.5}
        aria-hidden="true"
      />
    );
  } else {
    stateIcon = (
      <ArrowUpRight
        className="h-3 w-3 flex-shrink-0 text-[#B75E18]"
        strokeWidth={1.5}
        aria-hidden="true"
      />
    );
  }

  const inner = (
    <>
      <span className="flex items-center justify-center gap-1.5">
        <Icon className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.5} aria-hidden="true" />
        <span className="truncate text-[11px] font-semibold leading-none sm:text-xs">
          {pill.label}
        </span>
      </span>
      <span className="mt-1 flex items-center justify-center gap-1">
        {stateIcon}
        <span className="truncate text-[10px] leading-none opacity-80 sm:text-[11px]">
          {classes.stateLabel}
        </span>
      </span>
    </>
  );

  const base = `inline-flex w-full min-h-[56px] flex-col items-center justify-center rounded-full border px-2 py-2 transition-all duration-200 ${classes.base}`;

  if (pill.state === 'complete' || !route) {
    return (
      <span role="status" aria-label={ariaLabel} className={base}>
        {inner}
      </span>
    );
  }

  return (
    <Link
      href={route}
      aria-label={ariaLabel}
      className={`${base} hover:translate-y-[-1px] hover:shadow-[0_4px_12px_-4px_rgba(45,165,160,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]`}
    >
      {inner}
    </Link>
  );
}
