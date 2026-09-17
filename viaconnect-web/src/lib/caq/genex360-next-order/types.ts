/**
 * GeneX360 Soft next-order machine enums.
 * Lex: enums + on-file catalog/SKU names only. No new member-facing sentences.
 *
 * Hub/umbrella spoken GeneX360. Methylation/reference chip SSOT is GeneXM (no dash).
 * Live nutrition panel is nutrigen_dx. HormoneIQ DUTCH and EpigenHQ clocks are not SNPs.
 */

export const GENEX360_MAP_STATUSES = [
  "mapped",
  "empty",
  "unavailable",
  "engines_unread",
  "demo_refused",
  "wrong_panel",
  "not_snp",
] as const;

export type Genex360MapStatus = (typeof GENEX360_MAP_STATUSES)[number];

export const GENEX360_ENGINE_STATUSES = ["ok", "engines_unread", "demo_refused"] as const;

export type Genex360EngineStatus = (typeof GENEX360_ENGINE_STATUSES)[number];

/** Soft SKU-map panels only. Do not merge GeneXM with nutrigen_dx. */
export const GENEX360_SKU_PANELS = ["genex_m", "nutrigen_dx"] as const;

export type Genex360SkuPanel = (typeof GENEX360_SKU_PANELS)[number];

export const GENEX360_SPOKEN_HUB = "GeneX360" as const;
export const GENEX360_SPOKEN_GENEXM = "GeneXM" as const;
