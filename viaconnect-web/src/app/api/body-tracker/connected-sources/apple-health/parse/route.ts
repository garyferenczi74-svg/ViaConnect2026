// Prompt 201: Apple Health export parser (web interim path). The client uploads
// the export zip to storage (bypassing the serverless body limit), then this
// route streams it from storage, extracts the four body-composition record
// types, normalizes units, attributes Hume per record, and posts to the single
// ingestion funnel. There is no second pipeline.
//
// The XML inside a Health export is large, so it is streamed: fflate streaming
// Unzip yields decompressed chunks, decoded incrementally into a small rolling
// buffer from which complete <Record ...> opening tags are extracted. The whole
// decompressed XML is never held in memory.
//
// All comments use hyphens only. No em-dashes or en-dashes.

import { NextResponse } from "next/server";
import { Unzip, UnzipInflate } from "fflate";
import { createClient } from "@/lib/supabase/server";
import { withTimeout } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { matchesHume, HUME_DEVICE_ORIGIN } from "@/lib/body-tracker/connected-sources/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const LB_TO_KG = 0.45359237;
const FUNNEL_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ingest-body-composition`;
const BATCH_SIZE = 500;

// HealthKit record type -> canonical metric.
const TYPE_MAP: Record<string, { metricKey: string; unit: string }> = {
  HKQuantityTypeIdentifierBodyMass: { metricKey: "weight", unit: "kg" },
  HKQuantityTypeIdentifierBodyFatPercentage: { metricKey: "body_fat_pct", unit: "pct" },
  HKQuantityTypeIdentifierLeanBodyMass: { metricKey: "lean_mass", unit: "kg" },
  HKQuantityTypeIdentifierBodyMassIndex: { metricKey: "bmi", unit: "index" },
};

interface NormalizedSample {
  metricKey: string;
  value: number;
  unit: string;
  measuredAt: string;
  externalId: string;
}

function normalizeValue(metricKey: string, rawValue: number, rawUnit: string): number | null {
  if (!Number.isFinite(rawValue)) return null;
  const unit = (rawUnit || "").trim().toLowerCase();
  if (metricKey === "weight" || metricKey === "lean_mass") {
    if (unit === "lb" || unit === "lbs") return rawValue * LB_TO_KG;
    if (unit === "g") return rawValue / 1000;
    return rawValue; // kg or unspecified
  }
  if (metricKey === "body_fat_pct") {
    // HealthKit stores body fat as a fraction. Values at or below 1.5 are
    // fractions and scale to 0-100; larger values are already a percentage.
    return rawValue <= 1.5 ? rawValue * 100 : rawValue;
  }
  return rawValue; // bmi
}

function parseAttrs(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([A-Za-z_:][\w:.-]*)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag)) !== null) attrs[m[1]] = m[2];
  return attrs;
}

async function postBatch(
  accessToken: string,
  sourceId: string,
  deviceOrigin: string | null,
  samples: NormalizedSample[],
): Promise<{ ingested: number; deduped: number; rejected: number }> {
  let ingested = 0;
  let deduped = 0;
  let rejected = 0;
  for (let i = 0; i < samples.length; i += BATCH_SIZE) {
    const chunk = samples.slice(i, i + BATCH_SIZE);
    const body: Record<string, unknown> = { sourceId, samples: chunk };
    if (deviceOrigin) body.deviceOrigin = deviceOrigin;
    try {
      const res = await withTimeout(
        fetch(FUNNEL_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(body),
        }),
        20000,
        "funnel-post",
      );
      if (res.ok) {
        const json = await res.json();
        ingested += json?.ingested ?? 0;
        deduped += json?.deduped ?? 0;
        rejected += json?.rejected ?? 0;
      } else {
        safeLog.warn("apple-health-parse", "funnel non-ok", { status: res.status });
      }
    } catch (err) {
      safeLog.warn("apple-health-parse", "funnel batch failed", { error: err });
    }
  }
  return { ingested, deduped, rejected };
}

export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  let importId = "";
  try {
    const authResult = (await withTimeout(supabase.auth.getUser(), 5000, "auth")) as {
      data: { user: { id: string } | null };
    };
    const user = authResult?.data?.user ?? null;
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await request.json();
    importId = String(body?.importId ?? "");
    const storagePath = String(body?.storagePath ?? "");
    if (!importId || !storagePath) {
      return NextResponse.json({ error: "missing importId or storagePath" }, { status: 400 });
    }

    // Verify the import row belongs to the caller (RLS scoped) and mark it parsing.
    const verifyResult = (await withTimeout(
      (supabase as unknown as { from: (t: string) => any }).from("apple_health_imports").select("id").eq("id", importId).maybeSingle(),
      5000,
      "import-verify",
    )) as { data: { id: string } | null };
    if (!verifyResult?.data) return NextResponse.json({ error: "import not found" }, { status: 404 });
    await withTimeout(
      (supabase as unknown as { from: (t: string) => any }).from("apple_health_imports").update({ status: "parsing" }).eq("id", importId),
      5000,
      "import-parsing",
    );

    // Derive the storage path server-side from the authenticated user and import
    // id; the client-supplied storagePath is ignored to prevent any cross-tenant
    // read. Own-folder storage RLS is the second layer.
    const pathInBucket = `${user.id}/${importId}.zip`;
    const { data: blob, error: dlErr } = await withTimeout(
      supabase.storage.from("apple-health-imports").download(pathInBucket),
      30000,
      "storage-download",
    );
    if (dlErr || !blob) {
      await failImport(supabase, importId, "could not download export");
      return NextResponse.json({ status: "error", error: "could not download export" });
    }

    // Stream-unzip and extract records.
    const hume: NormalizedSample[] = [];
    const other: NormalizedSample[] = [];
    let seen = 0;
    let humeCount = 0;
    let minDate: string | null = null;
    let maxDate: string | null = null;

    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    const TAG_RE = /<Record\b[^>]*>/g;

    const handleBuffer = (final: boolean) => {
      TAG_RE.lastIndex = 0;
      let lastEnd = 0;
      let match: RegExpExecArray | null;
      while ((match = TAG_RE.exec(buffer)) !== null) {
        lastEnd = match.index + match[0].length;
        const attrs = parseAttrs(match[0]);
        const map = TYPE_MAP[attrs.type];
        if (!map) continue;
        const rawValue = parseFloat(attrs.value);
        const value = normalizeValue(map.metricKey, rawValue, attrs.unit);
        if (value === null) continue;
        const startDate = attrs.startDate || attrs.creationDate || attrs.endDate;
        if (!startDate) continue;
        const measuredAt = new Date(startDate.replace(" ", "T")).toISOString();
        seen += 1;
        if (!minDate || measuredAt < minDate) minDate = measuredAt;
        if (!maxDate || measuredAt > maxDate) maxDate = measuredAt;
        const isHume = matchesHume(attrs.sourceName);
        const externalId = `${attrs.sourceName || "unknown"}|${startDate}|${attrs.value}`;
        const sample: NormalizedSample = { metricKey: map.metricKey, value, unit: map.unit, measuredAt, externalId };
        if (isHume) {
          hume.push(sample);
          humeCount += 1;
        } else {
          other.push(sample);
        }
      }
      // Keep only the unconsumed tail so the buffer stays small.
      buffer = final ? "" : buffer.slice(lastEnd);
      // Guard against an unbounded buffer if a single tag is enormous.
      if (buffer.length > 1_000_000) buffer = buffer.slice(buffer.length - 4096);
    };

    await new Promise<void>((resolve, reject) => {
      const unzip = new Unzip();
      unzip.register(UnzipInflate);
      const MAX_DECOMPRESSED = 600 * 1024 * 1024; // 600 MB ceiling, guards against a zip bomb
      let totalDecompressed = 0;
      unzip.onfile = (file) => {
        const base = file.name.split("/").pop();
        if (base !== "export.xml") return; // only the main export, never start() other entries
        file.ondata = (err, chunk, final) => {
          if (err) {
            reject(err);
            return;
          }
          totalDecompressed += chunk.length;
          if (totalDecompressed > MAX_DECOMPRESSED) {
            reject(new Error("export exceeds the decompressed size limit"));
            return;
          }
          buffer += decoder.decode(chunk, { stream: !final });
          handleBuffer(final);
          if (final) resolve();
        };
        file.start();
      };

      (async () => {
        try {
          const reader = (blob.stream() as ReadableStream<Uint8Array>).getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) {
              unzip.push(new Uint8Array(0), true);
              break;
            }
            if (value) unzip.push(value, false);
          }
        } catch (e) {
          reject(e);
        }
      })();
    });

    // Resolve the access token for the authenticated funnel call.
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token ?? "";

    const humeResult = await postBatch(accessToken, "apple_health", HUME_DEVICE_ORIGIN, hume);
    const otherResult = await postBatch(accessToken, "apple_health", null, other);
    const ingested = humeResult.ingested + otherResult.ingested;
    const deduped = humeResult.deduped + otherResult.deduped;

    const summary = {
      status: "complete",
      records_seen: seen,
      records_ingested: ingested,
      records_deduped: deduped,
      records_attributed_hume: humeCount,
      date_range_start: minDate,
      date_range_end: maxDate,
    };
    await withTimeout(
      (supabase as unknown as { from: (t: string) => any }).from("apple_health_imports").update(summary).eq("id", importId),
      5000,
      "import-complete",
    );

    safeLog.info("apple-health-parse", "import complete", { user_id: user.id, ...summary });
    return NextResponse.json(summary);
  } catch (err) {
    safeLog.error("apple-health-parse", "import failed", { error: err, import_id: importId });
    if (importId) await failImport(supabase, importId, "parse failed");
    // Fail open with a structured result rather than throwing.
    return NextResponse.json({ status: "error", error: "parse failed" });
  }
}

async function failImport(
  supabase: ReturnType<typeof createClient>,
  importId: string,
  message: string,
): Promise<void> {
  try {
    await withTimeout(
      (supabase as unknown as { from: (t: string) => any }).from("apple_health_imports").update({ status: "error", error: message }).eq("id", importId),
      5000,
      "import-error",
    );
  } catch {
    // best effort
  }
}
