'use client';

// EngagementPill: single engagement pill (one of six levers).
//
// State machine per #161e §6.7:
//   unused       bg-transparent + white/30 border, no velocity number,
//                sub-label "Start logging"
//   in_use       bg-transparent + teal-accent border, prominent
//                "+X.X pts/day" velocity, sub-label "Active"
//   at_ceiling   bg-[#2DA5A0]/12 (filled teal at low saturation),
//                Check icon, sub-label "At ceiling"
//
// Mobile fit (#161e §6.7 + AC11): cells around 110px wide at 380px
// viewport with grid-cols-3 gap-2. Pill content stacks vertically
// (icon + label, then state line). The text-[11px] / truncate
// combination keeps labels like "Body Tracker" inside the cell.
//
// preCompute disables the pill (visible but non interactive) for the
// empty state. When the destination route is not wired, renders
// disabled with a "Coming Soon" subline.
//
// Pure helpers (state classifier, velocity formatter, aria-label
// builder) live in bos-pill-helpers.ts so they can be imported by
// JSX-free tests.

import Link from 'next/link';
import { Check } from 'lucide-react';
import type { EngagementPill as EngagementPillData } from '@/lib/scoring/types';
import { ENGAGEMENT_PILL_ICONS } from '@/lib/scoring/pill-icons';
import { getPillRoute } from '@/lib/scoring/pill-routes';
import {
  engagementPillClassesForState,
  buildEngagementAriaLabel,
  formatVelocity,
} from './bos-pill-helpers';

export interface EngagementPillProps {
  pill: EngagementPillData;
  preCompute?: boolean;
}

export { engagementPillClassesForState, buildEngagementAriaLabel, formatVelocity };

export function EngagementPill({ pill, preCompute = false }: EngagementPillProps) {
  const classes = engagementPillClassesForState(pill.state);
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

  const base = `inline-flex w-full min-h-[56px] flex-col items-center justify-center rounded-full border px-2 py-2 transition-all duration-200 ${classes.base}`;

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
