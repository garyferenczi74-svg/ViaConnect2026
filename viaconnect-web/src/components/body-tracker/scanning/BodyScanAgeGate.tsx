'use client';

// BodyScanAgeGate.tsx  (Prompt #169b, spec section 4 age gate + section 3.2.3
// slow-down advisory)
//
// Encapsulates the consumer-facing Body Scan age gate. Wrap the Body Scan entry
// with this component:
//
//   <BodyScanAgeGate>
//     <RunScanButton ... />   // the normal entry, with its own premium gate
//   </BodyScanAgeGate>
//
// Decision precedence (spec section 4): the AGE gate takes precedence over the
// premium gate. When the user is under 18 (or has no DOB on file), the Body Scan
// entry (and therefore its premium gate) is NOT rendered at all; a replacement
// card is shown instead. When the user is 18+ (or while the DOB is still
// loading) the children render normally and the premium gate inside them applies.
//
// The AUTHORITATIVE age + frequency gate is the body_photo_sessions finalize
// trigger (migration 20260516000080), which re-derives the age from
// profiles.date_of_birth (via SQL age()) and re-checks the 24h window
// in-database whenever scan_status transitions to 'complete', covering the
// primary runScanAnalysis path that finalizes via a direct client UPDATE and
// never calls the body-scan-analyze edge function. This component is
// defense-in-depth / UX only.
//
// Lucide icons at strokeWidth 1.5; copy uses commas/colons only (no dashes).
// Cards are responsive (stack on mobile, comfortable on desktop).

import type { ReactNode } from 'react';
import Link from 'next/link';
import { CalendarClock, ClipboardList, ArrowRight } from 'lucide-react';
import { useBodyScanAgeGate } from '@/hooks/body-tracker/useBodyScanAgeGate';
import { FORMAVISION_BRAND } from '@/lib/body-tracker/brand-config';
import { BodyScanSlowDownBanner } from './BodyScanSlowDownBanner';

interface BodyScanAgeGateProps {
  children: ReactNode;
  className?: string;
}

export function BodyScanAgeGate({ children, className = '' }: BodyScanAgeGateProps) {
  const { decision, showSlowDown, isLoading } = useBodyScanAgeGate();

  // While loading, or when allowed, render the normal entry (its premium gate
  // applies). Do not flash a gate card before the DOB resolves.
  const status = decision?.status;

  if (isLoading || !decision || status === 'allowed') {
    return (
      <div className={className}>
        {showSlowDown && <BodyScanSlowDownBanner className="mb-3" />}
        {children}
      </div>
    );
  }

  // Under 18: hide the entry, show the "available at 18" card (spec section 4).
  if (status === 'under_age') {
    return (
      <div
        data-testid="body-scan-age-gate-under-age"
        className={`rounded-2xl border border-white/[0.08] bg-[#1E3054]/50 p-6 sm:p-7 ${className}`}
      >
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[#2DA5A0]/15">
            <CalendarClock className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-white">{FORMAVISION_BRAND.name} unlocks at 18</p>
            <p className="mt-1 text-sm leading-relaxed text-white/70">
              {FORMAVISION_BRAND.name} will be available when you turn 18. In the meantime, talk to your
              healthcare provider about any body composition questions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // DOB missing: prompt the user to complete their CAQ Phase 1 first (spec
  // section 4). The age gate cannot be evaluated without a date of birth.
  return (
    <div
      data-testid="body-scan-age-gate-dob-missing"
      className={`rounded-2xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 p-6 sm:p-7 ${className}`}
    >
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[#2DA5A0]/20">
          <ClipboardList className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-white">Complete your CAQ first</p>
          <p className="mt-1 text-sm leading-relaxed text-white/70">
            Add your date of birth in your Clinical Assessment so we can confirm {FORMAVISION_BRAND.name} is
            right for you. Once your CAQ Phase 1 is complete, your first scan unlocks here.
          </p>
        </div>
        <Link
          href="/onboarding"
          className="inline-flex w-full flex-none items-center justify-center gap-1.5 rounded-xl border border-[#2DA5A0]/50 bg-[#2DA5A0]/20 px-5 py-2.5 text-sm font-semibold text-[#2DA5A0] hover:bg-[#2DA5A0]/30 min-h-[44px] sm:w-auto"
        >
          Complete CAQ
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  );
}
