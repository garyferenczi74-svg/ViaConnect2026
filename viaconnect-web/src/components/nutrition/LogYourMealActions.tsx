'use client';

/**
 * Prompt 219e: shared Log Your Meal action row (NutriVision, Log a Full Meal,
 * Hydration). Used by My Nutrition hub and the Dashboard section so both open
 * the same routes and never fork a second logger.
 *
 * No nutrition math. No meal write path. Navigation only.
 */

import Link from 'next/link';
import { Camera, Droplet, PenLine, type LucideIcon } from 'lucide-react';

const ACTIONS: ReadonlyArray<{
  href: string;
  label: string;
  icon: LucideIcon;
  testId: string;
}> = [
  {
    href: '/nutrition/photo-ai',
    label: 'NutriVision',
    icon: Camera,
    testId: 'log-meal-action-nutrivision',
  },
  {
    href: '/nutrition/log-meal',
    label: 'Log a Full Meal',
    icon: PenLine,
    testId: 'log-meal-action-full-meal',
  },
  {
    href: '/wellness-analytics/hydration',
    label: 'Hydration',
    icon: Droplet,
    testId: 'log-meal-action-hydration',
  },
];

function ActionPill({
  href,
  label,
  icon: Icon,
  testId,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  testId: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="group relative flex min-h-[44px] w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/20 bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white no-underline backdrop-blur-md transition-all duration-200 hover:border-white/35 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] active:scale-[0.98]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent opacity-70"
      />
      <Icon aria-hidden="true" className="relative h-4 w-4" strokeWidth={1.5} />
      <span className="relative">{label}</span>
    </Link>
  );
}

export interface LogYourMealActionsProps {
  /** Optional layout class on the action list. */
  className?: string;
}

export function LogYourMealActions({ className }: LogYourMealActionsProps) {
  return (
    <div
      data-testid="log-your-meal-actions"
      className={
        className ??
        'flex w-full flex-col gap-2 sm:flex-row sm:items-stretch'
      }
    >
      {ACTIONS.map((a) => (
        <div key={a.href} className="min-w-0 flex-1">
          <ActionPill
            href={a.href}
            label={a.label}
            icon={a.icon}
            testId={a.testId}
          />
        </div>
      ))}
    </div>
  );
}

export default LogYourMealActions;
