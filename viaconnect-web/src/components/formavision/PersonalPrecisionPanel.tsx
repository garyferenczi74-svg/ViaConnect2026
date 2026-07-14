'use client';

// Task 211b-W3c - Personal precision DISPLAY (consumer). Renders the honest,
// per-region state of the W3b personalFusionService.PersonalFusionResult.
// Anchor ENTRY UI (tape guided flow, DEXA import) is a separate task; this
// component is presentation-only and never writes anything.
//
// HONESTY (the point of this component):
//   - status is read DIRECTLY from PersonalFusionRegionResult.status. It is
//     never re-derived here (personalBandCm is never compared to
//     globalBandCm in this file); deriveRegionResult in personalFusionService
//     already applied the strict clamp (W3a review handoff #1).
//   - personalBandCm is NEVER read or rendered. No numeric precision figure
//     ("+/- X cm") is shown pre-cohort, per the Standing Rule. Every status
//     renders QUALITATIVE copy only.
//   - hip, under_bust and waist_navel have no scan-source columns today, so
//     they never appear in result.perRegion (buildPersonalPairs can never
//     form a pair for them). resolvePersonalPrecisionRows fills every region
//     NOT present in perRegion with the honest 'insufficient' status -- this
//     is filling a gap for a region with literally zero attempted pairs, not
//     re-deriving an existing tightened/not-tightened verdict.
//   - Scale (weight) anchors never produce a region band; if scale anchors
//     are adopted, that is surfaced ONLY via scaleAnchorCount (adoption),
//     never as a fabricated band, and without ever rendering the count as a
//     digit (see personalPrecisionScaleCopy).
//   - Default OFF / honest-empty: renders nothing when the user has never
//     recorded ANY anchor (no circumference pairs ever formed AND zero
//     scale anchors), so a user without anchors sees no change to the page.
//
// No em or en dashes, no emojis, zero any, TS strict.

import { Ruler } from 'lucide-react';
import type {
  BandStatus,
  PersonalFusionResult,
} from '@/lib/arnold/scanning/accuracy/fusion/personalFusionService';
import type { Region } from '@/lib/arnold/scanning/types';

// ---------------------------------------------------------------------------
// Region enumeration + labels (presentation-only; not exported from the
// fusion lib, which has no such list -- see anchorIngestion.ts's own local
// VALID_REGIONS note for the same situation).
// ---------------------------------------------------------------------------

export const ALL_PERSONAL_PRECISION_REGIONS: readonly Region[] = [
  'neck',
  'shoulder',
  'chest',
  'under_bust',
  'waist_natural',
  'waist_navel',
  'hip',
  'bicep',
  'forearm',
  'thigh',
  'calf',
];

export const PERSONAL_PRECISION_REGION_LABEL: Readonly<Record<Region, string>> = {
  neck: 'Neck',
  shoulder: 'Shoulders',
  chest: 'Chest',
  under_bust: 'Under bust',
  waist_natural: 'Waist',
  waist_navel: 'Waist, navel',
  hip: 'Hips',
  bicep: 'Biceps',
  forearm: 'Forearms',
  thigh: 'Thighs',
  calf: 'Calves',
};

export interface PersonalPrecisionRegionRow {
  region: Region;
  label: string;
  status: BandStatus;
}

/**
 * Pure: builds one row per region in the fixed taxonomy, reading status
 * directly from result.perRegion where present. A region absent from
 * perRegion (zero pairs ever formed for it, e.g. hip/under_bust/waist_navel
 * today) is filled with the honest 'insufficient' status, never hidden.
 */
export function resolvePersonalPrecisionRows(
  result: PersonalFusionResult,
): PersonalPrecisionRegionRow[] {
  const byRegion = new Map(result.perRegion.map((r) => [r.region, r.status]));
  return ALL_PERSONAL_PRECISION_REGIONS.map((region) => ({
    region,
    label: PERSONAL_PRECISION_REGION_LABEL[region],
    status: byRegion.get(region) ?? 'insufficient',
  }));
}

/**
 * Honest, default-OFF gate: the panel renders nothing when the user has no
 * anchor activity at all (no region ever paired AND no scale anchors), so
 * the page is byte-identical for a user who has never added an anchor.
 */
export function shouldShowPersonalPrecisionPanel(result: PersonalFusionResult): boolean {
  return result.perRegion.length > 0 || result.scaleAnchorCount > 0;
}

// ---------------------------------------------------------------------------
// Copy (qualitative only; no digit ever appears in any string below).
// ---------------------------------------------------------------------------

export function personalPrecisionStatusCopy(status: BandStatus): string {
  switch (status) {
    case 'tightened':
      return "Your personal precision here has improved as you've added your own measurements.";
    case 'not-tightened':
      return "You've added measurements here, but your personal precision has not improved yet.";
    case 'unreliable':
      return 'Your recorded measurements here do not agree closely enough to blend. We are not adjusting this region yet.';
    case 'insufficient':
    default:
      return 'Add a tape or DEXA measurement here to start personalizing your precision.';
  }
}

export function personalPrecisionRegionAriaLabel(label: string, status: BandStatus): string {
  return `${label}: ${personalPrecisionStatusCopy(status)}`;
}

/**
 * Scale (weight) anchors never produce a region band. When at least one has
 * been adopted, this returns qualitative adoption copy with NO count digit.
 * Returns null when there is nothing to say (no scale anchors adopted).
 */
export function personalPrecisionScaleCopy(scaleAnchorCount: number): string | null {
  if (scaleAnchorCount <= 0) return null;
  return 'Your scale readings are helping calibrate your weight tracking, separate from these regions.';
}

const FOOTER_COPY =
  'Qualitative only. A published personal accuracy figure is not available until our held out validation cohort passes.';

function statusToneClass(status: BandStatus): string {
  if (status === 'tightened') return 'text-[#2DA5A0]';
  if (status === 'unreliable') return 'text-[#B75E18]';
  return 'text-white/60';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface PersonalPrecisionPanelProps {
  /** Null (no data yet, or the read failed open) renders nothing. */
  result: PersonalFusionResult | null;
  className?: string;
}

export function PersonalPrecisionPanel({ result, className }: PersonalPrecisionPanelProps) {
  if (!result || !shouldShowPersonalPrecisionPanel(result)) return null;

  const rows = resolvePersonalPrecisionRows(result);
  const scaleCopy = personalPrecisionScaleCopy(result.scaleAnchorCount);

  return (
    <div
      data-testid="personal-precision-panel"
      className={`rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 p-4 sm:p-5 backdrop-blur-sm ${className ?? ''}`}
    >
      <div className="flex items-center gap-2">
        <Ruler className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} aria-hidden="true" />
        <p className="text-xs uppercase tracking-wider text-white/40">Your Personal Precision</p>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {rows.map((row) => (
          <li
            key={row.region}
            data-testid={`personal-precision-row-${row.region}`}
            data-status={row.status}
            className="flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-sm text-white/80">{row.label}</span>
            <span
              aria-label={personalPrecisionRegionAriaLabel(row.label, row.status)}
              className={`text-xs sm:text-right sm:max-w-[60%] ${statusToneClass(row.status)}`}
            >
              {personalPrecisionStatusCopy(row.status)}
            </span>
          </li>
        ))}
      </ul>

      {scaleCopy && (
        <p data-testid="personal-precision-scale-note" className="mt-3 text-xs text-white/60">
          {scaleCopy}
        </p>
      )}

      <p className="mt-4 text-[10px] leading-relaxed text-white/35">{FOOTER_COPY}</p>
    </div>
  );
}
