// Journey-aware overlay computation for the gender-aware body silhouettes.
// Pure helper, no React. Consumed by BodySilhouetteMale + BodySilhouetteFemale.
//
// Spec: Prompt #85c §5.3 Avatar Styling per Journey
//   weight_loss + mode='fat'    : orange overlay fades 0.30 → 0.05 as fat % drops
//   muscle_building + mode='muscle' : teal overlay brightens 0.10 → 0.40 as muscle gains
// Per-segment "growth zones" deferred to V2 (requires per-segment history).

import type {
  JourneyType,
  JourneyStartingSnapshot,
} from '@/hooks/body-tracker/useUserJourney';

export type SilhouetteMode = 'fat' | 'muscle';

export interface JourneyOverlayResult {
  color: string;
  opacity: number;
}

const WEIGHT_LOSS_COLOR = '#B75E18';
const MUSCLE_BUILDING_COLOR = '#2DA5A0';

const FAT_OVERLAY_BASELINE = 0.3;
const FAT_OVERLAY_FLOOR = 0.05;
const MUSCLE_OVERLAY_BASELINE = 0.1;
const MUSCLE_OVERLAY_CEILING = 0.4;

const WEIGHT_LOSS_FULL_PROGRESS = 0.05;
const MUSCLE_BUILDING_FULL_PROGRESS = 0.1;

export function computeJourneyOverlay(
  journey: JourneyType | null | undefined,
  mode: SilhouetteMode,
  currentTotal: number,
  startingSnapshot: JourneyStartingSnapshot | null | undefined,
): JourneyOverlayResult | null {
  if (!journey) return null;

  if (journey === 'weight_loss' && mode === 'fat') {
    const startingFat = startingSnapshot?.body_fat_pct;
    if (!startingFat || startingFat <= 0) {
      return { color: WEIGHT_LOSS_COLOR, opacity: FAT_OVERLAY_BASELINE };
    }
    const reduction = Math.max(0, (startingFat - currentTotal) / startingFat);
    const progress = Math.min(1, reduction / WEIGHT_LOSS_FULL_PROGRESS);
    const opacity =
      FAT_OVERLAY_BASELINE - (FAT_OVERLAY_BASELINE - FAT_OVERLAY_FLOOR) * progress;
    return { color: WEIGHT_LOSS_COLOR, opacity };
  }

  if (journey === 'muscle_building' && mode === 'muscle') {
    const startingMuscle = startingSnapshot?.muscle_mass_lbs;
    if (!startingMuscle || startingMuscle <= 0) {
      return { color: MUSCLE_BUILDING_COLOR, opacity: MUSCLE_OVERLAY_BASELINE };
    }
    const gain = Math.max(0, (currentTotal - startingMuscle) / startingMuscle);
    const progress = Math.min(1, gain / MUSCLE_BUILDING_FULL_PROGRESS);
    const opacity =
      MUSCLE_OVERLAY_BASELINE +
      (MUSCLE_OVERLAY_CEILING - MUSCLE_OVERLAY_BASELINE) * progress;
    return { color: MUSCLE_BUILDING_COLOR, opacity };
  }

  return null;
}

export function shouldShowGhostOutline(
  journey: JourneyType | null | undefined,
  mode: SilhouetteMode,
  startingSnapshot: JourneyStartingSnapshot | null | undefined,
): boolean {
  if (!journey || !startingSnapshot) return false;
  if (journey === 'weight_loss' && mode === 'fat') {
    return Boolean(startingSnapshot.body_fat_pct);
  }
  if (journey === 'muscle_building' && mode === 'muscle') {
    return Boolean(startingSnapshot.muscle_mass_lbs);
  }
  return false;
}
