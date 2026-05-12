'use client';

// AccuracyPill: single accuracy pill (CAQ, Labs, Genetics).
//
// State machine per #162 §6.6:
//   complete           → Teal active, no destination, no hover lift
//   incomplete         → Inactive with destination route, "+72%" CTA label
//   awaiting_results   → Orange caution treatment, route to status surface
//
// When the destination_key is not in PILL_ROUTES (route not yet wired)
// the pill renders disabled with a "Coming Soon" treatment.

import Link from 'next/link';
import { Check, Clock, ArrowUpRight } from 'lucide-react';
import type { AccuracyPill as AccuracyPillData } from '@/lib/scoring/types';
import { ACCURACY_PILL_ICONS } from '@/lib/scoring/pill-icons';
import { getPillRoute } from '@/lib/scoring/pill-routes';

export interface AccuracyPillProps {
  pill: AccuracyPillData;
}

export function AccuracyPill({ pill }: AccuracyPillProps) {
  const Icon = ACCURACY_PILL_ICONS[pill.key];
  const route = getPillRoute(pill.destination_key);
  const ariaLabel = buildAriaLabel(pill);

  if (pill.state === 'complete') {
    return (
      <span
        role="status"
        aria-label={ariaLabel}
        className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-[#2DA5A0] bg-[#2DA5A0]/12 px-3 py-2 text-xs font-medium text-[#2DA5A0] shadow-[0_0_12px_-2px_rgba(45,165,160,0.35)] sm:text-sm"
      >
        <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        <Check className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
        <span className="truncate">{pill.label}</span>
      </span>
    );
  }

  if (pill.state === 'awaiting_results') {
    const content = (
      <>
        <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        <Clock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
        <span className="truncate">{pill.label}</span>
        <span className="text-[10px] uppercase tracking-wider text-[#B75E18]/80">Processing</span>
      </>
    );
    const base =
      'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-[#B75E18]/40 bg-[#B75E18]/12 px-3 py-2 text-xs font-medium text-[#B75E18] transition-all duration-200 sm:text-sm';
    if (route) {
      return (
        <Link
          href={route}
          aria-label={ariaLabel}
          className={`${base} hover:translate-y-[-1px] hover:shadow-[0_4px_12px_-4px_rgba(183,94,24,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]`}
        >
          {content}
        </Link>
      );
    }
    return (
      <span role="status" aria-label={ariaLabel} className={base}>
        {content}
      </span>
    );
  }

  // incomplete
  if (route) {
    return (
      <Link
        href={route}
        aria-label={ariaLabel}
        className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-white/15 bg-transparent px-3 py-2 text-xs font-medium text-white/80 transition-all duration-200 hover:translate-y-[-1px] hover:border-[#2DA5A0]/50 hover:bg-[#2DA5A0]/5 hover:text-[#2DA5A0] hover:shadow-[0_4px_12px_-4px_rgba(45,165,160,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] sm:text-sm"
      >
        <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        <span className="truncate">{pill.label}</span>
        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
        <span className="text-[10px] uppercase tracking-wider opacity-70">
          +{pill.confidence_unlocked_pct}%
        </span>
      </Link>
    );
  }

  return (
    <span
      role="status"
      aria-label={`${pill.label}, coming soon`}
      aria-disabled="true"
      className="inline-flex min-h-[44px] cursor-not-allowed items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-white/40 sm:text-sm"
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
      <span className="truncate">{pill.label}</span>
      <span className="text-[10px] uppercase tracking-wider">Coming Soon</span>
    </span>
  );
}

function buildAriaLabel(pill: AccuracyPillData): string {
  if (pill.state === 'complete') {
    return `${pill.label} complete, confidence unlocked at ${pill.confidence_unlocked_pct} percent`;
  }
  if (pill.state === 'awaiting_results') {
    return `${pill.label} processing, results will arrive soon`;
  }
  return `${pill.label} incomplete, complete to unlock ${pill.confidence_unlocked_pct} percent confidence`;
}
