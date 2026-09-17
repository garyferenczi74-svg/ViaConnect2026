/**
 * Labs Soft next-order machine enums.
 * Lex: enums + on-file catalog/SKU / biomarker keys only. No new member-facing sentences.
 *
 * Engines/labs SSOT is loadLabResults → lab_biomarkers (GET /api/labs/results).
 * Rhythm Health uploads land in that table. No invent tables/migrations.
 */

export const LABS_MAP_STATUSES = [
  "mapped",
  "empty",
  "unavailable",
  "engines_unread",
  "demo_refused",
] as const;

export type LabsMapStatus = (typeof LABS_MAP_STATUSES)[number];

export const LABS_ENGINE_STATUSES = ["ok", "engines_unread", "demo_refused"] as const;

export type LabsEngineStatus = (typeof LABS_ENGINE_STATUSES)[number];

export const LABS_ENGINE_LOAD_STATUSES = ["ok", "unauthorized", "error"] as const;

export type LabsEngineLoadStatus = (typeof LABS_ENGINE_LOAD_STATUSES)[number];

/** Confirmed-results SSOT. Same loader as GET /api/labs/results. */
export const LABS_SSOT_READ = "loadLabResults / lab_biomarkers" as const;
export const LABS_SSOT_ROUTE = "GET /api/labs/results" as const;
