'use client';

// EngagementPill: single engagement pill (one of six levers).
//
// State machine per #162 §6.7:
//   at_ceiling   Teal active, no upside left, no hover lift
//   in_use       Teal soft, route to logging surface, hover lift
//   unused       Inactive, route to logging surface, hover lift
//
// preCompute prop disables the pill (visible but not interactive)
// during the empty state. When the destination route is not wired,
// renders disabled with "Coming Soon".

import Link from 'next/link';
import type { EngagementPill as EngagementPillData } from '@/lib/scoring/types';
import { ENGAGEMENT_PILL_ICONS } from '@/lib/scoring/pill-icons';
import { getPillRoute } from '@/lib/scoring/pill-routes';

export interface EngagementPillProps {
  pill: EngagementPillData;
  preCompute?: boolean;
}

export function EngagementPill({ pill, preCompute = false }: EngagementPillProps) {
  const Icon = ENGAGEMENT_PILL_ICONS[pill.key];
  const route = getPillRoute(pill.destination_key);
  const ariaLabel = buildAriaLabel(pill, preCompute);

  if (preCompute || !route) {
    return (
      <span
        role="status"
        aria-label={ariaLabel}
        aria-disabled="true"
        className="inline-flex min-h-[44px] cursor-not-allowed items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-white/40 sm:text-sm"
      >
        <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        <span className="truncate">{pill.label}</span>
        {!route && !preCompute ? (
          <span className="text-[10px] uppercase tracking-wider">Coming Soon</span>
        ) : null}
      </span>
    );
  }

  if (pill.state === 'at_ceiling') {
    return (
      <Link
        href={route}
        aria-label={ariaLabel}
        className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-[#2DA5A0] bg-[#2DA5A0]/15 px-3 py-2 text-xs font-medium text-[#2DA5A0] shadow-[0_0_12px_-2px_rgba(45,165,160,0.35)] transition-all duration-200 hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] sm:text-sm"
      >
        <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        <span className="truncate">{pill.label}</span>
        <span className="text-[10px] uppercase tracking-wider opacity-70">
          {Math.round(pill.current_contribution_pct)}%
        </span>
      </Link>
    );
  }

  if (pill.state === 'in_use') {
    return (
      <Link
        href={route}
        aria-label={ariaLabel}
        className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-[#2DA5A0]/40 bg-[#2DA5A0]/8 px-3 py-2 text-xs font-medium text-[#2DA5A0] transition-all duration-200 hover:translate-y-[-1px] hover:bg-[#2DA5A0]/12 hover:shadow-[0_4px_12px_-4px_rgba(45,165,160,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] sm:text-sm"
      >
        <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        <span className="truncate">{pill.label}</span>
        <span className="text-[10px] uppercase tracking-wider opacity-70">
          {Math.round(pill.current_contribution_pct)}%
        </span>
      </Link>
    );
  }

  // unused
  return (
    <Link
      href={route}
      aria-label={ariaLabel}
      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-white/15 bg-transparent px-3 py-2 text-xs font-medium text-white/80 transition-all duration-200 hover:translate-y-[-1px] hover:border-[#2DA5A0]/50 hover:bg-[#2DA5A0]/5 hover:text-[#2DA5A0] hover:shadow-[0_4px_12px_-4px_rgba(45,165,160,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] sm:text-sm"
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
      <span className="truncate">{pill.label}</span>
    </Link>
  );
}

function buildAriaLabel(pill: EngagementPillData, preCompute: boolean): string {
  if (preCompute) {
    return `${pill.label}, unlocks after CAQ completion`;
  }
  if (pill.state === 'at_ceiling') {
    return `${pill.label} at ceiling, contributing ${Math.round(pill.current_contribution_pct)} percent`;
  }
  if (pill.state === 'in_use') {
    return `${pill.label} in use, contributing ${Math.round(pill.current_contribution_pct)} percent`;
  }
  return `${pill.label} unused, log to start contributing`;
}
