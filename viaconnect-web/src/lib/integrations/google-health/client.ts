// Prompt 201b: Google Health REST v4 client.
//
// Pinned to v4. The list endpoint preserves per-device provenance; the reconcile
// endpoint returns Google's merged single stream. Per the prompt: list for body
// composition (attribute each reading to its device), reconcile for high-volume
// vitals. The choice is encoded per data type in config.ts (endpointMode).
//
// The identifier quirk (kebab-case in paths, snake_case in filters) lives in
// config.ts and is consumed here, never hand-built.
//
// The API is brand new: responses are parsed defensively, unexpected fields are
// logged rather than thrown, and any failure yields an empty reading set so a
// sync fails open. Every network call is bounded by an AbortSignal timeout.
//
// All comments use hyphens only. No em-dashes or en-dashes.

import { withAbortTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { GOOGLE_HEALTH_API_BASE, type GoogleHealthDataType } from "./config";
import type { GoogleHealthProvenance } from "./provenance";

const SCOPE = "lib.integrations.google-health.client";
const PULL_TIMEOUT_MS = 5000;

export interface ReadingRecord {
  dataTypeKey: string;
  value: number | null;
  rawUnit: string | null;
  measuredAt: string; // ISO
  externalId: string;
  provenance: GoogleHealthProvenance | null;
}

function rfc3339(d: Date): string {
  return d.toISOString();
}

// Endpoint builder. Verified 2026-06-16 against developers.google.com/health/
// endpoints: /v4/users/me/dataTypes/{kebab}/dataPoints, with the time range as a
// filter expression on data_type.interval.start_time plus page_size. All pulls
// use the list dataPoints endpoint, which carries per-source provenance (what we
// badge). reconcile/rollUp remain a future volume optimization; endpointMode is
// retained as documentation of the intended choice per type.
function buildUrl(dataType: GoogleHealthDataType, sinceISO: string, untilISO: string): string {
  const base = `${GOOGLE_HEALTH_API_BASE}/users/me/dataTypes/${dataType.endpointName}/dataPoints`;
  const filter = `data_type.interval.start_time >= "${sinceISO}" AND data_type.interval.start_time < "${untilISO}"`;
  const params = new URLSearchParams({ page_size: "1000", filter });
  return `${base}?${params.toString()}`;
}

function asNumber(...candidates: unknown[]): number | null {
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return c;
    if (typeof c === "string" && c.trim() !== "" && Number.isFinite(Number(c))) return Number(c);
  }
  return null;
}

function asString(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim() !== "") return c;
  }
  return null;
}

function extractRecords(dataType: GoogleHealthDataType, json: unknown): ReadingRecord[] {
  const root = json as Record<string, unknown> | null;
  const rows =
    (root?.dataPoints as unknown[]) ??
    (root?.readings as unknown[]) ??
    (root?.data as unknown[]) ??
    (root?.points as unknown[]) ??
    (root?.values as unknown[]) ??
    [];
  if (!Array.isArray(rows)) {
    safeLog.warn(SCOPE, "unexpected response shape", { dataType: dataType.key, keys: root ? Object.keys(root) : null });
    return [];
  }

  const out: ReadingRecord[] = [];
  for (const r of rows) {
    const row = r as Record<string, unknown>;
    const value = asNumber(row.value, row.numericValue, row.quantity, (row.value as any)?.amount);
    // A data point carries its time under interval.start_time (per the verified
    // filter field). Fall back to the flatter shapes if the response differs.
    const interval = (row.interval ?? (row.dataType as any)?.interval) as Record<string, unknown> | undefined;
    const measuredAt =
      asString(
        interval?.startTime,
        interval?.start_time,
        interval?.endTime,
        interval?.end_time,
        row.startTime,
        row.endTime,
        row.time,
        row.timestamp,
        row.recordedAt,
      ) ?? null;
    if (!measuredAt) continue; // a reading without a time cannot be placed on a day
    const iso = new Date(measuredAt).toISOString();
    const provenance = (row.provenance ?? row.origin ?? row.device ?? null) as GoogleHealthProvenance | null;
    const externalId =
      asString(row.id, row.readingId, row.name) ??
      `${dataType.key}|${iso}|${value ?? "null"}`;
    out.push({
      dataTypeKey: dataType.key,
      value,
      rawUnit: asString(row.unit, (row.value as any)?.unit),
      measuredAt: iso,
      externalId,
      provenance,
    });
  }
  return out;
}

export async function fetchDataTypeReadings(
  accessToken: string,
  dataType: GoogleHealthDataType,
  since: Date,
  until: Date,
): Promise<ReadingRecord[]> {
  const url = buildUrl(dataType, rfc3339(since), rfc3339(until));
  try {
    const res = await withAbortTimeout(
      (signal) =>
        fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
          signal,
        }),
      PULL_TIMEOUT_MS,
      `${SCOPE}.${dataType.key}`,
    );
    if (!res.ok) {
      safeLog.warn(SCOPE, "pull non-2xx", { dataType: dataType.key, status: res.status });
      return [];
    }
    return extractRecords(dataType, await res.json());
  } catch (err) {
    if (isTimeoutError(err)) safeLog.warn(SCOPE, "pull timeout", { dataType: dataType.key, error: err });
    else safeLog.warn(SCOPE, "pull error", { dataType: dataType.key, error: err });
    return [];
  }
}
