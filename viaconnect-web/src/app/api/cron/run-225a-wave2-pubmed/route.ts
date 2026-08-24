/**
 * Prompt 225a Wave 2: chunked PubMed facts-only ingest beyond Wave 1.
 * Query: ?offset=0&limit=10  Bearer CRON_SECRET.
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { ingestPubmedWave1 } from "@/lib/thanos/ingestPubmedWave1";
import { loadWave2Compounds } from "@/lib/thanos/wave2Compounds";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function parseIntParam(url: URL, key: string, fallback: number): number {
  const raw = url.searchParams.get(key);
  if (raw == null || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const offset = parseIntParam(url, "offset", 0);
    const limit = parseIntParam(url, "limit", 10);
    const batch = await loadWave2Compounds({ offset, limit });

    const result = await ingestPubmedWave1({
      maxPerCompound: 3,
      compounds: batch.compounds,
    });

    const admin = createAdminClient();
    const { count: pubCount } = await admin
      .from("kb_publications")
      .select("id", { count: "exact", head: true });
    const { count: redactedCount } = await admin
      .from("kb_publications")
      .select("id", { count: "exact", head: true })
      .eq("dose_redaction_applied", true);

    return Response.json(
      {
        ok: result.ok,
        prompt: "225a",
        phase: "wave2-pubmed",
        batch: {
          offset: batch.offset,
          limit: batch.limit,
          totalEligible: batch.totalEligible,
          nextOffset: batch.nextOffset,
          slugs: batch.compounds.map((c) => c.slug),
        },
        ingest: result,
        counts: {
          kbPublications: pubCount ?? 0,
          doseRedactedPublications: redactedCount ?? 0,
        },
        factsHaveAbstractBody: false,
        proofNotes: [
          "Wave 2 excludes Wave 1 flagship slugs.",
          "Facts-only paraphrase; abstracts discarded.",
          "Shared NCBI token bucket; paginate with ?offset=&limit=.",
        ],
      },
      { status: 200 },
    );
  } catch (err) {
    safeLog.error("cron.run-225a-wave2-pubmed", "threw", { error: err });
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 200 },
    );
  }
}

export async function GET(request: Request): Promise<Response> {
  return POST(request);
}
