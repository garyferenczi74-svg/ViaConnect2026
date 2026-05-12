// Pure helpers shared by accuracy-pill.tsx and engagement-pill.tsx.
//
// Extracted to a JSX-free module so Vitest (configured environment:
// 'node' with no jsdom or React JSX runtime) can import the
// state-classifier and aria-label functions without bringing the .tsx
// modules' JSX nodes through Vite's transformer. The .tsx pill
// components re-export from here so existing import paths still work.

import type { AccuracyPill, EngagementPill } from '@/lib/scoring/types';

// -- Accuracy ---------------------------------------------------------------

export function accuracyPillClassesForState(state: AccuracyPill['state']): {
  base: string;
  stateLabel: string;
} {
  if (state === 'complete') {
    return {
      base: 'border-[#2DA5A0]/30 bg-[#2DA5A0]/15 text-[#2DA5A0]',
      stateLabel: 'Complete',
    };
  }
  if (state === 'awaiting_results') {
    return {
      base: 'border-white/30 bg-white/[0.05] text-white/70',
      stateLabel: 'Awaiting results',
    };
  }
  // incomplete (locked): per-key gradient background applied at the
  // component level via accuracyGradientForKey. State classifier here
  // returns border + text only so the gradient is the dominant fill
  // (mirrors the engagementPillClassesForState contract).
  return {
    base: 'border-white/10 text-white/40',
    stateLabel: 'Unlock',
  };
}

// Per-key gradient for accuracy pills, applied to the incomplete
// (unlock) state. CAQ / Labs / Genetics progress along a cool to
// warm spectrum that does not collide with the engagement row
// palette (emerald to orange). Each stop sits at /20 to /10 opacity
// so the gradient reads as a subtle wash over the dark card glass
// rather than a saturated chip.

export function accuracyGradientForKey(key: AccuracyPill['key']): string {
  switch (key) {
    case 'caq':
      return 'bg-gradient-to-br from-sky-500/20 to-cyan-500/10';
    case 'labs':
      return 'bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10';
    case 'genetics':
      return 'bg-gradient-to-br from-rose-500/20 to-pink-500/10';
  }
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
  // Border + text only. Background is supplied by the gradient lookup
  // (engagementGradientForKey) per the Gary directive in the patch
  // pass. State modulation is applied by engagementStateModifier.
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

// -- Engagement gradient (Gary directive, Phase A patch pass) --------------
//
// Per-lever gradient background. Engagement pills (bottom row) receive a
// subdued bg-gradient-to-br using brand-adjacent tokens. The palette below
// runs from emerald through orange in spectrum order, one stop per lever,
// at /20 to /10 opacity so the gradient reads under the dark card glass.

export function engagementGradientForKey(key: EngagementPill['key']): string {
  switch (key) {
    case 'nutrition':
      return 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10';
    case 'supplements':
      return 'bg-gradient-to-br from-teal-500/20 to-cyan-500/10';
    case 'body_tracker':
      return 'bg-gradient-to-br from-cyan-500/20 to-blue-500/10';
    case 'wearable':
      return 'bg-gradient-to-br from-blue-500/20 to-indigo-500/10';
    case 'plug_ins':
      return 'bg-gradient-to-br from-indigo-500/20 to-purple-500/10';
    case 'helix_challenges':
      return 'bg-gradient-to-br from-amber-500/20 to-orange-500/10';
  }
}

// State modulation that layers over the gradient:
//   unused      dim the gradient (opacity-60)
//   in_use      full saturation, no opacity modifier
//   at_ceiling  add a teal ring over the gradient

export function engagementStateModifier(state: EngagementPill['state']): string {
  if (state === 'at_ceiling') return 'ring-2 ring-[#2DA5A0]/40';
  if (state === 'in_use') return '';
  return 'opacity-60';
}
