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
// Brand-aligned gradient applied to the accuracy pills (CAQ / Labs /
// Genetics) and the three side-panel info chips (delta / tier /
// confidence) so those nine elements share one design language with
// the dashboard's existing navy-to-teal pill accents (DashboardHeader
// avatar, TodaysProtocol icon). Engagement pills opted OUT of the
// unification later in the session (see engagementGradientForKey
// below) so the six levers retain distinct per-key color identity.

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

// State modulation that layers over the per-key gradient:
//   unused      dim the gradient (opacity-60)
//   in_use      full saturation, no opacity modifier
//   at_ceiling  add a teal ring over the gradient

export function engagementStateModifier(state: EngagementPill['state']): string {
  if (state === 'at_ceiling') return 'ring-2 ring-[#2DA5A0]/40';
  if (state === 'in_use') return '';
  return 'opacity-60';
}

// -- Engagement per-key gradient (Gary directive 2026-05-12 reversal) -----
//
// Restored after the brief unification pass: Gary called out the engagement
// row reading as "all blue" once every pill shared the navy-to-teal wash,
// and asked for varied per-key color identity here while leaving the
// accuracy pills and side-panel chips on BOS_PILL_GRADIENT.
//
// Palette spans six distinct color families (green / purple / orange /
// blue / pink / yellow) so no two adjacent pills repeat a hue. Only one
// blue pill (wearable, which contextually maps to device data). Each stop
// sits at /20 to /10 opacity so the gradient reads as a subtle wash over
// the dark card glass, matching the prior wash weight users approved.

export function engagementGradientForKey(key: EngagementPill['key']): string {
  switch (key) {
    case 'nutrition':
      return 'bg-gradient-to-br from-emerald-500/20 to-green-500/10';
    case 'supplements':
      return 'bg-gradient-to-br from-violet-500/20 to-purple-500/10';
    case 'body_tracker':
      return 'bg-gradient-to-br from-orange-500/20 to-red-500/10';
    case 'wearable':
      return 'bg-gradient-to-br from-blue-500/20 to-indigo-500/10';
    case 'plug_ins':
      return 'bg-gradient-to-br from-pink-500/20 to-fuchsia-500/10';
    case 'helix_challenges':
      return 'bg-gradient-to-br from-amber-500/20 to-yellow-500/10';
  }
}
