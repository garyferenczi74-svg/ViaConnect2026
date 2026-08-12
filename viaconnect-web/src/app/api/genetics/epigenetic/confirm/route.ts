// Prompt 204 (2026-06-21): the confirm step for a verified EpigenHQ report.
// Persists the readouts the member reviewed. Every row is re-derived server-side
// from the marker map (key validated, unit and direction normalized), so a saved
// row never depends on a client-sent unit or clinical word. Owner-scoped via RLS.
//
// Standing rules honored: no em or en dashes, TypeScript strict (no any).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeLog } from "@/lib/utils/safe-log";
import { buildEpigeneticMarkerInput } from "@/lib/genetics/extractEpigeneticReport";
import {
  persistEpigeneticMarkers,
  type EpigeneticMarkerInput,
  type EpigenSourceType,
  type EpigenConfidence,
} from "@/lib/genetics/epigenResultStore";

export const dynamic = 'force-dynamic';

const MAX_ROWS = 200;

interface ConfirmBody {
  rows?: Array<{
    markerKey?: unknown;
    valueNum?: unknown;
    valueText?: unknown;
    direction?: unknown;
  }>;
  sourceFilename?: unknown;
  sourceType?: unknown;
  measuredOn?: unknown;
}

const VALID_SOURCE_TYPES = new Set<EpigenSourceType>([
  "pdf_text",
  "pdf_scanned",
  "photo",
  "csv",
  "manual",
]);

// Per-source confidence: the member typed it or it came structured (high), a text
// layer (medium), or a scan or photo read by vision (low).
function confidenceForSource(sourceType: EpigenSourceType): EpigenConfidence {
  if (sourceType === "manual" || sourceType === "csv") return "high";
  if (sourceType === "pdf_scanned" || sourceType === "photo") return "low";
  return "medium";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to save." }, { status: 401 });
  }

  let body: ConfirmBody;
  try {
    body = (await request.json()) as ConfirmBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const sourceType: EpigenSourceType =
    typeof body.sourceType === "string" && VALID_SOURCE_TYPES.has(body.sourceType as EpigenSourceType)
      ? (body.sourceType as EpigenSourceType)
      : "pdf_scanned";

  const raw = Array.isArray(body.rows) ? body.rows.slice(0, MAX_ROWS) : [];
  const markers: EpigeneticMarkerInput[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    const input = buildEpigeneticMarkerInput(r?.markerKey, r?.valueNum, r?.valueText, r?.direction);
    // Re-derivation drops an unknown key or an empty reading; dedupe by key so a
    // duplicate row cannot collide on the (user, key, date) upsert constraint.
    if (!input || seen.has(input.markerKey)) continue;
    seen.add(input.markerKey);
    markers.push(input);
  }

  if (markers.length === 0) {
    return NextResponse.json({ error: "No readings to save." }, { status: 400 });
  }

  const sourceFilename =
    typeof body.sourceFilename === "string" ? body.sourceFilename.slice(0, 300) : null;
  const measuredOn =
    typeof body.measuredOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.measuredOn)
      ? body.measuredOn
      : todayIso();

  try {
    const result = await persistEpigeneticMarkers(supabase, user.id, markers, {
      sourceFilename,
      sourceType,
      measuredOn,
      confidence: confidenceForSource(sourceType),
    });
    return NextResponse.json({ saved: result.saved, uploadId: result.uploadId });
  } catch (err) {
    safeLog.error("api.genetics.epigenetic.confirm", "save failed", {
      user_id: user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Could not save your results. Try again." }, { status: 500 });
  }
}
