'use client';

// ScanOnboardingWalkthrough.tsx
//
// First-time-only 4-step educational walkthrough for body scanning.
//
// Per memory `project_hannah_video_walkthroughs.md`:
//   Hannah walkthroughs = video + AI chatbox, built separately by Gary.
//   This component mounts a <HannahWalkthrough target="body-scan-onboarding">
//   slot only. DO NOT build video/chatbox content here.
//
// Persistence: completion flag stored in localStorage under key
//   "vc_scan_onboarding_seen". On first visit the modal shows; subsequent
//   visits it renders nothing. A HelpCircle icon in PhotoSessionCapture
//   re-opens it on demand via the `forceOpen` prop.

import { useCallback, useEffect, useState } from 'react';
import { X, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';
import HannahWalkthrough from '@/components/admin/hannah/HannahWalkthrough';
import { FORMAVISION_BRAND } from '@/lib/body-tracker/brand-config';
import { trackOnboardingStarted, trackOnboardingCompleted } from '@/lib/body-tracker/scan-analytics';

interface ScanOnboardingWalkthroughProps {
  /** When true, modal opens even if already seen (triggered by HelpCircle). */
  forceOpen?: boolean;
  onClose?: () => void;
}

const SEEN_KEY = 'vc_scan_onboarding_seen';

const STEPS = [
  {
    heading: `How ${FORMAVISION_BRAND.name} works`,
    body: 'ViaConnect uses your camera and AI to estimate body measurements. Four poses are captured and analyzed automatically.',
  },
  {
    heading: 'Calibration',
    body: 'Placing a credit card flat on the floor gives the AI a known reference size. If you skip this, your reported height is used instead.',
  },
  {
    heading: 'Quality checks',
    body: 'Six real-time indicators confirm good lighting, posture, clothing fit, camera level, background, and full-body framing before the photo is taken.',
  },
  {
    heading: 'Auto-capture',
    body: 'When all checks are green for 1.5 seconds, three frames are taken automatically and blended for the most accurate result.',
  },
] as const;

export function ScanOnboardingWalkthrough({
  forceOpen = false,
  onClose,
}: ScanOnboardingWalkthroughProps) {
  const [open, setOpen]     = useState(false);
  const [stepIdx, setStep]  = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      setStep(0);
      // Analytics (§14): the walkthrough opened (re-opened via HelpCircle here).
      trackOnboardingStarted({ trigger_point: 'help_button' });
      return;
    }
    try {
      const seen = localStorage.getItem(SEEN_KEY);
      if (!seen) {
        setOpen(true);
        // Analytics (§14): the first-open educational walkthrough opened.
        trackOnboardingStarted({ trigger_point: 'first_open' });
      }
    } catch {
      // localStorage unavailable (SSR, private browsing): skip
    }
  }, [forceOpen]);

  const handleClose = useCallback(() => {
    setOpen(false);
    // Analytics (§14): the walkthrough was finished / dismissed. step_name is the
    // step the user was on when it closed (metadata only, no biometric value).
    trackOnboardingCompleted({ step_name: `step_${stepIdx + 1}` });
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch { /* ignore */ }
    onClose?.();
  }, [onClose, stepIdx]);

  if (!open) return null;

  const step    = STEPS[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast  = stepIdx === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-8 sm:pb-0"
      role="dialog"
      aria-modal="true"
      aria-label="Scan onboarding walkthrough"
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#0D1A27] shadow-2xl overflow-hidden">
        {/* Walkthrough framework slot */}
        <HannahWalkthrough
          target="body-scan-onboarding"
          context={{ step: stepIdx, total: STEPS.length }}
        />

        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-white/50 hover:bg-white/[0.12] transition-colors"
          aria-label="Close walkthrough"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>

        {/* Step progress dots */}
        <div className="flex items-center justify-center gap-1.5 pt-5 pb-1">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === stepIdx ? 'bg-[#2DA5A0]' : i < stepIdx ? 'bg-[#2DA5A0]/40' : 'bg-white/15'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 pt-4 pb-6 space-y-3 min-h-[140px]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2DA5A0]">
            Step {stepIdx + 1} of {STEPS.length}
          </p>
          <h3 className="text-lg font-bold text-white leading-snug">{step.heading}</h3>
          <p className="text-sm text-white/65 leading-relaxed">{step.body}</p>
        </div>

        {/* Footer nav */}
        <div className="flex items-center gap-2 px-6 pb-6">
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={isFirst}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/[0.06] min-h-[44px] disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            Back
          </button>
          <div className="flex-1" />
          {isLast ? (
            <button
              type="button"
              onClick={handleClose}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/20 px-5 py-2.5 text-sm font-semibold text-[#2DA5A0] hover:bg-[#2DA5A0]/30 min-h-[44px]"
            >
              Got it
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/20 px-4 py-2.5 text-sm font-semibold text-[#2DA5A0] hover:bg-[#2DA5A0]/30 min-h-[44px]"
            >
              Next
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Re-open help hint exposed externally as a named export */}
    </div>
  );
}

/** Standalone HelpCircle trigger that re-opens the walkthrough. */
export function ScanHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/50 hover:bg-white/[0.12] transition-colors"
      aria-label="Re-open scan guide"
    >
      <HelpCircle className="h-4 w-4" strokeWidth={1.5} />
    </button>
  );
}
