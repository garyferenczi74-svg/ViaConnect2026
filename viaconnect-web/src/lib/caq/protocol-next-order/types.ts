/**
 * Daily protocol → ViaCura next-order entry shape.
 * Status / source / why-pillar are machine enums + on-file names only.
 * Lex: no new member-facing next-order sentences in this module.
 */

export const PROTOCOL_ENTRY_STATUSES = [
  "current",
  "suggested_viacura",
  "on_next_order",
] as const;

export type ProtocolEntryStatus = (typeof PROTOCOL_ENTRY_STATUSES)[number];

export const PROTOCOL_ENTRY_SOURCES = ["caq", "photo", "manual", "hannah_suggest"] as const;

export type ProtocolEntrySource = (typeof PROTOCOL_ENTRY_SOURCES)[number];

/** WHY_VIACURA.md on-file pillar ids (first-column labels only — no dossier prose). */
export const WHY_VIACURA_PILLAR_IDS = [
  "dual_delivery",
  "liposomal_process_nad",
  "manufacturing_grade_nad",
  "ingredient_purity_grades",
  "methylated_forms",
  "snp_targeted_catalog",
  "micellar_vs_standard_extracts_rise",
  "curcumin_delivery_flex",
  "thorne_displacement_pairs",
] as const;

export type WhyViacuraPillarId = (typeof WHY_VIACURA_PILLAR_IDS)[number];

export const CAQ_MAP_CATEGORIES = [
  "thorne_mg_bisglycinate",
  "thorne_nac",
  "thorne_coq10",
  "thorne_glutathione_sr",
  "thorne_ashwagandha",
  "thorne_5mthf",
  "practitioner_nad_nmn",
  "standard_folate_b_complex",
  "sports_creatine_amino",
  "sleep_stress",
  "male_vitality_tongkat",
  "joint",
  "prenatal",
  "gut_enzymes",
  "greens_all_in_one",
  "store_brand_mass",
] as const;

export type CaqMapCategory = (typeof CAQ_MAP_CATEGORIES)[number];

export type CaqMapMatchKind = "exact" | "category" | "unmapped";

export interface ProtocolEntryCite {
  cite_id: string;
  label: string;
}

export interface ProtocolNextOrderEntry {
  brand: string;
  product_name: string;
  status: ProtocolEntryStatus;
  source: ProtocolEntrySource;
  via_cura_sku?: string;
  cite?: ProtocolEntryCite;
  category?: CaqMapCategory;
  why_pillar_ids?: readonly WhyViacuraPillarId[];
}

export interface CurrentProtocolProduct {
  brand?: string;
  product_name: string;
  source?: ProtocolEntrySource;
  category?: string;
}

export interface CaqMapMatch {
  kind: CaqMapMatchKind;
  category?: CaqMapCategory;
  via_cura_skus: readonly string[];
  why_pillar_ids: readonly WhyViacuraPillarId[];
  map_row_id?: string;
}
