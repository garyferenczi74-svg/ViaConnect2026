/**
 * WHY_VIACURA.md on-file pillars — ids + first-column labels only.
 * Do not speak not-on-file rows (heavy metals / pesticides / fillers / COAs).
 * Do not copy dossier BA-fold / milligram prose into payloads.
 */

import type { WhyViacuraPillarId } from "./types";

export const WHY_VIACURA_PILLAR_LABELS: Record<WhyViacuraPillarId, string> = {
  dual_delivery: "Dual delivery",
  liposomal_process_nad: "Liposomal process (NAD+)",
  manufacturing_grade_nad: "Manufacturing / grade (NAD+)",
  ingredient_purity_grades: "Ingredient purity grades",
  methylated_forms: "Methylated forms",
  snp_targeted_catalog: "SNP-targeted catalog",
  micellar_vs_standard_extracts_rise: "Micellar vs standard extracts (RISE+)",
  curcumin_delivery_flex: "Curcumin delivery (FLEX+)",
  thorne_displacement_pairs: "Thorne displacement pairs",
};
