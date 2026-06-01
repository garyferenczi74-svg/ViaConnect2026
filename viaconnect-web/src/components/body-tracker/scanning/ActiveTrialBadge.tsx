'use client';

// ActiveTrialBadge  (Prompt #169f, Option C / D)
//
// A minimal, NON-marketing status line for the Body Tracker / FormaVision
// surface that shows the user's current active Platinum trial and how many
// whole days remain. It consumes the read-only useTrialState signal and renders
// NOTHING when there is no active trial (or while the signal is still loading).
//
// Copy is intentionally functional only ("Platinum trial: N days left"); the
// polished trial copy (169f sections 9.5 / 12.2 / 12.3) is a separate, gated
// pass and is deliberately NOT written here.

import { Clock } from 'lucide-react';
import { useTrialState } from '@/hooks/body-tracker/useTrialState';

interface ActiveTrialBadgeProps {
  className?: string;
}

export function ActiveTrialBadge({ className = '' }: ActiveTrialBadgeProps) {
  const { activeTrial, isLoading } = useTrialState();

  // No active trial (or still resolving): render nothing.
  if (isLoading || !activeTrial) return null;

  const days = activeTrial.daysRemaining;
  // Whole-day count, grammatical but still minimal. 0 means it expires within
  // the next 24 hours.
  const daysLabel = days === 1 ? '1 day left' : `${days} days left`;

  return (
    <div
      data-testid="active-trial-badge"
      className={`inline-flex items-center gap-1.5 rounded-full border border-[#2DA5A0]/35 bg-[#2DA5A0]/12 px-3 py-1.5 ${className}`}
    >
      <Clock className="h-3.5 w-3.5 shrink-0 text-[#2DA5A0]" strokeWidth={1.5} />
      <span className="text-xs font-semibold text-[#2DA5A0]">
        Platinum trial: {daysLabel}
      </span>
    </div>
  );
}
