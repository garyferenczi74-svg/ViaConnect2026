// Prompt 201: ingest-body-composition. The single normalized ingestion funnel
// for every connected source. The web Apple Health parser and the future native
// HealthKit / Health Connect plugin both post NormalizedSample[] here. There is
// no second pipeline.
//
// Flow: authenticate the caller (user resolved server side, never from the body),
// validate each sample against the registry capability list for sourceId, upsert
// on the idempotency key, run Arnold reconciliation (set-based SQL resolver), then
// project the resolved winners into body_tracker_weight so the existing My Biology
// surfaces show imported data. Returns { seen, ingested, deduped, rejected }.
//
// Resilience: every Supabase call is wrapped in a Promise.race timeout and a
// fail-open try/catch that returns a structured partial result rather than
// throwing. Structured logging carries source_id, user_id, counts, and duration.
//
// All comments use hyphens only. No em-dashes or en-dashes.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Mirrors src/lib/body-tracker/connected-sources/registry.ts. Keep in sync.
const SOURCE_CAPABILITIES: Record<string, string[]> = {
  apple_health: ["weight", "body_fat_pct", "lean_mass", "bmi"],
  manual_entry: [
    "weight", "body_fat_pct", "lean_mass", "bmi", "visceral_fat", "body_water_pct",
    "bone_mass", "basal_metabolic_rate", "skeletal_muscle_mass", "protein_mass",
    "mineral_mass", "metabolic_age",
  ],
  google_health_connect: ["weight", "body_fat_pct", "lean_mass", "bmi"],
  google_health: ["weight", "body_fat_pct"],
  fitbit: ["weight", "body_fat_pct"],
  garmin: ["weight", "body_fat_pct"],
  native_bridge: ["weight", "body_fat_pct", "lean_mass", "bmi"],
};

// Projection of a resolved canonical value into a body_tracker_weight column.
// Mirrors src/lib/body-tracker/connected-sources/metrics.ts. Metrics without a
// column live in the readings store only.
const KG_TO_LBS = 2.2046226218;
const PROJECTION: Record<string, { col: string; conv: (v: number) => number }> = {
  weight: { col: "weight_lbs", conv: (v) => v * KG_TO_LBS },
  body_fat_pct: { col: "body_fat_pct", conv: (v) => v },
  lean_mass: { col: "lean_body_mass_lbs", conv: (v) => v * KG_TO_LBS },
  bmi: { col: "bmi", conv: (v) => v },
  visceral_fat: { col: "visceral_fat_rating", conv: (v) => Math.round(v) },
  body_water_pct: { col: "body_water_pct", conv: (v) => v },
  bone_mass: { col: "bone_mass_lbs", conv: (v) => v * KG_TO_LBS },
  basal_metabolic_rate: { col: "basal_metabolic_rate", conv: (v) => Math.round(v) },
  protein_mass: { col: "protein_lbs", conv: (v) => v * KG_TO_LBS },
  mineral_mass: { col: "mineral_lbs", conv: (v) => v * KG_TO_LBS },
};

const PROJECT_DAY_CAP = 120; // bound projection work per call; readings store keeps all history

interface NormalizedSample {
  metricKey: string;
  value: number | null;
  unit: string;
  measuredAt: string;
  externalId: string;
}
interface IngestRequest {
  sourceId: string;
  deviceOrigin?: string;
  samples: NormalizedSample[];
}

function log(level: "info" | "warn" | "error", ctx: Record<string, unknown>) {
  try {
    console.log(JSON.stringify({ scope: "ingest-body-composition", level, ...ctx }));
  } catch {
    console.log("ingest-body-composition", level);
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function withTimeout<T>(p: Promise<T>, ms: number, op: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout:${op}`)), ms)),
  ]);
}

function utcDay(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

// Constant-time string compare for the service-mode shared secret, so a timing
// side channel cannot probe the service-role key byte by byte.
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function projectToWeight(
  admin: SupabaseClient,
  userId: string,
  days: string[],
): Promise<number> {
  let projected = 0;
  // Most-recent days first; bound the work and never silently drop the rest.
  const ordered = [...new Set(days)].sort((a, b) => b.localeCompare(a));
  const capped = ordered.slice(0, PROJECT_DAY_CAP);
  if (ordered.length > capped.length) {
    log("warn", { event: "projection_capped", user_id: userId, total_days: ordered.length, projected_days: capped.length });
  }
  for (const day of capped) {
    try {
      const start = `${day}T00:00:00.000Z`;
      const end = `${day}T23:59:59.999Z`;
      const { data: winners } = await withTimeout(
        admin
          .from("body_composition_readings")
          .select("metric_key, value, device_origin")
          .eq("user_id", userId)
          .eq("is_resolved", true)
          .not("value", "is", null)
          .gte("measured_at", start)
          .lte("measured_at", end),
        4000,
        "project-fetch",
      );
      if (!winners || winners.length === 0) continue;

      const cols: Record<string, number> = {};
      let deviceOrigin: string | null = null;
      for (const w of winners as Array<{ metric_key: string; value: number; device_origin: string | null }>) {
        const proj = PROJECTION[w.metric_key];
        if (proj && w.value !== null) cols[proj.col] = proj.conv(Number(w.value));
        if (w.device_origin) deviceOrigin = w.device_origin;
      }
      if (Object.keys(cols).length === 0) continue;

      // Find-or-create the single connected_sources entry for this day.
      const { data: existingEntry } = await withTimeout(
        admin
          .from("body_tracker_entries")
          .select("id")
          .eq("user_id", userId)
          .eq("entry_date", day)
          .eq("source", "connected_sources")
          .limit(1)
          .maybeSingle(),
        3000,
        "project-entry-find",
      );

      let entryId = (existingEntry as { id: string } | null)?.id ?? null;
      if (!entryId) {
        const { data: inserted } = await withTimeout(
          admin
            .from("body_tracker_entries")
            .insert({ user_id: userId, entry_date: day, source: "connected_sources", device_name: deviceOrigin })
            .select("id")
            .single(),
          3000,
          "project-entry-insert",
        );
        entryId = (inserted as { id: string } | null)?.id ?? null;
      }
      if (!entryId) continue;

      const { data: existingWeight } = await withTimeout(
        admin.from("body_tracker_weight").select("id").eq("entry_id", entryId).limit(1).maybeSingle(),
        3000,
        "project-weight-find",
      );

      // Stamp created_at to the measurement day (not insert time). The hub and
      // weight surfaces read body_tracker_weight ORDER BY created_at DESC, so a
      // back-dated import must not become the displayed current weight.
      const dayTs = `${day}T12:00:00.000Z`;
      if ((existingWeight as { id: string } | null)?.id) {
        await withTimeout(
          admin.from("body_tracker_weight").update({ ...cols, created_at: dayTs }).eq("id", (existingWeight as { id: string }).id),
          3000,
          "project-weight-update",
        );
      } else {
        await withTimeout(
          admin.from("body_tracker_weight").insert({ user_id: userId, entry_id: entryId, created_at: dayTs, ...cols }),
          3000,
          "project-weight-insert",
        );
      }
      projected += 1;
    } catch (err) {
      log("warn", { event: "project_day_failed", user_id: userId, day, error: String(err) });
    }
  }
  return projected;
}

serve(async (req) => {
  const startedAt = Date.now();
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let userId = "";
  let sourceId = "";
  try {
    // Resolve user_id in one of two modes:
    //   user JWT  : the default; user_id comes from getUser, never the body.
    //   service   : an internal server-to-server caller (the Google Health
    //               webhook and polling sync have no user session) presents the
    //               service-role key in x-ingest-service-key and a trusted
    //               userId in the body. Only our own backend holds that key, so
    //               this does not widen the trust boundary. Reconciliation and
    //               projection stay identical; there is still one funnel.
    const body = (await req.json()) as IngestRequest & { userId?: string };
    const serviceAuth = req.headers.get("x-ingest-service-key") ?? "";
    if (serviceAuth && timingSafeEqualStr(serviceAuth, SERVICE_KEY) && typeof body?.userId === "string" && body.userId) {
      userId = body.userId;
    } else {
      const authHeader = req.headers.get("Authorization") ?? "";
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: authData } = await withTimeout(userClient.auth.getUser(), 5000, "auth");
      const user = authData?.user;
      if (!user) return json({ error: "unauthorized" }, 401);
      userId = user.id;
    }

    sourceId = body?.sourceId ?? "";
    const deviceOrigin = body?.deviceOrigin ?? null;
    const samples = Array.isArray(body?.samples) ? body.samples : [];
    const caps = SOURCE_CAPABILITIES[sourceId];
    if (!caps) return json({ error: "unknown source" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const seen = samples.length;
    let rejected = 0;
    const rows: Record<string, unknown>[] = [];
    const days = new Set<string>();

    for (const s of samples) {
      if (!s || typeof s.metricKey !== "string" || !caps.includes(s.metricKey)) {
        rejected += 1;
        log("warn", { event: "sample_rejected", user_id: userId, source_id: sourceId, metric_key: s?.metricKey });
        continue;
      }
      const value = typeof s.value === "number" && Number.isFinite(s.value) ? s.value : null;
      const externalId = s.externalId && s.externalId.length > 0 ? s.externalId : crypto.randomUUID();
      rows.push({
        user_id: userId,
        source_id: sourceId,
        device_origin: deviceOrigin,
        metric_key: s.metricKey,
        value,
        unit: s.unit,
        measured_at: s.measuredAt,
        external_id: externalId,
        is_estimated: false,
        confidence: value === null ? "unknown" : sourceId === "manual_entry" ? "medium" : "high",
      });
      days.add(utcDay(s.measuredAt));
    }

    // Idempotent upsert. ignoreDuplicates does INSERT ... ON CONFLICT DO NOTHING,
    // so re-importing the same export ingests zero new rows.
    let ingested = 0;
    if (rows.length > 0) {
      try {
        const { data, error } = await withTimeout(
          admin
            .from("body_composition_readings")
            .upsert(rows, {
              onConflict: "user_id,source_id,metric_key,measured_at,external_id",
              ignoreDuplicates: true,
            })
            .select("id"),
          5000,
          "upsert",
        );
        if (error) {
          log("error", { event: "upsert_error", user_id: userId, source_id: sourceId, error: error.message });
        } else {
          ingested = data?.length ?? 0;
        }
      } catch (err) {
        log("error", { event: "upsert_exception", user_id: userId, source_id: sourceId, error: String(err) });
      }
    }
    const deduped = rows.length - ingested;

    // Reconcile (set-based) then project, both fail-open.
    let reconciled = 0;
    let projected = 0;
    const dayList = [...days];
    if (dayList.length > 0) {
      try {
        const { data: rc } = await withTimeout(
          admin.rpc("reconcile_body_composition", { p_user_id: userId, p_days: dayList }),
          5000,
          "reconcile",
        );
        reconciled = typeof rc === "number" ? rc : 0;
      } catch (err) {
        log("error", { event: "reconcile_failed", user_id: userId, source_id: sourceId, error: String(err) });
      }
      try {
        projected = await projectToWeight(admin, userId, dayList);
      } catch (err) {
        log("error", { event: "project_failed", user_id: userId, source_id: sourceId, error: String(err) });
      }
    }

    const duration_ms = Date.now() - startedAt;
    log("info", { event: "ingest_complete", user_id: userId, source_id: sourceId, seen, ingested, deduped, rejected, reconciled, projected, duration_ms });
    return json({ seen, ingested, deduped, rejected, reconciled, projected, duration_ms });
  } catch (err) {
    // Fail open: return a structured partial result rather than throwing.
    log("error", { event: "ingest_fatal", user_id: userId, source_id: sourceId, error: String(err) });
    return json({ seen: 0, ingested: 0, deduped: 0, rejected: 0, error: "ingest failed" }, 200);
  }
});
