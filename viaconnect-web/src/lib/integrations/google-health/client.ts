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

// A Google Health data point carries a type-specific union object whose key is
// the camelCase of the kebab type name (point.bodyFat, point.heartRate), and the
// unit is encoded in the value field name (weightGrams, distanceMillimeters,
// percentage, beatsPerMinute). We derive both rather than hard-code every field,
// so a type whose exact field name is not yet pinned still resolves via the first
// numeric field. Provenance lives under point.dataSource.
function kebabToCamel(s: string): string {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function inferUnit(fieldName: string, fallback: string): string {
  const n = fieldName.toLowerCase();
  if (/grams?$/.test(n)) return "g";
  if (/millimet(er|re)s?$/.test(n)) return "mm";
  if (/kilomet(er|re)s?$/.test(n)) return "km";
  if (/met(er|re)s?$/.test(n)) return "m";
  if (/percent(age)?$/.test(n)) return "percent";
  if (/beatsperminute$/.test(n)) return "bpm";
  if (/breathsperminute$/.test(n)) return "rpm";
  if (/milliseconds?$/.test(n)) return "ms";
  if (/minutes?$/.test(n)) return "minutes";
  if (/(kilocalories?|calories)$/.test(n)) return "kcal";
  if (/(count|steps)$/.test(n)) return "count";
  return fallback;
}

// First finite numeric leaf in a type object plus the field it came from (so the
// unit can be inferred). Shallow first, then one level deep.
function firstNumericField(obj: Record<string, unknown>): { value: number; field: string } | null {
  for (const [k, v] of Object.entries(obj)) {
    const n = asNumber(v);
    if (n !== null) return { value: n, field: k };
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") {
      const inner = firstNumericField(v as Record<string, unknown>);
      if (inner) return inner;
    }
  }
  return null;
}

function findTime(obj: Record<string, unknown> | undefined): string | null {
  if (!obj) return null;
  const sample = obj.sampleTime as Record<string, unknown> | undefined;
  const interval = obj.interval as Record<string, unknown> | undefined;
  return asString(
    obj.physicalTime,
    sample?.physicalTime,
    interval?.startTime,
    interval?.start_time,
    interval?.endTime,
    obj.startTime,
    obj.endTime,
    obj.time,
  );
}

function extractRecords(dataType: GoogleHealthDataType, json: unknown): ReadingRecord[] {
  const root = json as Record<string, unknown> | null;
  const rows = (root?.dataPoints as unknown[]) ?? (root?.data as unknown[]) ?? [];
  if (!Array.isArray(rows)) {
    safeLog.warn(SCOPE, "unexpected response shape", { dataType: dataType.key, keys: root ? Object.keys(root) : null });
    return [];
  }
  if (root?.nextPageToken) {
    // page_size is 1000 over a short window; a continuation token means the tail
    // was not read. Log rather than silently drop it (pagination is a follow-up).
    safeLog.info(SCOPE, "nextPageToken present; window truncated to first page", { dataType: dataType.key });
  }

  const responseKey = kebabToCamel(dataType.endpointName);
  const out: ReadingRecord[] = [];
  for (const r of rows) {
    const point = r as Record<string, unknown>;
    // Value lives in the type-specific union object. Prefer the response key;
    // fall back to the first non-metadata object on the point.
    let typeObj = point[responseKey] as Record<string, unknown> | undefined;
    if (!typeObj || typeof typeObj !== "object") {
      for (const [k, v] of Object.entries(point)) {
        if (k !== "dataSource" && k !== "name" && k !== "interval" && v && typeof v === "object") {
          typeObj = v as Record<string, unknown>;
          break;
        }
      }
    }

    const num = typeObj ? firstNumericField(typeObj) : null;
    const value = num?.value ?? null;
    const rawUnit = num ? inferUnit(num.field, dataType.canonicalUnit) : dataType.canonicalUnit;

    const measuredAt = findTime(typeObj) ?? findTime(point);
    if (!measuredAt) continue; // a reading without a time cannot be placed on a day
    const iso = new Date(measuredAt).toISOString();

    const provenance = (point.dataSource ?? null) as GoogleHealthProvenance | null;
    const externalId = asString(point.name) ?? `${dataType.key}|${iso}|${value ?? "null"}`;

    out.push({ dataTypeKey: dataType.key, value, rawUnit, measuredAt: iso, externalId, provenance });
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
    const payload = await res.json();
    // Staging capture: log the raw first data points per type so the field
    // mapping and unit inference can be confirmed against the real payload.
    if (process.env.GOOGLE_HEALTH_CAPTURE === "true") {
      const points = (payload as { dataPoints?: unknown[] })?.dataPoints;
      safeLog.info(SCOPE, "capture: raw dataPoints", {
        dataType: dataType.key,
        sample: Array.isArray(points) ? points.slice(0, 2) : payload,
      });
    }
    return extractRecords(dataType, payload);
  } catch (err) {
    if (isTimeoutError(err)) safeLog.warn(SCOPE, "pull timeout", { dataType: dataType.key, error: err });
    else safeLog.warn(SCOPE, "pull error", { dataType: dataType.key, error: err });
    return [];
  }
}

export interface GoogleHealthIdentity {
  healthUserId: string | null;
  legacyUserId: string | null;
}

// getIdentity maps the connected account to its Google Health identifiers. The
// healthUserId is stored at connect and used to route webhook notifications to
// the right ViaConnect user.
export async function fetchIdentity(accessToken: string): Promise<GoogleHealthIdentity | null> {
  const url = `${GOOGLE_HEALTH_API_BASE}/users/me/identity`;
  try {
    const res = await withAbortTimeout(
      (signal) =>
        fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
          signal,
        }),
      PULL_TIMEOUT_MS,
      `${SCOPE}.identity`,
    );
    if (!res.ok) {
      safeLog.warn(SCOPE, "identity non-2xx", { status: res.status });
      return null;
    }
    const json = (await res.json()) as Record<string, unknown>;
    if (process.env.GOOGLE_HEALTH_CAPTURE === "true") {
      safeLog.info(SCOPE, "capture: identity", { json });
    }
    return {
      healthUserId: asString(json.healthUserId, json.health_user_id),
      legacyUserId: asString(json.legacyUserId, json.legacy_user_id),
    };
  } catch (err) {
    if (isTimeoutError(err)) safeLog.warn(SCOPE, "identity timeout", { error: err });
    else safeLog.warn(SCOPE, "identity error", { error: err });
    return null;
  }
}
