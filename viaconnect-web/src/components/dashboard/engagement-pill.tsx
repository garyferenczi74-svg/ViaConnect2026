'use client';

// EngagementPill: single engagement pill (one of six levers).
//
// Patch pass (Phase A corrective + Gary directive): pills now carry a
// per-lever bg-gradient-to-br background, with state-driven
// modulation layered on top:
//   unused      gradient dimmed to opacity-60
//   in_use      full saturation, prominent "+X.X pts/day" velocity
//   at_ceiling  ring-2 ring-[#2DA5A0]/40 over the gradient + Check
//
// Pills are rounded-xl (chunkier than the rounded-full accuracy pills)
// because the velocity number reads larger and benefits from the
// extra interior space.
//
// preCompute disables the pill (visible but non interactive) for the
// empty state. When the destination route is not wired, renders
// disabled with a "Coming Soon" subline.
//
// Pure helpers (state classifier, gradient lookup, state modifier,
// velocity formatter, aria-label builder) live in bos-pill-helpers.ts
// so they can be imported by JSX-free tests.

import Link from 'next/link';
import { Check } from 'lucide-react';
import type { EngagementPill as EngagementPillData } from '@/lib/scoring/types';
import { ENGAGEMENT_PILL_ICONS } from '@/lib/scoring/pill-icons';
import { getPillRoute } from '@/lib/scoring/pill-routes';
import {
  engagementPillClassesForState,
  engagementGradientForKey,
  engagementStateModifier,
  buildEngagementAriaLabel,
  formatVelocity,
} from './bos-pill-helpers';

export interface EngagementPillProps {
  pill: EngagementPillData;
  preCompute?: boolean;
}

export {
  engagementPillClassesForState,
  engagementGradientForKey,
  engagementStateModifier,
  buildEngagementAriaLabel,
  formatVelocity,
};

export function EngagementPill({ pill, preCompute = false }: EngagementPillProps) {
  const classes = engagementPillClassesForState(pill.state);
  const gradient = engagementGradientForKey(pill.key);
  const modifier = engagementStateModifier(pill.state);
  const ariaLabel = buildEngagementAriaLabel(pill, preCompute);
  const route = getPillRoute(pill.destination_key);
  const Icon = ENGAGEMENT_PILL_ICONS[pill.key];

  const showVelocity = !preCompute && pill.state === 'in_use' && pill.velocity_pct > 0;
  const showCeilingCheck = !preCompute && pill.state === 'at_ceiling';

  const inner = (
    <>
      <span className="flex items-center justify-center gap-1.5">
        <Icon className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.5} aria-hidden="true" />
        <span className="truncate text-[11px] font-semibold leading-none sm:text-xs">
          {pill.label}
        </span>
      </span>
      <span className="mt-1 flex items-center justify-center gap-1">
        {showCeilingCheck ? (
          <Check className="h-3 w-3 flex-shrink-0" strokeWidth={1.5} aria-hidden="true" />
        ) : null}
        {showVelocity ? (
          <span className="truncate text-[10px] font-semibold leading-none sm:text-[11px]">
            {formatVelocity(pill.velocity_pct)}
          </span>
        ) : (
          <span className="truncate text-[10px] leading-none opacity-80 sm:text-[11px]">
            {classes.subLabel}
          </span>
        )}
      </span>
    </>
  );

  const base = `inline-flex w-full min-h-[56px] flex-col items-center justify-center rounded-xl border px-2 py-2 transition-all duration-200 ${gradient} ${modifier} ${classes.base}`;

  if (preCompute) {
    return (
      <span
        role="status"
        aria-label={ariaLabel}
        aria-disabled="true"
        className={`${base} opacity-60`}
      >
        {inner}
      </span>
    );
  }

  if (!route) {
    return (
      <span
        role="status"
        aria-label={`${pill.label}, coming soon`}
        aria-disabled="true"
        className={`${base} opacity-60`}
      >
        <span className="flex items-center justify-center gap-1.5">
          <span className="truncate text-[11px] font-semibold leading-none sm:text-xs">
            {pill.label}
          </span>
        </span>
        <span className="mt-1 truncate text-[10px] leading-none opacity-80 sm:text-[11px]">
          Coming Soon
        </span>
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
