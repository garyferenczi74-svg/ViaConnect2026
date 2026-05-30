'use client';

// CyclePhaseOptInToggle.tsx  (Prompt #169b, spec section 11.2.3)
//
// The CONSUMER-ONLY, GRANULAR opt-in (default OFF) for cycle-phase trend
// annotation. When ON, the consumer's OWN body-scan trend may annotate scans with
// the expected menstrual-cycle phase at the scan date (a non-clinical "fluid
// retention is typical, compare across the same phase" note).
//
// PRIVACY: cycle data is sensitive. The copy states plainly that this is private
// to the consumer and never shown to a practitioner or naturopath. The preference
// persists per user via useCyclePhaseOptIn (profiles.cycle_phase_annotation_opt_in,
// default OFF, the same store as numbers_optional). Styling mirrors the
// NumbersOptionalToggle; Lucide strokeWidth 1.5; copy uses commas/colons only.

import { Moon } from 'lucide-react';
import { useCyclePhaseOptIn } from '@/hooks/body-tracker/useCyclePhaseOptIn';
import { trackSettingsChanged } from '@/lib/body-tracker/scan-analytics';

interface CyclePhaseOptInToggleProps {
  className?: string;
}

export function CyclePhaseOptInToggle({ className = '' }: CyclePhaseOptInToggleProps) {
  const { optedIn, isLoading, setOptedIn } = useCyclePhaseOptIn();

  return (
    <div
      data-testid="cycle-phase-opt-in-toggle"
      className={`flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-[#1E3054]/60 p-4 ${className}`}
    >
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[#8B7FD6]/20">
        <Moon className="h-4.5 w-4.5 text-[#C4B5FD]" strokeWidth={1.5} />
      </div>

      <div className="flex-1 min-w-0">
        <label htmlFor="cycle-phase-opt-in-switch" className="text-sm font-semibold text-white cursor-pointer">
          Annotate my trend with cycle phase
        </label>
        <p className="mt-1 text-xs leading-relaxed text-white/65">
          Optional, and off by default. When on, your own trend can note the cycle phase a scan fell
          in, so you can compare like with like (fluid retention varies across the cycle). This stays
          private to you: it is never shown to a practitioner or naturopath.
        </p>
      </div>

      <button
        id="cycle-phase-opt-in-switch"
        type="button"
        role="switch"
        aria-checked={optedIn}
        aria-label="Annotate my trend with cycle phase"
        disabled={isLoading}
        onClick={() => {
          const next = !optedIn;
          // Analytics (§14): cycle-phase annotation is a SENSITIVE setting. Emit
          // the setting NAME and only a COARSE boolean (enabled). The cycle phase
          // value itself is never logged anywhere.
          trackSettingsChanged({ setting_name: 'cycle_phase_annotation_opt_in', enabled: next });
          void setOptedIn(next);
        }}
        className="relative flex-none mt-0.5 inline-flex h-6 w-11 items-center justify-center rounded-full min-h-[44px] min-w-[44px] disabled:opacity-50"
      >
        <span
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            optedIn ? 'bg-[#8B7FD6]' : 'bg-white/15'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              optedIn ? 'translate-x-[22px]' : 'translate-x-[2px]'
            }`}
          />
        </span>
      </button>
    </div>
  );
}
