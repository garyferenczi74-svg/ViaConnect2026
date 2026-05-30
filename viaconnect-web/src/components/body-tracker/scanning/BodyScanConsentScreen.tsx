'use client';

// BodyScanConsentScreen.tsx  (Prompt #169b, Task 16, spec section 2.2.1)
//
// A biometric-consent screen SEPARATE from the general Terms of Service. It
// presents the slotted consent sections (what is / is not collected, purposes,
// retention schedule, destruction, no-sale, practitioner-share), a retention-
// preference selector (0 default; opt-in 30 / 90 / 365 / indefinite), and a
// SEPARATE granular model-improvement opt-in that is OFF by default and must be
// actively turned on. On accept it writes an append-only biometric_consents row
// via useBiometricConsent.
//
// COPY SLOTS: every legal string rendered here is a clearly-marked PLACEHOLDER
// imported from body-scan-copy-slots.ts (counsel-gated). This component renders
// NO final legal copy; it only wires the mechanism + the slots. The slot
// constants carry the // TODO(counsel) markers describing the approved wording.
//
// Styling mirrors the body-tracker callout cards; Lucide icons at strokeWidth
// 1.5; copy punctuation is commas/colons only (no dashes); responsive.

import { useEffect, useState } from 'react';
import { ShieldCheck, Check, Loader2 } from 'lucide-react';
import {
  useBiometricConsent,
  type RecordConsentArgs,
} from '@/hooks/body-tracker/useBiometricConsent';
import {
  RETENTION_OPTIONS,
  DEFAULT_RETENTION_DAYS,
  DEFAULT_MODEL_IMPROVEMENT_OPT_IN,
  CURRENT_CONSENT_VERSION,
} from '@/lib/body-tracker/biometric-consent';
import { trackConsentViewed, trackConsentAccepted } from '@/lib/body-tracker/scan-analytics';
import {
  CONSENT_SECTION_SLOTS,
  CONSENT_SCREEN_TITLE_SLOT,
  CONSENT_SCREEN_INTRO_SLOT,
  CONSENT_ACCEPT_LABEL_SLOT,
  MODEL_IMPROVEMENT_OPT_IN_LABEL_SLOT,
  MODEL_IMPROVEMENT_OPT_IN_BODY_SLOT,
} from '@/lib/body-tracker/body-scan-copy-slots';

interface BodyScanConsentScreenProps {
  // The consent-write function. When the screen is gated by BodyScanConsentGate,
  // the gate passes its OWN hook's recordConsent so the write refreshes the
  // gate's hasCurrentConsent (no duplicate hook, no remount needed to flip the
  // gate). When omitted (standalone use), the screen falls back to its own hook.
  recordConsent?: (args: RecordConsentArgs) => Promise<boolean>;
  // Called after a consent row is successfully written (so the parent can
  // proceed to the capture flow it was gating).
  onConsented?: () => void;
  className?: string;
}

// Human-readable duration label for a retention option. This is a DURATION, not
// legally-sensitive copy; the surrounding retention EXPLANATION is the
// counsel-gated slot (CONSENT_SECTION_SLOTS retention_schedule).
function retentionLabel(days: number | null): string {
  if (days === null) return 'Keep indefinitely';
  if (days === 0) return 'Keep only for this session';
  return `Keep for ${days} days`;
}

export function BodyScanConsentScreen({
  recordConsent: recordConsentProp,
  onConsented,
  className = '',
}: BodyScanConsentScreenProps) {
  // Prefer the gate's hoisted recordConsent (so the write refreshes the gate's
  // single consent state); fall back to a local hook for standalone use. The
  // fallback hook is only the I/O writer here, not a second gate decision.
  const { recordConsent: recordConsentFallback } = useBiometricConsent();
  const recordConsent = recordConsentProp ?? recordConsentFallback;
  const [retentionDays, setRetentionDays] = useState<number | null>(DEFAULT_RETENTION_DAYS);
  // SEPARATE, default-OFF model-improvement opt-in (section 2.2.1). It is never
  // bundled into the accept; the user must actively turn it on.
  const [modelImprovementOptIn, setModelImprovementOptIn] = useState<boolean>(
    DEFAULT_MODEL_IMPROVEMENT_OPT_IN,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analytics (§14): the biometric-consent screen was shown. Fires once on mount.
  // consent_version is metadata (an identifier), never a biometric value.
  useEffect(() => {
    trackConsentViewed({ consent_version: CURRENT_CONSENT_VERSION });
  }, []);

  async function handleAccept() {
    setSubmitting(true);
    setError(null);
    const ok = await recordConsent({ retentionDays, modelImprovementOptIn });
    setSubmitting(false);
    if (ok) {
      // Analytics (§14): consent accepted. Emits the version + the SEPARATE
      // model-improvement opt-in boolean only (both metadata, §2.2.1). The
      // retention DAYS value is intentionally not logged.
      trackConsentAccepted({
        consent_version: CURRENT_CONSENT_VERSION,
        model_improvement_opt_in: modelImprovementOptIn,
      });
      onConsented?.();
    } else {
      setError('We could not record your consent. Please try again.');
    }
  }

  return (
    <section
      data-testid="body-scan-consent-screen"
      className={`rounded-2xl border border-white/[0.08] bg-[#1E3054]/50 p-6 sm:p-7 space-y-5 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[#2DA5A0]/15">
          <ShieldCheck className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          {/* TODO(counsel): final consent title + intro (slot). */}
          <h2 className="text-base font-semibold text-white">{CONSENT_SCREEN_TITLE_SLOT}</h2>
          <p className="mt-1 text-sm leading-relaxed text-white/70">{CONSENT_SCREEN_INTRO_SLOT}</p>
        </div>
      </div>

      {/* Consent sections (slotted; counsel-gated wording) */}
      <div className="space-y-3">
        {CONSENT_SECTION_SLOTS.map((section) => (
          <div
            key={section.id}
            data-consent-section={section.id}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
          >
            {/* TODO(counsel): heading + body for this section (slot). */}
            <p className="text-sm font-semibold text-white">{section.headingSlot}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/60">{section.bodySlot}</p>
          </div>
        ))}
      </div>

      {/* Retention preference selector (0 default; opt-in longer windows) */}
      <fieldset className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-white/50">
          Retention preference
        </legend>
        <div className="mt-2 space-y-2">
          {RETENTION_OPTIONS.map((opt) => {
            const selected = retentionDays === opt.days;
            return (
              <label
                key={opt.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer min-h-[44px] ${
                  selected
                    ? 'border-[#2DA5A0]/40 bg-[#2DA5A0]/10'
                    : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <input
                  type="radio"
                  name="body-scan-retention"
                  className="sr-only"
                  checked={selected}
                  onChange={() => setRetentionDays(opt.days)}
                />
                <span
                  className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border ${
                    selected ? 'border-[#2DA5A0] bg-[#2DA5A0]' : 'border-white/30'
                  }`}
                >
                  {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                <span className="text-sm text-white/80">
                  {retentionLabel(opt.days)}
                  {opt.days === DEFAULT_RETENTION_DAYS && (
                    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                      Default
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* SEPARATE granular model-improvement opt-in (default OFF) */}
      <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex-1 min-w-0">
          {/* TODO(counsel): opt-in label + body (slot). */}
          <label htmlFor="model-improvement-opt-in" className="text-sm font-semibold text-white cursor-pointer">
            {MODEL_IMPROVEMENT_OPT_IN_LABEL_SLOT}
          </label>
          <p className="mt-1 text-xs leading-relaxed text-white/60">{MODEL_IMPROVEMENT_OPT_IN_BODY_SLOT}</p>
        </div>
        <button
          id="model-improvement-opt-in"
          type="button"
          role="switch"
          aria-checked={modelImprovementOptIn}
          aria-label="Help improve the model (optional)"
          onClick={() => setModelImprovementOptIn((v) => !v)}
          className="relative flex-none mt-0.5 inline-flex h-6 w-11 items-center justify-center rounded-full min-h-[44px] min-w-[44px]"
        >
          <span
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              modelImprovementOptIn ? 'bg-[#2DA5A0]' : 'bg-white/15'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                modelImprovementOptIn ? 'translate-x-[22px]' : 'translate-x-[2px]'
              }`}
            />
          </span>
        </button>
      </div>

      {error && <p className="text-xs text-[#FCA5A5]">{error}</p>}

      {/* Accept action: the affirmative click that records consent. TODO(counsel)
          for the exact label (slot). The model-improvement opt-in is recorded as
          its OWN value, never implied by this accept. */}
      <button
        type="button"
        onClick={handleAccept}
        disabled={submitting}
        className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/20 px-5 py-2.5 text-sm font-semibold text-[#2DA5A0] hover:bg-[#2DA5A0]/30 min-h-[44px] disabled:opacity-50"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <Check className="h-4 w-4" strokeWidth={1.5} />}
        {CONSENT_ACCEPT_LABEL_SLOT}
      </button>
    </section>
  );
}
