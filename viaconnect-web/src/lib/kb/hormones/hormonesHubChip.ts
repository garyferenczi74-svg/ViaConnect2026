/**
 * Prompt 221C follow-up: Hormones hub chip from real lab dates only.
 * Never fabricates a value; returns undefined when no hormone-like lab date exists.
 */

import { isHormoneLikeBiomarker } from "./matchLabMarkers";

export interface LabDateRow {
  biomarker: string;
  measured_at: string | null;
}

/**
 * Pick the most recent hormone-like lab by measured_at (ISO).
 * Rows without measured_at are ignored (date-only rule).
 */
export function pickLatestHormoneLabDate(
  rows: LabDateRow[]
): string | undefined {
  let best: string | undefined;
  let bestMs = Number.NEGATIVE_INFINITY;
  for (const row of rows) {
    if (!row.measured_at) continue;
    if (!isHormoneLikeBiomarker(row.biomarker)) continue;
    const ms = Date.parse(row.measured_at);
    if (!Number.isFinite(ms)) continue;
    if (ms > bestMs) {
      bestMs = ms;
      best = row.measured_at;
    }
  }
  return best;
}

/**
 * Format an ISO lab date for the hub chip (e.g. "Aug 1").
 * Uses UTC calendar parts so the chip is stable across timezones.
 */
export function formatHormoneLabChipDate(iso: string): string | undefined {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return undefined;
  const d = new Date(ms);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[d.getUTCMonth()];
  const day = d.getUTCDate();
  if (!month || day < 1) return undefined;
  return `${month} ${day}`;
}

export function resolveHormonesReportChip(
  rows: LabDateRow[]
): string | undefined {
  const latest = pickLatestHormoneLabDate(rows);
  if (!latest) return undefined;
  return formatHormoneLabChipDate(latest);
}
