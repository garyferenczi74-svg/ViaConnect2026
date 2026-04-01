// FarmCeutica Peptide Registry — Complete 29-Peptide Portfolio
// 8 categories, 113 SKUs, 4 delivery forms per product

import type { PeptideProduct } from "./categories-1-3";
import { ALL_CATEGORIES_1_3, CATEGORY_CONFIG_1_3 } from "./categories-1-3";
import { ALL_CATEGORIES_4_6, CATEGORY_CONFIG_4_6 } from "./categories-4-6";
import { ALL_CATEGORIES_7_8, CATEGORY_CONFIG_7_8 } from "./categories-7-8";
import { ALL_INTERACTIONS, MAJOR_INTERACTIONS, MODERATE_INTERACTIONS, SYNERGISTIC_INTERACTIONS } from "./interactions";
import { STACKING_PROTOCOLS, MARKET_LAUNCH_ROADMAP } from "./stacking-protocols";

// ═══ COMPLETE PEPTIDE REGISTRY ═══
export const PEPTIDE_REGISTRY: PeptideProduct[] = [
  ...ALL_CATEGORIES_1_3,
  ...ALL_CATEGORIES_4_6,
  ...ALL_CATEGORIES_7_8,
];

// ═══ CATEGORY CONFIG (all 8) ═══
export const ALL_CATEGORIES = [
  ...CATEGORY_CONFIG_1_3,
  ...CATEGORY_CONFIG_4_6,
  ...CATEGORY_CONFIG_7_8,
];

// ═══ LOOKUP HELPERS ═══
export const PEPTIDE_BY_ID = Object.fromEntries(PEPTIDE_REGISTRY.map((p) => [p.id, p]));

export function getPeptideById(id: string): PeptideProduct | undefined {
  return PEPTIDE_BY_ID[id];
}

export function getPeptidesByCategory(categoryId: string): PeptideProduct[] {
  const cat = ALL_CATEGORIES.find((c) => c.id === categoryId);
  return cat?.products || [];
}

export function searchPeptides(query: string): PeptideProduct[] {
  const q = query.toLowerCase();
  return PEPTIDE_REGISTRY.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.mechanism.toLowerCase().includes(q) ||
      p.targetVariants.some((v) => v.toLowerCase().includes(q))
  );
}

export function getPeptidesForVariant(variant: string): PeptideProduct[] {
  const v = variant.toUpperCase();
  return PEPTIDE_REGISTRY.filter((p) => p.targetVariants.some((tv) => tv.toUpperCase() === v));
}

export function getPeptidesForPanel(panel: string): PeptideProduct[] {
  return PEPTIDE_REGISTRY.filter((p) => p.genexPanel === panel);
}

// ═══ STATS ═══
export const REGISTRY_STATS = {
  totalPeptides: PEPTIDE_REGISTRY.length,
  totalSKUs: PEPTIDE_REGISTRY.reduce((sum, p) => sum + p.dosingForms.length, 0),
  totalCategories: ALL_CATEGORIES.length,
  strongEvidence: PEPTIDE_REGISTRY.filter((p) => p.evidenceLevel === "strong").length,
  moderateEvidence: PEPTIDE_REGISTRY.filter((p) => p.evidenceLevel === "moderate").length,
  emergingEvidence: PEPTIDE_REGISTRY.filter((p) => p.evidenceLevel === "emerging").length,
  totalInteractions: ALL_INTERACTIONS.length,
  majorInteractions: MAJOR_INTERACTIONS.length,
  moderateInteractions: MODERATE_INTERACTIONS.length,
  synergisticInteractions: SYNERGISTIC_INTERACTIONS.length,
  stackingProtocols: STACKING_PROTOCOLS.length,
};

// Re-exports
export { ALL_INTERACTIONS, MAJOR_INTERACTIONS, MODERATE_INTERACTIONS, SYNERGISTIC_INTERACTIONS };
export { STACKING_PROTOCOLS, MARKET_LAUNCH_ROADMAP };
export type { PeptideProduct } from "./categories-1-3";
