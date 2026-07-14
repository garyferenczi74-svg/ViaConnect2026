'use client';

// Task 211b-W4b - Pregnancy-mode indication control (SAFETY-CRITICAL).
//
// A controlled component: the composition page owns the single
// usePregnancyGating(userId) call (src/hooks/body-tracker/usePregnancyGating.ts)
// so its gating result can be shared with every composition-estimate surface
// (BodyFatReadout, NotableChanges, FutureSelfPanel, PersonalPrecisionPanel) from
// one source, never re-derived per-surface. This component only renders the
// control and forwards user choices via onChange.
//
// Default OFF ('none'): a user who has never touched this control sees no
// suppression and the page is unchanged. Choosing Pregnant or Lactating writes
// user_health_context.pregnancy_status (via the hook); the honest, supportive
// copy here explains that composition ESTIMATES pause while girth measurements
// keep working, matching PREGNANCY_COMPOSITION_SUPPRESSED_COPY used on the
// suppressed surfaces themselves.
//
// Standing rules: Lucide strokeWidth 1.5, no emojis, no em/en dashes, tokens
// only (Teal #2DA5A0 / Navy #1E3054 / Orange #B75E18), Instrument Sans.
// Desktop AND mobile responsive, 44px min touch targets.

import { Heart } from 'lucide-react';
import type { PregnancyIndication } from '@/hooks/body-tracker/usePregnancyGating';

export interface PregnancyModeControlContentProps {
  indication: PregnancyIndication;
  saving: boolean;
  onChange: (next: PregnancyIndication) => void;
}

const OPTIONS: Array<{ value: PregnancyIndication; label: string }> = [
  { value: 'none', label: 'Not applicable' },
  { value: 'pregnant', label: 'Pregnant' },
  { value: 'lactating', label: 'Lactating or breastfeeding' },
];

export function PregnancyModeControlContent({
  indication,
  saving,
  onChange,
}: PregnancyModeControlContentProps) {
  const isActive = indication !== 'none';

  return (
    <div
      data-testid="pregnancy-mode-control"
      className="w-full rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 backdrop-blur-md sm:p-5"
    >
      <div className="flex items-start gap-2">
        <Heart
          size={16}
          strokeWidth={1.5}
          className="mt-0.5 flex-none text-[#B75E18]"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white">Pregnancy or lactation</h3>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            Let us know if either applies right now. Body composition estimates are not
            reliable during pregnancy or lactation, so we pause them and keep showing your
            girth measurements. This is private and only used to adjust what we show you.
          </p>
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label="Pregnancy or lactation status"
        className="mt-3 flex flex-col gap-2 sm:flex-row"
      >
        {OPTIONS.map((opt) => {
          const selected = indication === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              data-testid={`pregnancy-mode-option-${opt.value}`}
              disabled={saving}
              onClick={() => onChange(opt.value)}
              className={`min-h-[44px] flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all disabled:opacity-60 ${
                selected
                  ? 'border-[#B75E18]/60 bg-[#B75E18]/15 text-[#B75E18]'
                  : 'border-white/20 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {isActive && (
        <p
          data-testid="pregnancy-mode-active-note"
          className="mt-3 text-xs leading-relaxed text-[#2DA5A0]"
        >
          Composition estimates are paused. Your girth measurements stay available so you
          can keep tracking comfortably.
        </p>
      )}
    </div>
  );
}

export interface PregnancyModeControlProps extends PregnancyModeControlContentProps {
  error?: string | null;
}

export function PregnancyModeControl({
  indication,
  saving,
  onChange,
  error,
}: PregnancyModeControlProps) {
  return (
    <div className="w-full space-y-1.5">
      <PregnancyModeControlContent indication={indication} saving={saving} onChange={onChange} />
      {error && (
        <p data-testid="pregnancy-mode-error" className="px-1 text-xs text-[#FCA5A5]">
          {error}
        </p>
      )}
    </div>
  );
}
