// Prompt 204 (2026-06-21): extract a member's EpigenHQ epigenetic report for the
// verify-before-save flow. An epigenetic methylation report lists MEASURED markers
// (epigenetic age, pace of aging, an inflammation methylation index, and the like)
// with a value and how the lab grades it against an expected range. These reports
// are usually a designed PDF or a photographed page rather than a structured table,
// so extraction reads the page with Gemini vision: the lab states the value and the
// direction, the model only transcribes them. Mapping a printed label to a
// canonical marker key is deterministic via epigenMarkerMap, and the member
// verifies every reading before save. The confirm step re-derives the key, unit,
// and direction server-side from the map, so a saved row never trusts a
// client-sent unit or clinical word.
//
// Standing rules honored: no em or en dashes, TypeScript strict (no any).

import { safeLog } from "@/lib/utils/safe-log";
import { extractWithGeminiVision } from "@/lib/nutrition/gemini-client";
import { epigenMarkerByKey, epigenMarkerKeyFor } from "./epigenMarkerMap";
import type { EpigenDirection, EpigeneticMarkerInput } from "./epigenResultStore";

export interface EpigeneticReportRow {
  marker: string;
  value: string | null;
  unit: string | null;
  direction: string | null;
}

export interface EpigeneticPreviewRow {
  markerKey: string;
  displayName: string;
  valueNum: number | null;
  valueText: string | null;
  unit: string | null;
  direction: EpigenDirection | null;
}

const SYSTEM_INSTRUCTION =
  "You are a precise data extraction tool. You read epigenetic methylation wellness " +
  "reports that list measured markers (for example epigenetic age, pace of aging, an " +
  "inflammation methylation index) with a value and how it compares to an expected " +
  "range. You only transcribe what is printed. You never infer, diagnose, or add " +
  "markers that are not on the page. You always return strict JSON.";

const PROMPT =
  "Extract every marker row from this epigenetic report. For each marker return its " +
  "printed label, its value (a number with no unit text, or a short level word such as " +
  '"Elevated" when there is no number), the unit if one is printed, and the direction ' +
  "the report assigns it relative to the expected or reference range: higher, lower, or " +
  "typical. Map any wording to those three: elevated, accelerated, or above range is " +
  "higher; reduced or below range is lower; normal, within range, or average is " +
  "typical. Use null for a field that is not printed. Return ONLY a JSON array, no " +
  "prose, no code fence: " +
  '[{"marker":"Epigenetic Age","value":"42.3","unit":"years","direction":"higher"}]. ' +
  "Omit any row you cannot read.";

const HIGHER_WORDS = [
  "higher",
  "high",
  "elevated",
  "above",
  "increased",
  "accelerated",
  "older",
  "faster",
];
const LOWER_WORDS = [
  "lower",
  "low",
  "below",
  "decreased",
  "reduced",
  "decelerated",
  "younger",
  "slower",
];
const TYPICAL_WORDS = [
  "typical",
  "normal",
  "average",
  "within",
  "expected",
  "baseline",
  "on track",
  "optimal",
];

/**
 * Normalize a free-text direction word from a report into one of the three stored
 * directions, or null when it is missing or unrecognized. Higher and lower are
 * checked before typical so a phrase like "above the typical range" reads as higher.
 */
export function normalizeEpigenDirection(raw: string | null | undefined): EpigenDirection | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim().toLowerCase();
  if (!text) return null;
  if (HIGHER_WORDS.some((w) => text.includes(w))) return "higher";
  if (LOWER_WORDS.some((w) => text.includes(w))) return "lower";
  if (TYPICAL_WORDS.some((w) => text.includes(w))) return "typical";
  return null;
}

function parseJsonArray(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

function asStringOrNull(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

/** Read an epigenetic report PDF or image with Gemini vision. Fail-open to []. */
export async function extractEpigeneticFromReport(
  buf: Buffer,
  mimeType: string,
): Promise<EpigeneticReportRow[]> {
  try {
    const text = await extractWithGeminiVision(buf, mimeType, SYSTEM_INSTRUCTION, PROMPT);
    const parsed = parseJsonArray(text);
    if (!Array.isArray(parsed)) return [];
    const rows: EpigeneticReportRow[] = [];
    for (const entry of parsed) {
      if (entry && typeof entry === "object") {
        const e = entry as Record<string, unknown>;
        if (typeof e.marker === "string" && e.marker.trim().length > 0) {
          rows.push({
            marker: e.marker,
            value: asStringOrNull(e.value),
            unit: asStringOrNull(e.unit),
            direction: asStringOrNull(e.direction),
          });
        }
      }
    }
    return rows;
  } catch (err) {
    safeLog.warn("genetics.epigen.extract", "vision extraction failed (continuing)", {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

// Parse a printed value into a number when it is numeric, else keep the short level
// word as text. A value like "42.3" becomes valueNum 42.3; "Elevated" becomes
// valueText "Elevated".
function splitValue(value: string | null): { valueNum: number | null; valueText: string | null } {
  if (typeof value !== "string") return { valueNum: null, valueText: null };
  const trimmed = value.trim();
  if (!trimmed) return { valueNum: null, valueText: null };
  const num = Number(trimmed);
  if (Number.isFinite(num)) return { valueNum: num, valueText: null };
  return { valueNum: null, valueText: trimmed.slice(0, 120) };
}

/**
 * Map extracted report rows to preview rows for the verify screen. Keeps only
 * labels that resolve to a known EpigenHQ marker; the unit comes from the marker
 * map (authoritative), never from the printed page. Dedupes by marker key (first
 * reading wins). Unknown labels are dropped (a coverage gap), not guessed.
 */
export function mapEpigeneticRows(rows: EpigeneticReportRow[]): EpigeneticPreviewRow[] {
  const out: EpigeneticPreviewRow[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const key = epigenMarkerKeyFor(row.marker);
    if (!key) continue;
    if (seen.has(key)) continue;
    const entry = epigenMarkerByKey(key);
    if (!entry) continue;
    const { valueNum, valueText } = splitValue(row.value);
    // A row with neither a number nor a level word carries no reading; skip it.
    if (valueNum === null && valueText === null) continue;
    seen.add(key);
    out.push({
      markerKey: key,
      displayName: entry.displayName,
      valueNum,
      valueText,
      unit: entry.unit,
      direction: normalizeEpigenDirection(row.direction),
    });
  }
  return out;
}

/**
 * Re-derive a stored marker input from a client-sent key + value + direction at
 * confirm time. The key is validated against the map and the unit comes from the
 * map (authoritative), never from the client. Returns null for an unknown key or a
 * row that carries no reading.
 */
export function buildEpigeneticMarkerInput(
  markerKey: unknown,
  valueNum: unknown,
  valueText: unknown,
  direction: unknown,
): EpigeneticMarkerInput | null {
  if (typeof markerKey !== "string") return null;
  const entry = epigenMarkerByKey(markerKey);
  if (!entry) return null;
  const vNum = typeof valueNum === "number" && Number.isFinite(valueNum) ? valueNum : null;
  const vText = typeof valueText === "string" && valueText.trim().length > 0
    ? valueText.trim().slice(0, 120)
    : null;
  if (vNum === null && vText === null) return null;
  return {
    markerKey: entry.key,
    valueNum: vNum,
    valueText: vText,
    unit: entry.unit,
    direction: normalizeEpigenDirection(typeof direction === "string" ? direction : null),
  };
}
