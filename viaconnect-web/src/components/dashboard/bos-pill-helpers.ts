// Pure helpers shared by accuracy-pill.tsx and engagement-pill.tsx.
//
// Extracted to a JSX-free module so Vitest (configured environment:
// 'node' with no jsdom or React JSX runtime) can import the
// state-classifier and aria-label functions without bringing the .tsx
// modules' JSX nodes through Vite's transformer. The .tsx pill
// components re-export from here so existing import paths still work.

import type { AccuracyPill, EngagementPill } from '@/lib/scoring/types';

// -- Unified BOS pill gradient (Gary directive 2026-05-12) ----------------
//
// Single brand-aligned gradient applied to every pill and chip inside the
// Bio Optimization Score container so all pills share one design language
// with the dashboard's existing navy-to-teal pill accents (DashboardHeader
// avatar, TodaysProtocol icon). Opacity reduced from the dashboard's
// full-saturation pattern so twelve pills do not overwhelm the card.
// Supersedes the prior per-key rainbow palettes for both accuracy and
// engagement rows.

export const BOS_PILL_GRADIENT =
  'bg-gradient-to-br from-[#1A2744]/60 to-[#2DA5A0]/30';

// -- Accuracy ---------------------------------------------------------------

export function accuracyPillClassesForState(state: AccuracyPill['state']): {
  base: string;
  stateLabel: string;
} {
  // Border + text only. Background is supplied by BOS_PILL_GRADIENT at the
  // component level so all three states share the unified pill wash and the
  // state difference rides on the border + text tokens.
  if (state === 'complete') {
    return {
      base: 'border-[#2DA5A0]/30 text-[#2DA5A0]',
      stateLabel: 'Complete',
    };
  }
  if (state === 'awaiting_results') {
    return {
      base: 'border-white/30 text-white/70',
      stateLabel: 'Awaiting results',
    };
  }
  // incomplete (locked): dim border + dim text signal locked while the
  // unified gradient supplies the visible fill.
  return {
    base: 'border-white/10 text-white/40',
    stateLabel: 'Unlock',
  };
}

export function buildAccuracyAriaLabel(pill: AccuracyPill): string {
  if (pill.state === 'complete') {
    return `${pill.label} complete, confidence unlocked at ${pill.confidence_unlocked_pct} percent`;
  }
  if (pill.state === 'awaiting_results') {
    return `${pill.label} awaiting results, confidence ${pill.confidence_unlocked_pct} percent once complete`;
  }
  return `${pill.label} unlock, complete to reach ${pill.confidence_unlocked_pct} percent confidence`;
}

// -- Engagement -------------------------------------------------------------

export function engagementPillClassesForState(state: EngagementPill['state']): {
  base: string;
  subLabel: string;
} {
  // Border + text only. Background is supplied by BOS_PILL_GRADIENT at the
  // component level. State modulation (ring / opacity) is applied by
  // engagementStateModifier.
  if (state === 'at_ceiling') {
    return {
      base: 'border-[#2DA5A0] text-[#2DA5A0]',
      subLabel: 'At ceiling',
    };
  }
  if (state === 'in_use') {
    return {
      base: 'border-[#2DA5A0]/40 text-[#2DA5A0]',
      subLabel: 'Active',
    };
  }
  return {
    base: 'border-white/30 text-white/85',
    subLabel: 'Start logging',
  };
}

export function buildEngagementAriaLabel(
  pill: EngagementPill,
  preCompute: boolean,
): string {
  if (preCompute) {
    return `${pill.label}, unlocks after CAQ completion`;
  }
  if (pill.state === 'at_ceiling') {
    return `${pill.label} at ceiling, contributing ${Math.round(pill.current_contribution_pct)} percent`;
  }
  if (pill.state === 'in_use') {
    return `${pill.label} active, adding ${formatVelocity(pill.velocity_pct)} per day`;
  }
  return `${pill.label} unused, start logging to begin contributing`;
}

export function formatVelocity(velocityPct: number): string {
  const v = Math.abs(velocityPct);
  return `+${v.toFixed(1)} pts/day`;
}

// State modulation that layers over the unified gradient:
//   unused      dim the gradient (opacity-60)
//   in_use      full saturation, no opacity modifier
//   at_ceiling  add a teal ring over the gradient

export function engagementStateModifier(state: EngagementPill['state']): string {
  if (state === 'at_ceiling') return 'ring-2 ring-[#2DA5A0]/40';
  if (state === 'in_use') return '';
  return 'opacity-60';
}
