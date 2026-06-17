// Prompt 201b: domain routing for normalized Google Health readings.
//
// One ingestion path per domain, all server-side:
//   body (weight, body_fat)  -> the Prompt 201 ingestion funnel
//                               (ingest-body-composition) in service mode, which
//                               runs the same idempotent upsert, Arnold
//                               reconciliation, and projection as every other
//                               body source. One funnel, one reconciliation.
//   vitals / sleep / activity -> daily_scores (the Bio Optimization gauge inputs)
//                               plus a wearable_integrations device row.
//
// UNKNOWN is stored as null, never zero. Units are normalized to canonical
// before storage; the raw unit is retained in the daily_scores source_breakdown
// bag. The daily_scores write is non-destructive: it never downgrades a day that
// already holds manual check-in data (it marks that day mixed and touches only
// the wearable signal columns).
//
// All comments use hyphens only. No em-dashes or en-dashes.

import type { SupabaseClient } from "@supabase/supabase-js";
import { withTimeout } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { GOOGLE_HEALTH_SOURCE_ID, getDataType, type GoogleHealthDataType } from "./config";
import { attributeProvenance } from "./provenance";
import type { ReadingRecord } from "./client";

const SCOPE = "lib.integrations.google-health.ingest";
const LB_TO_KG = 0.45359237;
const MI_TO_KM = 1.609344;
const KJ_TO_KCAL = 1 / 4.184;

function funnelUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/functions/v1/ingest-body-composition`;
}

// Sane physiological ranges per data type key, in canonical units. A normalized
// value outside its range is treated as UNKNOWN (null), never stored as a bogus
// reading. Bounds are deliberately wide; the goal is to reject corruption, not
// to clinically validate.
const SANE_RANGE: Record<string, [number, number]> = {
  weight: [20, 400], // kg
  body_fat: [2, 75], // pct
  heart_rate_variability: [1, 400], // ms
  resting_heart_rate: [25, 220], // bpm
  heart_rate: [25, 240], // bpm
  oxygen_saturation: [50, 100], // pct
  respiratory_rate: [4, 60], // rpm
  sleep: [0, 24], // hours
  steps: [0, 200000], // count
  active_zone_minutes: [0, 1440], // minutes
  distance: [0, 1000], // km
  floors: [0, 10000], // count
  calories: [0, 30000], // kcal
  exercise: [0, 1440], // minutes
};

export interface IngestSummary {
  bodyIngested: number;
  gaugeDays: number;
  deviceTypes: string[];
}

// Normalize a raw value to its data type's canonical unit, then reject anything
// outside a sane physiological range. Returns null for non-finite, unconvertible,
// or out-of-range input so UNKNOWN never becomes zero or a corrupt reading.
function normalizeValue(dataType: GoogleHealthDataType, value: number | null, rawUnit: string | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const unit = (rawUnit ?? "").trim().toLowerCase();
  let out: number;
  switch (dataType.canonicalUnit) {
    case "kg":
      if (unit === "lb" || unit === "lbs") out = value * LB_TO_KG;
      else if (unit === "g") out = value / 1000;
      else out = value;
      break;
    case "pct":
      // Drive off the unit; only guess from magnitude when the unit is absent.
      if (unit === "percent" || unit === "%") out = value;
      else if (unit === "fraction" || unit === "ratio") out = value * 100;
      else out = value <= 1.5 ? value * 100 : value;
      break;
    case "hours":
      if (unit === "min" || unit === "minutes") out = value / 60;
      else if (unit === "ms") out = value / 3_600_000;
      else if (unit === "s" || unit === "sec" || unit === "seconds") out = value / 3600;
      else out = value;
      break;
    case "km":
      if (unit === "mm" || unit === "millimeter" || unit === "millimeters") out = value / 1_000_000;
      else if (unit === "m" || unit === "meter" || unit === "meters") out = value / 1000;
      else if (unit === "mi" || unit === "mile" || unit === "miles") out = value * MI_TO_KM;
      else out = value;
      break;
    case "kcal":
      out = unit === "kj" ? value * KJ_TO_KCAL : value;
      break;
    default:
      out = value;
      break;
  }
  const range = SANE_RANGE[dataType.key];
  if (range && (out < range[0] || out > range[1])) return null;
  return out;
}

function utcDay(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

// Post a batch of body samples to the funnel in service mode. Returns the number
// ingested. Fails open: a funnel error logs and returns 0.
async function postBodyBatch(
  userId: string,
  deviceOrigin: string,
  samples: Array<{ metricKey: string; value: number | null; unit: string; measuredAt: string; externalId: string }>,
): Promise<number> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = funnelUrl();
  if (!serviceKey || !url) {
    safeLog.warn(SCOPE, "funnel not configured; cannot post body batch", { hasKey: Boolean(serviceKey), hasUrl: Boolean(url) });
    return 0;
  }
  try {
    const res = await withTimeout(
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // The service-role key is itself a valid Supabase JWT, so it satisfies
          // the function's verify_jwt gateway check; the matching x-ingest-service
          // -key header then unlocks the trusted server-to-server userId path.
          Authorization: `Bearer ${serviceKey}`,
          "x-ingest-service-key": serviceKey,
        },
        body: JSON.stringify({
          userId,
          sourceId: GOOGLE_HEALTH_SOURCE_ID,
          deviceOrigin,
          samples,
        }),
      }),
      20000,
      `${SCOPE}.funnel`,
    );
    if (!res.ok) {
      safeLog.warn(SCOPE, "funnel non-2xx", { status: res.status, deviceOrigin });
      return 0;
    }
    const json = (await res.json()) as { ingested?: number };
    return json?.ingested ?? 0;
  } catch (err) {
    safeLog.warn(SCOPE, "funnel post failed", { error: err, deviceOrigin });
    return 0;
  }
}

interface DayBucket {
  columns: Record<string, number>; // typed daily_scores columns
  jsonb: Record<string, number>; // source_breakdown bag
  deviceLabels: Set<string>;
}

// Non-destructive per-day write into daily_scores. Updates only the wearable
// signal columns; if the day already holds non-wearable data it is marked mixed
// rather than overwritten.
async function writeDay(
  admin: SupabaseClient,
  userId: string,
  day: string,
  bucket: DayBucket,
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const breakdown = {
    google_health: { ...bucket.jsonb, devices: [...bucket.deviceLabels], synced_at: nowIso },
  };
  try {
    const { data: existing } = await withTimeout(
      (async () =>
        (admin as unknown as { from: (t: string) => any })
          .from("daily_scores")
          .select("id, data_source, source_breakdown")
          .eq("user_id", userId)
          .eq("date", day)
          .limit(1)
          .maybeSingle())(),
      5000,
      `${SCOPE}.day-find`,
    );

    if (existing) {
      const prior = existing as { id: string; data_source: string | null; source_breakdown: Record<string, unknown> | null };
      // Never downgrade a day that already holds non-wearable (manual) data; mark
      // it mixed and touch only the wearable signal columns.
      const dataSource = prior.data_source && prior.data_source !== "wearable" ? "mixed" : "wearable";
      await withTimeout(
        (async () =>
          (admin as unknown as { from: (t: string) => any })
            .from("daily_scores")
            .update({
              ...bucket.columns,
              data_source: dataSource,
              wearable_type: GOOGLE_HEALTH_SOURCE_ID,
              source_breakdown: { ...(prior.source_breakdown ?? {}), ...breakdown },
              updated_at: nowIso,
            })
            .eq("id", prior.id))(),
        5000,
        `${SCOPE}.day-update`,
      );
      return true;
    }

    await withTimeout(
      (async () =>
        (admin as unknown as { from: (t: string) => any })
          .from("daily_scores")
          .insert({
            user_id: userId,
            date: day,
            data_source: "wearable",
            wearable_type: GOOGLE_HEALTH_SOURCE_ID,
            source_breakdown: breakdown,
            updated_at: nowIso,
            ...bucket.columns,
          }))(),
      5000,
      `${SCOPE}.day-insert`,
    );
    return true;
  } catch (err) {
    safeLog.warn(SCOPE, "daily_scores write failed", { error: err, day });
    return false;
  }
}

// Read-then-write a wearable_integrations device row (the table has no usable
// unique key in this database, so we match on user_id + device_type rather than
// rely on an upsert conflict target).
async function recordDevice(admin: SupabaseClient, userId: string, deviceType: string): Promise<void> {
  const nowIso = new Date().toISOString();
  try {
    const { data: existing } = await withTimeout(
      (async () =>
        (admin as unknown as { from: (t: string) => any })
          .from("wearable_integrations")
          .select("id")
          .eq("user_id", userId)
          .eq("device_type", deviceType)
          .limit(1)
          .maybeSingle())(),
      5000,
      `${SCOPE}.device-find`,
    );
    if (existing) {
      await withTimeout(
        (async () =>
          (admin as unknown as { from: (t: string) => any })
            .from("wearable_integrations")
            .update({ is_active: true, last_sync_date: nowIso })
            .eq("id", (existing as { id: string }).id))(),
        5000,
        `${SCOPE}.device-update`,
      );
      return;
    }
    await withTimeout(
      (async () =>
        (admin as unknown as { from: (t: string) => any })
          .from("wearable_integrations")
          .insert({
            user_id: userId,
            device_type: deviceType,
            device_name: "Google Health",
            is_active: true,
            connected_at: nowIso,
            last_sync_date: nowIso,
          }))(),
      5000,
      `${SCOPE}.device-insert`,
    );
  } catch (err) {
    safeLog.warn(SCOPE, "wearable_integrations write failed", { error: err, deviceType });
  }
}

// Route a batch of pulled readings to the correct domain stores.
export async function ingestReadings(
  admin: SupabaseClient,
  userId: string,
  records: ReadingRecord[],
): Promise<IngestSummary> {
  // Body samples, grouped by device origin (the funnel takes one origin per call
  // so each reading keeps its provenance).
  const bodyByOrigin = new Map<string, Array<{ metricKey: string; value: number | null; unit: string; measuredAt: string; externalId: string }>>();
  // Gauge buckets keyed by UTC day.
  const dayBuckets = new Map<string, DayBucket>();
  const deviceTypes = new Set<string>();

  for (const rec of records) {
    const dt = getDataType(rec.dataTypeKey);
    if (!dt) continue;
    const value = normalizeValue(dt, rec.value, rec.rawUnit);
    const origin = attributeProvenance(rec.provenance);

    if (dt.target.store === "body") {
      const list = bodyByOrigin.get(origin.deviceOrigin) ?? [];
      list.push({
        metricKey: dt.target.metricKey,
        value,
        unit: dt.canonicalUnit,
        measuredAt: rec.measuredAt,
        externalId: rec.externalId,
      });
      bodyByOrigin.set(origin.deviceOrigin, list);
      continue;
    }

    // Gauge domains. A null value is dropped (UNKNOWN, never zero); the day is
    // still recorded only when at least one signal lands.
    if (value === null) continue;
    const day = utcDay(rec.measuredAt);
    const bucket = dayBuckets.get(day) ?? { columns: {}, jsonb: {}, deviceLabels: new Set<string>() };
    if (dt.target.store === "daily_column") {
      bucket.columns[dt.target.column] = value;
    } else if (dt.target.store === "daily_jsonb") {
      bucket.jsonb[dt.target.key] = value;
    }
    bucket.deviceLabels.add(origin.deviceLabel);
    dayBuckets.set(day, bucket);
    deviceTypes.add(origin.deviceOrigin);
  }

  let bodyIngested = 0;
  for (const [origin, samples] of bodyByOrigin) {
    bodyIngested += await postBodyBatch(userId, origin, samples);
  }

  let gaugeDays = 0;
  for (const [day, bucket] of dayBuckets) {
    if (await writeDay(admin, userId, day, bucket)) gaugeDays += 1;
  }

  for (const deviceType of deviceTypes) {
    await recordDevice(admin, userId, deviceType);
  }

  safeLog.info(SCOPE, "ingest complete", {
    userId,
    bodyIngested,
    gaugeDays,
    deviceTypes: [...deviceTypes],
  });

  return { bodyIngested, gaugeDays, deviceTypes: [...deviceTypes] };
}
