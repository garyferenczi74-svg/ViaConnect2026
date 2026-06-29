'use client';

import { Info, ShieldCheck } from 'lucide-react';

// ---- Compliance gate for the 90 percent accuracy claim (Section 10.5 / 17.2) ----
//
// ACCURACY_CLAIM_PROVEN = false is the ONLY safe default.
// Flip this flag ONLY after ALL of the following are complete:
//   1. runValidation() in validationHarness.ts reports heldOutPass = true on a real
//      labeled cohort of at least 30 samples per region per Section 10.1.
//   2. Hannah (tone review) has approved all claim and framing copy.
//   3. Kelsey (compliance claims review) has approved the accuracy percentage,
//      tolerance values, and cohort description.
//   4. The flag change is committed in a named compliance-review commit.
//
// While this flag is false, NO accuracy percentage is shown. The UnprovenFrame
// rendered below is the ONLY compliant display today.
//
// This is a typed const (not a runtime feature flag) so the gate is visible in
// code review and survives tree-shaking. It is intentionally not read from an
// environment variable - the gate must be human-reviewed, not toggled remotely.
export const ACCURACY_CLAIM_PROVEN = false as const;

// ---- Placeholder proven claim data (FLAGGED FOR KELSEY CLEARANCE) -----------
//
// These values are PLACEHOLDER until the validation harness proves the target and
// Kelsey clears the claim. Do NOT use these numbers in any communication while
// ACCURACY_CLAIM_PROVEN is false. The passPercent and toleranceCm must be replaced
// with the actual harness output values once the labeled cohort is complete.
const PROVEN_CLAIM = {
  passPercent: 90,
  toleranceCm: 3,
  cohortDescription: 'validated on a held-out measurement cohort per our accuracy protocol',
} as const;

// ---- Non-dismissible disclaimer text ----------------------------------------
//
// FLAGGED FOR HANNAH REVIEW (tone) + KELSEY REVIEW (compliance claims).
// This text must appear in BOTH the proven and unproven states and must never
// be removed or made dismissible. It is the single mandatory AI-estimate caveat.
const DISCLAIMER_TEXT =
  'Measurements are AI-derived estimates from your photos, not clinical measurements. ' +
  'Use them to track trends over time. For clinical accuracy, use a tape measure, ' +
  'smart scale, or DEXA scan.';

// ---- Component -----------------------------------------------------------------

interface ScanAccuracyClaimProps {
  /**
   * Internal test-only override for ACCURACY_CLAIM_PROVEN.
   * In production, the gate is always the static constant above.
   * Use only in unit tests to exercise both branches.
   */
  _testProven?: boolean;
  className?: string;
}

/**
 * Renders the accuracy framing and non-dismissible disclaimer for FormaVision scans.
 *
 * Gate behavior:
 *   ACCURACY_CLAIM_PROVEN = false (only live state today):
 *     Conservative estimate framing with NO accuracy percentage.
 *   ACCURACY_CLAIM_PROVEN = true (future, after harness proof + human sign-off):
 *     The proven figure with tolerance and cohort description.
 *
 * The non-dismissible AI-estimate disclaimer is ALWAYS visible in both states.
 * Desktop and mobile responsive via Tailwind.
 *
 * COPY STATUS: all strings flagged for Hannah (tone) + Kelsey (claims) review.
 */
export function ScanAccuracyClaim({ _testProven, className }: ScanAccuracyClaimProps) {
  const proven = _testProven ?? ACCURACY_CLAIM_PROVEN;
  return (
    <div className={`space-y-3 ${className ?? ''}`}>
      {proven ? <ProvenFrame /> : <UnprovenFrame />}
      <DisclaimerBlock />
    </div>
  );
}

// FLAGGED FOR HANNAH REVIEW (tone): framing copy, no accuracy numbers.
function UnprovenFrame() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5 space-y-2">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} strokeWidth={1.5} className="flex-none text-[#2DA5A0]" />
        <p className="text-sm font-medium text-white">AI body measurements from photos</p>
      </div>
      <p className="text-xs leading-relaxed text-white/60">
        Your measurements are estimated from your four scan photos using geometric
        analysis. Confidence varies by region and photo quality. High-confidence
        readings closely match tape-measure results; lower-confidence readings are
        best used for tracking trends over time.
      </p>
      <p className="text-[11px] text-white/35">
        Independent accuracy validation is in progress. The accuracy figure will be
        published after a held-out measurement study and compliance review.
      </p>
    </div>
  );
}

// FLAGGED FOR KELSEY CLEARANCE: contains accuracy percentage and tolerance.
// This branch renders only when ACCURACY_CLAIM_PROVEN is true.
function ProvenFrame() {
  return (
    <div className="rounded-xl border border-[#2DA5A0]/25 bg-[#2DA5A0]/[0.07] p-4 sm:p-5 space-y-2">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} strokeWidth={1.5} className="flex-none text-[#2DA5A0]" />
        <p className="text-sm font-medium text-white">
          {PROVEN_CLAIM.passPercent}% of measurements within {PROVEN_CLAIM.toleranceCm} cm
        </p>
      </div>
      <p className="text-xs leading-relaxed text-white/60">
        Accuracy proven on held-out data, {PROVEN_CLAIM.cohortDescription}.
        Individual measurements may vary; accuracy improves with better photo quality.
      </p>
    </div>
  );
}

// Always rendered, both states.
// FLAGGED FOR HANNAH REVIEW (tone) + KELSEY REVIEW (compliance).
function DisclaimerBlock() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-xs text-white/55">
      <Info size={14} strokeWidth={1.5} className="mt-0.5 flex-none text-white/40" />
      <p>{DISCLAIMER_TEXT}</p>
    </div>
  );
}
