'use client';

// RegionalOverlaySettings  the settings entries for the Phase 1 regional
// composition overlay (ViaConnect Prompt #169e(a), Section 6.3). Bundles:
//   * the "Show regional distribution" toggle (also surfaced in the viewer
//     chrome, Section 6.1),
//   * the distribution-pattern chooser, including the Section 5.2 note for
//     transgender users on hormone therapy (same pattern options),
//   * the opt-in control when a protective suppression (pregnancy window or a
//     current disordered-eating history) is hiding the overlay (5.3 / 5.4).
//
// This is a consumer-only surface. None of these preferences are exposed to
// practitioners. No dashes, no emojis, ASCII only.

import { DistributionPatternPicker } from './DistributionPatternPicker';
import type { UseRegionalOverlayResult } from '@/hooks/body-tracker/useRegionalOverlay';

interface RegionalOverlaySettingsProps {
  overlay: UseRegionalOverlayResult;
  /** True when a protective suppression currently hides the overlay (5.3/5.4). */
  suppressionActive?: boolean;
  /** A short label describing the active suppression, for the opt-in row. */
  suppressionLabel?: string;
  className?: string;
}

export function RegionalOverlaySettings({
  overlay,
  suppressionActive = false,
  suppressionLabel,
  className = '',
}: RegionalOverlaySettingsProps) {
  return (
    <section className={`space-y-3 ${className}`}>
      <header>
        <h4 className="text-xs font-bold text-white">Regional distribution overlay</h4>
        <p className="mt-0.5 text-[11px] leading-relaxed text-white/50">
          Shade your avatar by estimated regional fat distribution. This is an estimate from
          sex-banded patterns, not a direct measurement.
        </p>
      </header>

      {/* Show regional distribution toggle (Section 6.1 / 6.3). */}
      <label className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
        <span className="text-xs font-medium text-white/80">Show regional distribution</span>
        <button
          type="button"
          role="switch"
          aria-checked={overlay.enabled}
          onClick={() => overlay.setEnabled(!overlay.enabled)}
          className={`relative h-5 w-9 flex-none rounded-full transition-colors ${
            overlay.enabled ? 'bg-[#2DA5A0]' : 'bg-white/15'
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
              overlay.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
            }`}
          />
        </button>
      </label>

      {/* Distribution pattern chooser (Section 5.1 / 5.2). */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
        <DistributionPatternPicker
          value={overlay.chosenPattern}
          onChange={overlay.setChosenPattern}
        />
        {/* Section 5.2: transgender users on hormone therapy. */}
        <p className="mt-2 text-[11px] leading-relaxed text-white/45">
          If you are on hormone therapy, your fat distribution may shift over time toward a
          different pattern. You can choose the pattern that fits you best here, or pick Averaged,
          and change it whenever you like.
        </p>
      </div>

      {/* Opt-in row, only when a protective suppression is active (5.3 / 5.4). */}
      {suppressionActive && (
        <label className="flex items-start justify-between gap-3 rounded-xl border border-[#E8803A]/25 bg-[#E8803A]/[0.06] px-3 py-2.5">
          <span className="text-[11px] leading-relaxed text-white/70">
            {suppressionLabel ??
              'The regional overlay is hidden for now. You can turn it on for yourself here.'}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={overlay.optedInDespiteSuppression}
            onClick={() => overlay.setOptedInDespiteSuppression(!overlay.optedInDespiteSuppression)}
            className={`relative mt-0.5 h-5 w-9 flex-none rounded-full transition-colors ${
              overlay.optedInDespiteSuppression ? 'bg-[#2DA5A0]' : 'bg-white/15'
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                overlay.optedInDespiteSuppression ? 'translate-x-[18px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>
      )}
    </section>
  );
}
