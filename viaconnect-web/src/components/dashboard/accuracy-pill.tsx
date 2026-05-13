'use client';

// AccuracyPill: single accuracy pill (CAQ, Labs, Genetics).
//
// Pattern A action-pill styling per Gary directive 2026-05-12: mirrors
// the nutrition page's Quick Log / Photo AI / Log Full Meal pills,
// rounded-lg with an accent-to-navy linear gradient and white semibold
// text. State is communicated through opacity-based modulation:
//   complete           full saturation
//   awaiting_results   opacity-80
//   incomplete         opacity-55 (locked, idle), wrapped in a Link
//
// Per-key gradients (cyan / brand teal / fuchsia) live in
// accuracyGradientForKey; pure helpers (state classifier + aria-label
// builder) live in bos-pill-helpers.ts.

import Link from 'next/link';
import type { AccuracyPill as AccuracyPillData } from '@/lib/scoring/types';
import { getPillRoute } from '@/lib/scoring/pill-routes';
import {
  accuracyPillClassesForState,
  accuracyGradientForKey,
  buildAccuracyAriaLabel,
} from './bos-pill-helpers';

export interface AccuracyPillProps {
  pill: AccuracyPillData;
}

export { accuracyPillClassesForState, accuracyGradientForKey, buildAccuracyAriaLabel };

const TOOLTIPS: Record<AccuracyPillData['key'], string> = {
  caq: 'Complete your CAQ to unlock 72% confidence',
  labs: 'Add lab work to unlock 86% confidence',
  genetics: 'Complete your genetic testing to unlock 96% confidence',
};

export function AccuracyPill({ pill }: AccuracyPillProps) {
  const classes = accuracyPillClassesForState(pill.state);
  const gradient = accuracyGradientForKey(pill.key);
  const ariaLabel = buildAccuracyAriaLabel(pill);
  const route = getPillRoute(pill.destination_key);

  const baseLabel = `${pill.label}: ${pill.confidence_unlocked_pct}%`;
  const base = `inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 ${gradient} ${classes.base}`;

  if (pill.state === 'complete') {
    return (
      <span role="status" aria-label={ariaLabel} className={base}>
        {baseLabel}
      </span>
    );
  }

  if (pill.state === 'awaiting_results') {
    return (
      <span role="status" aria-label={ariaLabel} className={base}>
        {baseLabel} · pending
      </span>
    );
  }

  // incomplete: locked, render a Link to the destination.
  const lockedLabel = `${baseLabel} · unlock`;

  if (!route) {
    return (
      <span role="status" aria-label={ariaLabel} className={base}>
        {lockedLabel}
      </span>
    );
  }

  return (
    <Link
      href={route}
      title={TOOLTIPS[pill.key]}
      aria-label={ariaLabel}
      className={`${base} hover:opacity-100 hover:shadow-[0_0_12px_rgba(45,165,160,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]`}
    >
      {lockedLabel}
    </Link>
  );
}
