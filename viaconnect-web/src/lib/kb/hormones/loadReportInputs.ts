/**
 * Prompt 221B: load labs + profile sex for hormone report (server).
 * Profile sex never defaults to male when unset.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { FLAGSHIP_HORMONE_DRAFTS } from "./flagshipDraft";
import type { KbHormoneRow, LabMarkerSnapshot } from "./types";

export async function loadProfileSexRaw(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  try {
    const { data: state } = await supabase
      .from("body_tracker_user_state")
      .select("avatar_gender_override")
      .eq("user_id", userId)
      .maybeSingle();
    const override = (state as { avatar_gender_override?: string | null } | null)
      ?.avatar_gender_override;
    if (override === "male" || override === "female") return override;
  } catch {
    /* table may be absent in some envs */
  }

  try {
    const { data: caq } = await supabase
      .from("clinical_assessments")
      .select("biological_sex")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sex = (caq as { biological_sex?: string | null } | null)?.biological_sex;
    if (sex && typeof sex === "string") return sex;
  } catch {
    /* fail open to unset */
  }

  return null;
}

export async function loadNormalizedLabs(
  supabase: SupabaseClient,
  userId: string
): Promise<LabMarkerSnapshot[]> {
  try {
    const { data, error } = await supabase
      .from("lab_results_normalized")
      .select("biomarker, value, unit_normalized, reference_low, reference_high, measured_at")
      .eq("user_id", userId)
      .order("measured_at", { ascending: false });
    if (error || !data) return [];
    return (data as Array<Record<string, unknown>>).map((row) => ({
      biomarker: String(row.biomarker ?? ""),
      value: row.value == null ? null : Number(row.value),
      unit: row.unit_normalized == null ? null : String(row.unit_normalized),
      reference_low: row.reference_low == null ? null : Number(row.reference_low),
      reference_high:
        row.reference_high == null ? null : Number(row.reference_high),
      measured_at: row.measured_at == null ? null : String(row.measured_at),
    }));
  } catch {
    return [];
  }
}

/**
 * Load hormone education rows for report generation.
 * Prefer live kb_hormones when available; fall back to flagship drafts (unsafe).
 */
export async function loadHormonesForReport(
  supabase: SupabaseClient
): Promise<KbHormoneRow[]> {
  try {
    const { data, error } = await supabase
      .from("kb_hormones")
      .select(
        "item_id, hormone_slug, display_name, hormone_class, sex_relevance, physiology_summary, male_content_block, female_content_block, life_stage_notes, typical_ranges, influencing_factors, related_rsids, related_study_item_ids, related_ingredient_notes, marker_mapping, consumer_safe"
      );
    // Intentionally omit practitioner_depth_block from select
    if (!error && data && data.length > 0) {
      return data as unknown as KbHormoneRow[];
    }
  } catch {
    /* fall through to drafts */
  }
  return FLAGSHIP_HORMONE_DRAFTS.map((h) => ({ ...h }));
}
