// Pure helpers shared by accuracy-pill.tsx and engagement-pill.tsx.
//
// Extracted to a JSX-free module so Vitest (configured environment:
// 'node' with no jsdom or React JSX runtime) can import the
// state-classifier and aria-label functions without bringing the .tsx
// modules' JSX nodes through Vite's transformer. The .tsx pill
// components re-export from here so existing import paths still work.

import type { AccuracyPill, EngagementPill } from '@/lib/scoring/types';

// -- BOS info-chip gradient (delta / tier / confidence) --------------------
//
// Kept as the unified brand wash because the side-panel info chips are
// data displays (numeric values, labels), not action tabs. The action
// pills below (accuracy + engagement) use the nutrition-page's vibrant
// linear-gradient pattern instead.

export const BOS_PILL_GRADIENT =
  'bg-gradient-to-br from-[#1A2744]/60 to-[#2DA5A0]/30';

// -- Accuracy ---------------------------------------------------------------
//
// Pattern A action-pill styling per Gary directive 2026-05-12: pills
// inherit the nutrition page's Quick Log / Photo AI / Log Full Meal look
// (rounded-lg + accent-to-navy gradient + white semibold text + opacity
// based state modulation). State classifier returns text-white plus an
// opacity modifier; per-key gradient supplies the visible bg.

export function accuracyPillClassesForState(state: AccuracyPill['state']): {
  base: string;
  stateLabel: string;
} {
  if (state === 'complete') {
    return {
      base: 'text-white',
      stateLabel: 'Complete',
    };
  }
  if (state === 'awaiting_results') {
    return {
      base: 'text-white opacity-80',
      stateLabel: 'Awaiting results',
    };
  }
  return {
    base: 'text-white opacity-55',
    stateLabel: 'Unlock',
  };
}

// Per-key Pattern A gradient. Each pill ends at the navy stop #1E3054
// so the row reads as one design family while the accents differentiate
// CAQ / Labs / Genetics.

export function accuracyGradientForKey(key: AccuracyPill['key']): string {
  switch (key) {
    case 'caq':
      return 'bg-gradient-to-br from-emerald-500 to-[#1E3054]';
    case 'labs':
      return 'bg-gradient-to-br from-[#2DA5A0] to-[#1E3054]';
    case 'genetics':
      return 'bg-gradient-to-br from-fuchsia-500 to-[#1E3054]';
  }
}

export function buildAccuracyAriaLabel(pill: AccuracyPill): string {
  if (pill.key === 'genetics' && pill.state !== 'complete') {
    return pill.state === 'awaiting_results'
      ? 'Genetics awaiting results, Not analyzed until mapped_count is real'
      : 'Genetics Not analyzed';
  }
  if (pill.state === 'complete') {
    return `${pill.label} complete, confidence unlocked at ${pill.confidence_unlocked_pct} percent`;
  }
  if (pill.state === 'awaiting_results') {
    return `${pill.label} awaiting results, confidence ${pill.confidence_unlocked_pct} percent once complete`;
  }
  return `${pill.label} unlock, complete to reach ${pill.confidence_unlocked_pct} percent confidence`;
}

/**
 * Visible pill label. Genetics 96% is only honest after mapped_count SSOT
 * (Brief 16 / genetics-source present). Incomplete genetics is Not analyzed,
 * never a live 96%.
 */
export function accuracyPillDisplayLabel(pill: AccuracyPill): string {
  if (pill.key === 'genetics' && pill.state !== 'complete') {
    return pill.state === 'awaiting_results'
      ? 'Genetics · pending'
      : 'Genetics · Not analyzed';
  }
  const baseLabel = `${pill.label}: ${pill.confidence_unlocked_pct}%`;
  if (pill.state === 'complete') return baseLabel;
  if (pill.state === 'awaiting_results') return `${baseLabel} · pending`;
  return `${baseLabel} · unlock`;
}

// -- Engagement -------------------------------------------------------------
//
// Pattern A action-pill styling per Gary directive 2026-05-12. Each lever
// carries its own accent-to-navy gradient; text is always white; opacity
// state modulation handled by the classifier (unused dims to 55), with
// ring overlay for at_ceiling supplied by engagementStateModifier.

export function engagementPillClassesForState(state: EngagementPill['state']): {
  base: string;
  subLabel: string;
} {
  if (state === 'at_ceiling') {
    return {
      base: 'text-white',
      subLabel: 'At ceiling',
    };
  }
  if (state === 'in_use') {
    return {
      base: 'text-white',
      subLabel: 'Active',
    };
  }
  return {
    base: 'text-white opacity-55',
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

// State modifier layered over the per-key gradient. Opacity for unused
// now lives on the classifier base; the modifier only contributes the
// teal ring for at_ceiling success.

export function engagementStateModifier(state: EngagementPill['state']): string {
  if (state === 'at_ceiling') return 'ring-2 ring-[#2DA5A0]/40';
  return '';
}

// Per-key Pattern A gradient for the six engagement levers. Six distinct
// accents end at the navy stop #1E3054 so the row reads as one design
// family while each lever keeps a unique color identity.

export function engagementGradientForKey(key: EngagementPill['key']): string {
  switch (key) {
    case 'nutrition':
      return 'bg-gradient-to-br from-emerald-500 to-[#1E3054]';
    case 'supplements':
      return 'bg-gradient-to-br from-violet-500 to-[#1E3054]';
    case 'body_tracker':
      return 'bg-gradient-to-br from-orange-500 to-[#1E3054]';
    case 'wearable':
      return 'bg-gradient-to-br from-blue-500 to-[#1E3054]';
    case 'plug_ins':
      return 'bg-gradient-to-br from-pink-500 to-[#1E3054]';
    case 'helix_challenges':
      return 'bg-gradient-to-br from-amber-500 to-[#1E3054]';
  }
}
