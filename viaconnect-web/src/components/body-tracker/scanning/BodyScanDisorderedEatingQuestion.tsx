'use client';

// BodyScanDisorderedEatingQuestion.tsx  (Prompt #169b, Task 16, spec section 3.2.1)
//
// The one-screen, four-option question shown BEFORE the educational walkthrough
// on first Body Scan open: currently / in the past / no / prefer not to say.
// Selecting an option stores the response on the user's profile (owner-only,
// never visible to practitioners) AND seeds the response-adaptive defaults
// (section 3.2.2), then calls onAnswered so the parent advances to the
// walkthrough.
//
// COPY SLOTS: the prompt, the four option labels, and the privacy note are all
// clearly-marked PLACEHOLDERS imported from body-scan-copy-slots.ts (clinician-
// gated, with the privacy note also counsel-touched). This component renders NO
// final question or crisis copy; it only wires the mechanism + the slots.
//
// SELF-GATING: pass `mode="auto"` to have the component decide, from the stored
// answer, whether to render at all (it renders only when not yet answered and
// not loading). Pass `mode="always"` to force-render (e.g. a settings re-entry).
//
// Styling mirrors the onboarding walkthrough modal; Lucide strokeWidth 1.5;
// commas/colons only (no dashes); responsive.

import { useEffect, useRef, useState } from 'react';
import { HeartHandshake, Loader2 } from 'lucide-react';
import { useDisorderedEatingSafeguard } from '@/hooks/body-tracker/useDisorderedEatingSafeguard';
import { trackDisorderedEatingAnswered } from '@/lib/body-tracker/scan-analytics';
import {
  DISORDERED_EATING_QUESTION_PROMPT_SLOT,
  DISORDERED_EATING_OPTION_SLOTS,
  DISORDERED_EATING_PRIVACY_NOTE_SLOT,
} from '@/lib/body-tracker/body-scan-copy-slots';
import type { DisorderedEatingResponse } from '@/lib/body-tracker/disordered-eating-safeguard';

interface BodyScanDisorderedEatingQuestionProps {
  // 'auto' renders only when the user has not yet answered (the first-open flow);
  // 'always' force-renders regardless (settings re-entry).
  mode?: 'auto' | 'always';
  // Called once a response is recorded (or when already answered in 'auto' mode,
  // so the parent can immediately advance to the walkthrough without a flash).
  onAnswered?: (response: DisorderedEatingResponse | null) => void;
  className?: string;
}

export function BodyScanDisorderedEatingQuestion({
  mode = 'auto',
  onAnswered,
  className = '',
}: BodyScanDisorderedEatingQuestionProps) {
  const { hasAnswered, response, isLoading, recordResponse } = useDisorderedEatingSafeguard();
  const [submitting, setSubmitting] = useState<DisorderedEatingResponse | null>(null);
  // Notify the parent exactly once when, in 'auto' mode, the question
  // self-resolves because it was already answered (so the parent advances to the
  // walkthrough without a flash and without re-asking returning users).
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (mode === 'auto' && !isLoading && hasAnswered && !notifiedRef.current) {
      notifiedRef.current = true;
      onAnswered?.(response);
    }
  }, [mode, isLoading, hasAnswered, response, onAnswered]);

  // In 'auto' mode: while loading, render nothing (avoid a flash). Once loaded,
  // if already answered, render nothing (the effect above advances the parent).
  if (mode === 'auto' && (isLoading || hasAnswered)) {
    return null;
  }

  async function choose(value: DisorderedEatingResponse) {
    setSubmitting(value);
    await recordResponse(value);
    setSubmitting(null);
    // Analytics (§14 + §3 privacy): record ONLY that the question was answered.
    // The RESPONSE value is never logged; the emitter cannot carry it.
    trackDisorderedEatingAnswered();
    onAnswered?.(value);
  }

  return (
    <div
      data-testid="body-scan-de-question"
      className={`rounded-2xl border border-white/[0.1] bg-[#0D1A27] p-6 sm:p-7 space-y-5 ${className}`}
      role="group"
      aria-label="Before you begin"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[#2DA5A0]/15">
          <HeartHandshake className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          {/* TODO(clinician): sensitively-worded prompt (slot). */}
          <p className="text-base font-semibold text-white leading-snug">
            {DISORDERED_EATING_QUESTION_PROMPT_SLOT}
          </p>
        </div>
      </div>

      {/* Four options. The machine values are fixed; the labels are slots. */}
      <div className="space-y-2">
        {DISORDERED_EATING_OPTION_SLOTS.map((opt) => {
          const isBusy = submitting === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              data-de-option={opt.value}
              disabled={submitting !== null}
              onClick={() => void choose(opt.value)}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3 text-left text-sm font-medium text-white/80 hover:bg-white/[0.06] min-h-[44px] disabled:opacity-50"
            >
              {/* TODO(clinician): option label (slot). */}
              <span>{opt.labelSlot}</span>
              {isBusy && <Loader2 className="h-4 w-4 animate-spin flex-none" strokeWidth={1.5} />}
            </button>
          );
        })}
      </div>

      {/* Privacy note: private, encrypted at rest, never shown to practitioners,
          used only to tune the user's own experience. TODO(clinician)+TODO(counsel). */}
      <p className="text-xs leading-relaxed text-white/50">{DISORDERED_EATING_PRIVACY_NOTE_SLOT}</p>
    </div>
  );
}
