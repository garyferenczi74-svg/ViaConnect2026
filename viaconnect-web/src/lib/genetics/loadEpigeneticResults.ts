// Prompt 204 (2026-06-21): read a member's EpigenHQ results for display. Mirrors
// loadLabResults: read the owner's rows, group by marker_key, take the latest by
// measured_on as the current reading, and build a trend from the numeric values
// across dates (epigenetic age and pace of aging are most meaningful as a trend).
// Owner-scoped by RLS; the caller passes an authenticated server client.
//
// Standing rules honored: no em or en dashes, TypeScript strict (no any in the
// public surface; the Supabase client is cast like the sibling stores).

import type { EpigenDirection } from "./epigenResultStore";

export interface EpigeneticTrendPoint {
  measuredOn: string;
  valueNum: number | null;
}

export interface EpigeneticResult {
  markerKey: string;
  valueNum: number | null;
  valueText: string | null;
  unit: string | null;
  direction: EpigenDirection | null;
  confidence: string | null;
  measuredOn: string | null;
  /** Numeric readings across dates (oldest first), or null when fewer than two. */
  trend: EpigeneticTrendPoint[] | null;
}

interface DbRow {
  marker_key: string;
  value_num: number | null;
  value_text: string | null;
  unit: string | null;
  direction: EpigenDirection | null;
  confidence: string | null;
  measured_on: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export async function loadEpigeneticResults(
  supabase: SupabaseLike,
  userId: string,
): Promise<EpigeneticResult[]> {
  const { data, error } = await supabase
    .from("user_epigenetic_markers")
    .select("marker_key, value_num, value_text, unit, direction, confidence, measured_on")
    .eq("user_id", userId)
    .order("measured_on", { ascending: false });

  if (error || !Array.isArray(data)) return [];

  const rows = data as DbRow[];
  const byMarker = new Map<string, DbRow[]>();
  for (const row of rows) {
    if (!row.marker_key) continue;
    const list = byMarker.get(row.marker_key) ?? [];
    list.push(row);
    byMarker.set(row.marker_key, list);
  }

  const results: EpigeneticResult[] = [];
  for (const [markerKey, markerRows] of byMarker) {
    // Rows arrived newest first, so the head is the current reading.
    const current = markerRows[0];
    // Trend: numeric readings oldest first, only when there is more than one.
    const numericByDate = markerRows
      .filter((r) => r.value_num !== null && r.measured_on)
      .map((r) => ({ measuredOn: r.measured_on as string, valueNum: r.value_num }))
      .sort((a, b) => a.measuredOn.localeCompare(b.measuredOn));
    results.push({
      markerKey,
      valueNum: current.value_num,
      valueText: current.value_text,
      unit: current.unit,
      direction: current.direction,
      confidence: current.confidence,
      measuredOn: current.measured_on,
      trend: numericByDate.length > 1 ? numericByDate : null,
    });
  }

  return results;
}
