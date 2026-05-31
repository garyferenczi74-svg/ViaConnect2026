'use client';

// RegionalAvatarSection  the mount-point wrapper that wires the Phase 1 regional
// composition overlay (ViaConnect Prompt #169e(a)) onto the existing 3D avatar in
// the consumer Body Scan results. It composes:
//   * the overlay hook (toggle + pattern choice + opt-in + safeguard mode),
//   * the pure regional service (region volumes from the SAME primitive avatar
//     segments the viewer renders, per-region fat mass + density, the user-own
//     range Teal -> Orange color map),
//   * the suppression decision for the Section 5 edge cases,
// then renders <AvatarViewer regional=... /> additively. When the overlay is off
// or suppressed, the viewer renders exactly as it does today.
//
// This component is consumer-only. None of the overlay state is exposed to
// practitioners (the practitioner Body Scan surface does not render this avatar;
// see practitioner-scan.ts and the deliverable note for Section 5.5).

import { useMemo, useState } from 'react';
import { Settings2 } from 'lucide-react';
import type { BodyModelParameters } from '@/lib/arnold/scanning/types';
import { generateAvatarMesh } from '@/lib/arnold/scanning/avatarMeshGenerator';
import { useRegionalOverlay } from '@/hooks/body-tracker/useRegionalOverlay';
import { useUserBiologicalSex } from '@/hooks/body-tracker/useUserBiologicalSex';
import {
  computeRegionalOverlay,
  resolveDistributionPattern,
  decideOverlaySuppression,
  type RegionVolumeSegment,
  type SexInput,
} from '@/lib/body-tracker/regional-fat-distribution';
import { AvatarViewer, type AvatarRegionalOverlay } from './AvatarViewer';
import { DistributionPatternPicker } from './DistributionPatternPicker';
import { RegionalOverlaySettings } from './RegionalOverlaySettings';

interface RegionalAvatarSectionProps {
  userId: string;
  params: BodyModelParameters;
  /** Resolved biological sex from the loaded scan (profiles). */
  sex: SexInput;
  /** Whole-body fat mass (kg) from body_scan_composition; null when absent. */
  fatMassKg: number | null;
  /** 0..1 scan quality score; a low value flags low-confidence composition (5.6). */
  qualityScore: number;
  /** Whether the user is hiding specific numbers (#169b numbers-optional). */
  hideNumbers?: boolean;
  /**
   * Pregnancy window signal (pregnancy or <= 6 months postpartum), Section 5.3.
   * NOTE: the codebase has no user pregnancy/postpartum flag today, so callers
   * pass false. The suppression is fully implemented and ready to wire the day a
   * pregnancy signal exists; this is reported in the deliverable.
   */
  isPregnancyWindow?: boolean;
  className?: string;
}

// Below this 0..1 quality score we treat the whole-body composition as
// low-confidence for overlay purposes (Section 5.6). Conservative: a passed Phase
// 1 scan scores well above this; the real trigger in practice is an absent
// fat_mass_kg. Tunable in one place.
const LOW_CONFIDENCE_QUALITY_FLOOR = 0.35;

export function RegionalAvatarSection({
  userId,
  params,
  sex,
  fatMassKg,
  qualityScore,
  hideNumbers = false,
  isPregnancyWindow = false,
  className = '',
}: RegionalAvatarSectionProps) {
  const overlay = useRegionalOverlay(userId);
  const { source: sexSource } = useUserBiologicalSex(userId);
  const [showSettings, setShowSettings] = useState(false);
  // First-view pattern offer (Section 5.1): shown once when sex is ambiguous and
  // no explicit pattern has been chosen yet, the first time the overlay is on.
  const [patternOfferDismissed, setPatternOfferDismissed] = useState(false);

  // Region volumes come from the SAME primitive avatar segments the viewer draws.
  const segments: RegionVolumeSegment[] = useMemo(() => {
    const mesh = generateAvatarMesh(params);
    return mesh.segments.map((s) => ({ kind: s.kind, radii: s.radii }));
  }, [params]);

  // Resolve the distribution pattern: an explicit choice always wins. Otherwise
  // the biological sex maps to its sex-typical pattern, EXCEPT when the sex is
  // ambiguous (non-binary / intersex / prefer-not-to-say, i.e. CAQ source
  // 'caq_other'); for those users with no explicit choice we pass no sex so the
  // resolver yields the recommended sex-neutral 'averaged' pattern (Section 5.1).
  const ambiguousSex = sexSource === 'caq_other';
  const pattern = useMemo(
    () =>
      resolveDistributionPattern({
        chosenPattern: overlay.chosenPattern,
        sex: ambiguousSex ? null : sex,
      }),
    [overlay.chosenPattern, sex, ambiguousSex],
  );

  // Reliable whole-body composition? (Section 5.6) Center on a usable fat mass.
  const hasReliableComposition =
    typeof fatMassKg === 'number' &&
    Number.isFinite(fatMassKg) &&
    fatMassKg > 0 &&
    qualityScore >= LOW_CONFIDENCE_QUALITY_FLOOR;

  const suppression = useMemo(
    () =>
      decideOverlaySuppression({
        hasReliableComposition,
        isPregnancyWindow,
        userOptedIn: overlay.optedInDespiteSuppression,
        safeguardMode: overlay.safeguardMode,
      }),
    [hasReliableComposition, isPregnancyWindow, overlay.optedInDespiteSuppression, overlay.safeguardMode],
  );

  // Compute the overlay (only meaningful when we have a fat mass).
  const computed = useMemo(
    () =>
      computeRegionalOverlay({
        pattern,
        wholeBodyFatMassKg: hasReliableComposition ? (fatMassKg as number) : 0,
        segments,
      }),
    [pattern, hasReliableComposition, fatMassKg, segments],
  );

  // The overlay is "active" (colors shown) only when the user enabled it AND it
  // is not suppressed for this scan/user.
  const overlayActive = overlay.enabled && !suppression.suppressed;

  // Section 5.1: offer the pattern choice on first overlay view for ambiguous sex.
  const showFirstViewPatternOffer =
    overlay.enabled &&
    ambiguousSex &&
    overlay.chosenPattern === null &&
    !patternOfferDismissed &&
    !suppression.suppressed;

  // Human note for the suppressed states (never user-blaming).
  const suppressedNote = (() => {
    if (!overlay.enabled) return null;
    switch (suppression.reason) {
      case 'missing_composition':
        // Section 5.6 note: render the avatar uncolored and explain briefly.
        return 'Regional distribution needs a confident whole-body composition for this scan. Your other results are unaffected.';
      case 'pregnancy_window':
        return 'Regional distribution is hidden during pregnancy and the months after. You can turn it on for yourself in settings.';
      case 'safeguard_current_de':
        return 'Regional distribution is hidden by default. You can turn it on for yourself in settings.';
      default:
        return null;
    }
  })();

  const regional: AvatarRegionalOverlay = {
    enabled: overlay.enabled,
    colorsActive: overlayActive,
    colorMap: computed.colors,
    distribution: computed.distribution,
    onToggle: overlay.setEnabled,
    available: true,
    hideNumbers,
    suppressedNote,
  };

  const suppressionLabel =
    suppression.reason === 'pregnancy_window'
      ? 'The regional overlay is hidden during pregnancy and the months after. Turn it on for yourself.'
      : suppression.reason === 'safeguard_current_de'
        ? 'The regional overlay is hidden by default for you. Turn it on for yourself.'
        : undefined;

  return (
    <div className={className}>
      <AvatarViewer
        params={params}
        initialView="free"
        initialVisualization="solid"
        hideNumericLabels={hideNumbers}
        regional={regional}
      />

      {/* Section 5.1: first-view pattern offer for ambiguous sex. */}
      {showFirstViewPatternOffer && (
        <div className="mt-2 rounded-xl border border-[#2DA5A0]/25 bg-[#2DA5A0]/[0.06] px-3 py-2.5">
          <DistributionPatternPicker
            value={overlay.chosenPattern}
            onChange={(p) => {
              overlay.setChosenPattern(p);
              setPatternOfferDismissed(true);
            }}
          />
          <button
            type="button"
            onClick={() => setPatternOfferDismissed(true)}
            className="mt-2 text-[11px] font-medium text-white/50 hover:text-white/70 min-h-[28px]"
          >
            Not now
          </button>
        </div>
      )}

      {/* Settings entry (Section 6.3 + 5.2). */}
      {overlay.enabled && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            aria-expanded={showSettings}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/55 hover:text-white/75 min-h-[28px]"
          >
            <Settings2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            Distribution settings
          </button>
          {showSettings && (
            <RegionalOverlaySettings
              overlay={overlay}
              suppressionActive={suppression.suppressed && suppression.offerOptIn}
              suppressionLabel={suppressionLabel}
              className="mt-2"
            />
          )}
        </div>
      )}
    </div>
  );
}
