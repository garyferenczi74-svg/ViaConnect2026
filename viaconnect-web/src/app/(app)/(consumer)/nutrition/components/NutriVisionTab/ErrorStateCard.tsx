'use client';

// Prompt #170a supplement §20.1 / §20.2 / §20.7: structured error card.
//
// Replaces the prior toast-only error path. Six error_class values map to
// Hannah's locked body copy; all share the same heading, the same Lucide
// RefreshCw icon (Orange #B75E18 stroke), and the same three CTAs stacked
// vertically (Try Again primary, Log Manually secondary, Discard tertiary).
//
// Accessibility: role="alert" + aria-labelledby + focus moves to Try Again on
// mount. Reduced-motion respected (no slide on mount).
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import type { NutriVisionErrorClass } from '@/lib/nutrition/vision/error-class-mapper';

export interface ErrorStateCardProps {
  errorClass: NutriVisionErrorClass;
  photoBlobId?: string;
  onTryAgain: () => void;
  onLogManually: () => void;
  onDiscard: () => void;
}

// §20.2 Hannah locked copy. Straight ASCII apostrophes throughout (no smart
// quotes); no em or en dashes.
const BODY_COPY: Record<NutriVisionErrorClass, string> = {
  provider_timeout:
    "The connection is taking longer than usual. A quick retry usually clears this up.",
  provider_outage:
    "Our analysis service is offline right now. You can log this meal manually while we work on it.",
  image_too_large:
    "The photo file is larger than we can read in one pass. Try retaking with the in-app camera.",
  image_corrupt:
    "The photo didn't transfer cleanly. A fresh shot from the in-app camera should fix this.",
  budget_hard_stop:
    "We've reached today's recognition limit across all users. You can log this meal manually for now.",
  unknown:
    "Something didn't go as expected. A retry or a manual log will get you back on track.",
};

// Heading universal across all six (§20.1).
const HEADING = 'We could not read this meal photo';

const HEADING_ID = 'nutrivision-error-heading';
const BODY_ID = 'nutrivision-error-body';

export function ErrorStateCard(props: ErrorStateCardProps) {
  const tryAgainRef = useRef<HTMLButtonElement | null>(null);

  // §20.1 Hannah accessibility: focus moves to Try Again on mount.
  useEffect(() => {
    tryAgainRef.current?.focus();
  }, []);

  const body = BODY_COPY[props.errorClass];

  return (
    <section
      role="alert"
      aria-labelledby={HEADING_ID}
      aria-describedby={BODY_ID}
      data-photo-blob-id={props.photoBlobId ?? ''}
      className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-6 rounded-2xl bg-[#1E3054] p-6 text-center motion-safe:animate-[fade-in_200ms_ease-out]"
    >
      <RefreshCw
        aria-hidden="true"
        className="h-10 w-10 text-[#B75E18]"
        strokeWidth={1.5}
      />

      <div className="flex flex-col gap-4">
        <h2 id={HEADING_ID} className="text-lg font-semibold text-white">
          {HEADING}
        </h2>
        <p
          id={BODY_ID}
          className="text-[15px] leading-[22px] text-white/85"
        >
          {body}
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <button
          ref={tryAgainRef}
          type="button"
          onClick={props.onTryAgain}
          className="inline-flex h-[52px] w-full items-center justify-center rounded-xl bg-[#2DA5A0] text-base font-semibold text-[#1A2744] transition-colors hover:bg-[#2DA5A0]/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/60"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={props.onLogManually}
          className="inline-flex h-[52px] w-full items-center justify-center rounded-xl border-[1.5px] border-[#2DA5A0] bg-[#1E3054] text-base font-semibold text-[#2DA5A0] transition-colors hover:bg-[#1A2744] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/60"
        >
          Log manually
        </button>
      </div>

      <button
        type="button"
        onClick={props.onDiscard}
        aria-label="Discard this analysis and return to the Nutrition home screen"
        className="inline-flex h-[44px] items-center justify-center rounded-md px-4 text-sm font-medium text-[#2DA5A0] transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/60"
      >
        Discard and exit
      </button>
    </section>
  );
}
