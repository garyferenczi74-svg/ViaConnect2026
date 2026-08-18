/**
 * Prompt 221B: Hormone education + report types.
 * No em/en dashes. Education only; no therapy dosing on consumer surfaces.
 */

export type HormoneClass =
  | "androgen"
  | "estrogen"
  | "progestogen"
  | "regulator"
  | "thyroid"
  | "adrenal"
  | "metabolic"
  | "other";

export type SexRelevance = "male" | "female" | "both";

export type HormoneReportTrack = "male" | "female";

/** Biological sex for report track selection. Never default-guess. */
export type BiologicalSexForReport = "male" | "female";

export interface TypicalRangeRow {
  population: string;
  sex: SexRelevance | "unspecified";
  life_stage_or_cycle_phase: string;
  range_low: number | null;
  range_high: number | null;
  unit: string;
  source_url: string;
  source_note: string;
}

export interface MarkerAlias {
  alias: string;
  loinc?: string | null;
}

export interface KbHormoneRow {
  item_id: string;
  hormone_slug: string;
  display_name: string;
  hormone_class: HormoneClass;
  sex_relevance: SexRelevance;
  physiology_summary: string;
  male_content_block: string;
  female_content_block: string;
  life_stage_notes: Record<string, unknown>;
  typical_ranges: TypicalRangeRow[];
  influencing_factors: Array<Record<string, unknown>>;
  related_rsids: string[];
  related_study_item_ids: string[];
  related_ingredient_notes: Array<Record<string, unknown>>;
  marker_mapping: MarkerAlias[];
  consumer_safe: boolean;
  /** Never include in consumer API responses. */
  practitioner_depth_block?: string;
}

export interface LabMarkerSnapshot {
  biomarker: string;
  value: number | null;
  unit: string | null;
  reference_low: number | null;
  reference_high: number | null;
  measured_at: string | null;
}

export interface MappedLabMarker {
  hormone_slug: string;
  display_name: string;
  lab: LabMarkerSnapshot;
  /** Authoritative when present on the upload. */
  lab_reference: { low: number | null; high: number | null } | null;
  /** Educational context only; never presented as the user's lab range. */
  typical_ranges_educational: TypicalRangeRow[];
  education_available: boolean;
  consumer_safe_education: boolean;
}

export interface HormoneReportPayload {
  overview: {
    what_this_is: string;
    what_this_is_not: string;
    generated_at: string;
    track: HormoneReportTrack;
    data_sources: string[];
    disclaimer: string;
  };
  your_labs_mapped: MappedLabMarker[];
  labs_not_present: Array<{
    hormone_slug: string;
    display_name: string;
    note: string;
    upload_labs_pathway: string;
  }>;
  genetics_context: Array<{
    rsid: string;
    summary: string;
    evidence_grade: string | null;
  }>;
  education_track: Array<{
    hormone_slug: string;
    display_name: string;
    sex_block: string;
    life_stage_notes: Record<string, unknown>;
  }>;
  influences_you_control: Array<{
    factor: string;
    note: string;
    personalized: boolean;
  }>;
  talk_to_your_practitioner: {
    pathway: string;
    therapy_note: string;
  };
  provenance_footer: Array<{
    claim_ref: string;
    grade: string | null;
    sources: string[];
  }>;
  cycle_phase_note: string | null;
}

export type HormoneReportResult =
  | { ok: true; needsSex: false; track: HormoneReportTrack; report: HormoneReportPayload }
  | { ok: true; needsSex: true; track: null; report: null }
  | { ok: false; error: string };

export const HORMONE_DISCLAIMER =
  "This report is educational only. It is not a diagnosis, treatment plan, or prescription. Talk with a licensed practitioner about your labs and any therapy questions.";

export const THERAPY_REDIRECT =
  "Questions about hormone therapy, dosing, or protocols belong with your practitioner. ViaConnect does not provide therapy dosing or drug-specific guidance on consumer surfaces.";

export const UPLOAD_LABS_PATHWAY = "/lab-results";

export const CYCLE_PHASE_UNKNOWN_NOTE =
  "Cycle phase timing of this lab draw is unknown. Estradiol and progesterone context is educational and not phase-timed to your sample.";
