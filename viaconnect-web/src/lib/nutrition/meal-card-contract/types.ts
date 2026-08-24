// Brief 3: one MealCard contract for photo, upload, voice/dictation, and text.
// Educational protocol match only. Not diagnostic. No invented gene scores.

import type { NutritionAnalysis } from '@/lib/nutrition/schema';

export const MEAL_CARD_ENTRY_SOURCES = [
  'photo',
  'upload',
  'voice',
  'dictation',
  'text',
] as const;

export type MealCardEntrySource = (typeof MEAL_CARD_ENTRY_SOURCES)[number];

/** Live NutrigenDX genes observed in production. Do not invent MTHFR here. */
export const LIVE_NUTRIGEN_DX_GENES = ['ACTN3', 'FTO', 'VDR'] as const;
export type LiveNutrigenDxGene = (typeof LIVE_NUTRIGEN_DX_GENES)[number];

export const MTHFR_GENE = 'MTHFR';
export const MTHFR_RSIDS = ['rs1801133', 'rs1801131'] as const;

export const EDUCATIONAL_PROTOCOL_NOTE =
  'Educational context from your protocol. Not a diagnosis and not a gene score.';

export type ProtocolPanel = 'genex_m' | 'nutrigen_dx';

export interface MealCardContract {
  source: MealCardEntrySource;
  servingDescription: string;
  foodNames: readonly string[];
  analysis: NutritionAnalysis;
  micronutrients: Readonly<Record<string, number>>;
}

export interface ProtocolVariantInput {
  rsid: string;
  gene: string | null;
  genotype: string | null;
  panelKey: string;
}

export interface ProtocolRecommendedInput {
  form: string;
  rationale: string;
  ruleRsid: string;
}

export interface ProtocolSynthesisInput {
  prefer: readonly string[];
  avoid: readonly string[];
  recommended: readonly ProtocolRecommendedInput[];
}

export interface ProtocolMatchChip {
  id: string;
  kind: 'prefer' | 'watch' | 'gene';
  label: string;
  body: string;
  gene: string | null;
  panel: ProtocolPanel | null;
}

export interface ProtocolMicroRing {
  id: string;
  nutrientKey: string;
  label: string;
  unit: string;
  amount: number | null;
  fillPct: number;
  gene: string | null;
  panel: ProtocolPanel | null;
  unmeasured: boolean;
}

export interface ProtocolMatchResult {
  chips: readonly ProtocolMatchChip[];
  rings: readonly ProtocolMicroRing[];
  educationalNote: string;
}
