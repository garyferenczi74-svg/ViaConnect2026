// Prompt 204 (2026-06-21): persist a member's EpigenHQ results. Mirrors the lab
// persistLabBiomarkers store: insert one epigenetic_uploads provenance row, then
// upsert the markers on (user_id, marker_key, measured_on) so a re-upload on the
// same date updates in place and different dates accumulate for a trend. The
// caller (the confirm route) has already re-derived the canonical marker_key and
// the direction server-side, so this layer only writes. Owner-scoped by RLS.
//
// Standing rules honored: no em or en dashes, TypeScript strict (no any in the
// public surface; the Supabase client is cast like the sibling genetics/lab
// stores because these tables are not in the generated typegen yet).

import { safeLog } from "@/lib/utils/safe-log";

export type EpigenDirection = "higher" | "lower" | "typical";
export type EpigenSourceType = "pdf_text" | "pdf_scanned" | "photo" | "csv" | "manual";
export type EpigenConfidence = "high" | "medium" | "low";

export interface EpigeneticMarkerInput {
  markerKey: string;
  valueNum: number | null;
  valueText: string | null;
  unit: string | null;
  direction: EpigenDirection | null;
}

export interface PersistEpigenOptions {
  sourceFilename: string | null;
  sourceType: EpigenSourceType;
  labName?: string | null;
  measuredOn: string; // ISO date (YYYY-MM-DD)
  confidence?: EpigenConfidence;
}

export interface EpigenPersistResult {
  saved: number;
  uploadId: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export async function persistEpigeneticMarkers(
  supabase: SupabaseLike,
  userId: string,
  markers: EpigeneticMarkerInput[],
  opts: PersistEpigenOptions,
): Promise<EpigenPersistResult> {
  if (markers.length === 0) return { saved: 0, uploadId: null };

  const { data: upload, error: uploadErr } = await supabase
    .from("epigenetic_uploads")
    .insert({
      user_id: userId,
      source_filename: opts.sourceFilename,
      source_type: opts.sourceType,
      lab_name: opts.labName ?? null,
      measured_on: opts.measuredOn,
      status: "completed",
    })
    .select("id")
    .single();

  if (uploadErr || !upload) {
    safeLog.warn("genetics.epigen.persist", "upload row insert failed", {
      user_id: userId,
      error: uploadErr?.message ?? "no row",
    });
    return { saved: 0, uploadId: null };
  }

  const uploadId = upload.id as string;

  const rows = markers.map((m) => ({
    user_id: userId,
    upload_id: uploadId,
    marker_key: m.markerKey,
    value_num: m.valueNum,
    value_text: m.valueText,
    unit: m.unit,
    direction: m.direction,
    confidence: opts.confidence ?? "medium",
    source_type: opts.sourceType,
    measured_on: opts.measuredOn,
  }));

  const { error: markerErr } = await supabase
    .from("user_epigenetic_markers")
    .upsert(rows, { onConflict: "user_id,marker_key,measured_on" });

  if (markerErr) {
    safeLog.warn("genetics.epigen.persist", "marker upsert failed", {
      user_id: userId,
      upload_id: uploadId,
      error: markerErr.message,
    });
    return { saved: 0, uploadId };
  }

  return { saved: rows.length, uploadId };
}
