/**
 * Provisional DrinkLinc / LINC ingest shapes.
 *
 * No public partner schema exists as of the 2026-09-01 audit. These types
 * describe what ViaConnect would ingest if a partner API opens. They are
 * not a live contract. Do not treat field names as DrinkLinc official.
 *
 * Mapping target: nutrients and regimen wearable dimensions
 * (see wearable-tiles.ts). LINC is a dispenser, not a biometric wearable.
 *
 * All comments use hyphens only. No em-dashes or en-dashes.
 */

export type DrinkLincIngredientClass =
  | 'vitamin'
  | 'mineral'
  | 'adaptogen'
  | 'electrolyte'
  | 'other';

export type DrinkLincDoseStatus = 'dispensed' | 'skipped' | 'partial' | 'unknown';

/** One ingredient line inside a smart cartridge dispense. Provisional. */
export interface DrinkLincCartridgeIngredient {
  name: string;
  amount: number;
  unit: string;
  class?: DrinkLincIngredientClass;
}

/** A single dispense or skip event for a local calendar day. Provisional. */
export interface DrinkLincDailyDoseEvent {
  id: string;
  occurredAt: string;
  localDate: string;
  status: DrinkLincDoseStatus;
  cartridgeId?: string;
  ingredients: DrinkLincCartridgeIngredient[];
}

/** Daily adherence rollup. Provisional. */
export interface DrinkLincAdherenceSummary {
  localDate: string;
  plannedDoses: number;
  completedDoses: number;
  adherenceRatio: number | null;
}

/**
 * Regimen metadata that would map toward ViaConnect nutrients / regimen
 * dimensions once a partner API exists. Provisional.
 */
export interface DrinkLincRegimenMetadata {
  regimenId: string;
  label: string;
  targetDimensions: Array<'nutrients' | 'regimen'>;
  notes?: string;
}

/** Envelope ViaConnect would persist after a future partner pull. Provisional. */
export interface DrinkLincIngestPayload {
  userId: string;
  sourceSlug: 'drinklinc';
  events: DrinkLincDailyDoseEvent[];
  adherence: DrinkLincAdherenceSummary[];
  regimen?: DrinkLincRegimenMetadata;
}
