'use client';

// NumbersOptionalToggle.tsx  (Prompt #169b, spec section 3.2.4)
//
// The "Hide specific numbers" settings toggle, available to ALL users. A
// body-image safeguard: when ON, the body-scan results surfaces hide precise
// numbers (showing trend arrows + confidence ranges only), hide body fat
// percentage + visceral fat index entirely, and let the user tap any metric to
// temporarily reveal its value.
//
// The toggle persists per user via useNumbersOptional (profiles.numbers_optional,
// the same store as the existing unit_system preference). Styling mirrors the
// body-tracker callout cards; Lucide icons at strokeWidth 1.5; copy uses
// commas/colons only (no dashes per standing rules).

import { EyeOff } from 'lucide-react';
import { useNumbersOptional } from '@/hooks/body-tracker/useNumbersOptional';
import { trackSettingsChanged } from '@/lib/body-tracker/scan-analytics';

interface NumbersOptionalToggleProps {
  className?: string;
}

export function NumbersOptionalToggle({ className = '' }: NumbersOptionalToggleProps) {
  const { numbersOptional, isLoading, setNumbersOptional } = useNumbersOptional();

  return (
    <div
      data-testid="numbers-optional-toggle"
      className={`flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-[#1E3054]/60 p-4 ${className}`}
    >
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[#2DA5A0]/20">
        <EyeOff className="h-4.5 w-4.5 text-[#2DA5A0]" strokeWidth={1.5} />
      </div>

      <div className="flex-1 min-w-0">
        <label htmlFor="numbers-optional-switch" className="text-sm font-semibold text-white cursor-pointer">
          Hide specific numbers
        </label>
        <p className="mt-1 text-xs leading-relaxed text-white/65">
          Focus on direction, not digits. When on, your results show trend arrows and confidence
          ranges instead of exact figures, and body fat percentage and visceral fat are hidden. Tap
          any metric to reveal it for a moment.
        </p>
      </div>

      <button
        id="numbers-optional-switch"
        type="button"
        role="switch"
        aria-checked={numbersOptional}
        aria-label="Hide specific numbers"
        disabled={isLoading}
        onClick={() => {
          const next = !numbersOptional;
          // Analytics (§14): a NON-sensitive display setting. Emit the name and
          // the new boolean value. This is a UX preference, not a biometric value.
          trackSettingsChanged({ setting_name: 'numbers_optional', new_value: next });
          void setNumbersOptional(next);
        }}
        className="relative flex-none mt-0.5 inline-flex h-6 w-11 items-center justify-center rounded-full min-h-[44px] min-w-[44px] disabled:opacity-50"
      >
        <span
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            numbersOptional ? 'bg-[#2DA5A0]' : 'bg-white/15'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              numbersOptional ? 'translate-x-[22px]' : 'translate-x-[2px]'
            }`}
          />
        </span>
      </button>
    </div>
  );
}
