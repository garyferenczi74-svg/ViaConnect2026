// FarmCeutica Peptide Registry — 41-Peptide Portfolio (28 + 13 new in #54b)
// 8 therapeutic categories × 4 distribution tiers
// Total SKUs: 27 standard oral × 4 forms + 1 injectable-only base + 13 new
// (mix of standard 4-form and injectable-only)

import type { PeptideProduct } from "./categories-1-3";
import { ALL_CATEGORIES_1_3, CATEGORY_CONFIG_1_3 } from "./categories-1-3";
import { ALL_CATEGORIES_4_6, CATEGORY_CONFIG_4_6 } from "./categories-4-6";
import { ALL_CATEGORIES_7_8, CATEGORY_CONFIG_7_8 } from "./categories-7-8";
import { ALL_INTERACTIONS, MAJOR_INTERACTIONS, MODERATE_INTERACTIONS, SYNERGISTIC_INTERACTIONS } from "./interactions";
import { STACKING_PROTOCOLS, MARKET_LAUNCH_ROADMAP } from "./stacking-protocols";
import { NEW_PEPTIDES_54B } from "./peptides-54b";

// ═══ COMPLETE PEPTIDE REGISTRY ═══
export const PEPTIDE_REGISTRY: PeptideProduct[] = [
  ...ALL_CATEGORIES_1_3,
  ...ALL_CATEGORIES_4_6,
  ...ALL_CATEGORIES_7_8,
  ...NEW_PEPTIDES_54B,
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

// ═══ DELIVERY FORM HELPERS ═══
export { DELIVERY_FORMS, DELIVERY_FORM_BY_KEY, CATEGORY_PREFERRED_FORM, SYMPTOM_FORM_RECOMMENDATIONS, SKU_COUNTS } from "./delivery-forms";

export function getRecommendedForm(peptideId: string, symptom?: string): string {
  const peptide = PEPTIDE_BY_ID[peptideId];
  if (!peptide) return "liposomal";
  // Retatrutide is injectable only
  if (peptideId === "retatrutide") return "injectable";
  // Symptom-specific recommendation
  if (symptom) {
    const { SYMPTOM_FORM_RECOMMENDATIONS } = require("./delivery-forms");
    const rec = SYMPTOM_FORM_RECOMMENDATIONS[symptom];
    if (rec) return rec.form;
  }
  // Category default
  const { CATEGORY_PREFERRED_FORM } = require("./delivery-forms");
  return CATEGORY_PREFERRED_FORM[peptide.category] || "liposomal";
}

export function getAvailableForms(peptideId: string): string[] {
  if (peptideId === "retatrutide") return ["injectable"];
  return ["liposomal", "micellar", "injectable", "nasal_spray"];
}

// Re-exports
export { ALL_INTERACTIONS, MAJOR_INTERACTIONS, MODERATE_INTERACTIONS, SYNERGISTIC_INTERACTIONS };
export { STACKING_PROTOCOLS, MARKET_LAUNCH_ROADMAP };
export type { PeptideProduct } from "./categories-1-3";
