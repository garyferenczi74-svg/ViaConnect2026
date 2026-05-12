'use client';

// AccuracyPill: single accuracy pill (CAQ, Labs, Genetics).
//
// Patch pass (Phase A corrective): aligned to the canonical legacy
// BioOptimizationGauge.tsx pill treatment. Pills render as compact
// single-line chips on a rounded-full shape with the percent baked
// into the label and a U+00B7 middle-dot suffix carrying the verb
// ("unlock" or "pending"). The chunky two-row icon+state layout from
// the earlier rewrite is removed.
//
// State machine:
//   complete           teal-tinted background, label "CAQ: 72%"
//   incomplete         dim neutral background, label "Labs: 86% · unlock",
//                      wrapped in a Link to the destination
//   awaiting_results   white outline background, label "Genetics: 96% · pending"
//
// Pure helpers (state classifier + aria-label builder) live in
// bos-pill-helpers.ts so they can be imported by JSX-free tests.

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
  const ariaLabel = buildAccuracyAriaLabel(pill);
  const route = getPillRoute(pill.destination_key);

  const baseLabel = `${pill.label}: ${pill.confidence_unlocked_pct}%`;

  if (pill.state === 'complete') {
    return (
      <span
        role="status"
        aria-label={ariaLabel}
        className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-medium ${classes.base}`}
      >
        {baseLabel}
      </span>
    );
  }

  if (pill.state === 'awaiting_results') {
    return (
      <span
        role="status"
        aria-label={ariaLabel}
        className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-medium ${classes.base}`}
      >
        {baseLabel} · pending
      </span>
    );
  }

  // incomplete: locked, render a Link to the destination. Gradient
  // background applied per-key so CAQ, Labs, and Genetics each carry
  // a distinct subtle wash; state-based classes contribute the border
  // and dim text that still signal "locked".
  const lockedLabel = `${baseLabel} · unlock`;
  const gradient = accuracyGradientForKey(pill.key);

  if (!route) {
    return (
      <span
        role="status"
        aria-label={ariaLabel}
        className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-medium ${classes.base} ${gradient}`}
      >
        {lockedLabel}
      </span>
    );
  }

  return (
    <Link
      href={route}
      title={TOOLTIPS[pill.key]}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:border-white/20 hover:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] ${classes.base} ${gradient}`}
    >
      {lockedLabel}
    </Link>
  );
}
