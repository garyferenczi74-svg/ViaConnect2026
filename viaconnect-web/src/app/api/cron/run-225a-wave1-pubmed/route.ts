/**
 * Prompt 225a Wave 1: PubMed facts-only ingest (Bearer CRON_SECRET).
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { ingestPubmedWave1 } from "@/lib/thanos/ingestPubmedWave1";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await ingestPubmedWave1({
      maxPerCompound: 4,
      mindate: "2018/01/01",
    });

    const admin = createAdminClient();
    const { count: pubCount } = await admin
      .from("kb_publications")
      .select("id", { count: "exact", head: true });
    const { count: redactedCount } = await admin
      .from("kb_publications")
      .select("id", { count: "exact", head: true })
      .eq("dose_redaction_applied", true);
    const { data: sample } = await admin
      .from("kb_publications")
      .select("pmid, title, facts_extracted, dose_redaction_applied, abstract_available")
      .order("ingested_at", { ascending: false })
      .limit(5);

    // Prove no abstract body column leakage in facts
    const factsHaveAbstractBody = (sample ?? []).some((row) => {
      const f = row.facts_extracted as Record<string, unknown> | null;
      if (!f) return false;
      const blob = JSON.stringify(f).toLowerCase();
      return blob.includes('"abstract"') && blob.length > 800;
    });

    return Response.json(
      {
        ok: result.ok && !factsHaveAbstractBody,
        prompt: "225a",
        phase: "wave1-pubmed",
        ingest: result,
        counts: {
          kbPublications: pubCount ?? 0,
          doseRedactedPublications: redactedCount ?? 0,
        },
        sample: (sample ?? []).map((r) => ({
          pmid: r.pmid,
          title: String(r.title ?? "").slice(0, 100),
          doseRedactionApplied: r.dose_redaction_applied,
          abstractAvailable: r.abstract_available,
          factsKeys: r.facts_extracted
            ? Object.keys(r.facts_extracted as object)
            : [],
        })),
        factsHaveAbstractBody,
        proofNotes: [
          "Abstracts are used transiently for fact extraction then discarded.",
          "facts_extracted holds paraphrased educational fields only.",
          "Shared NCBI token bucket governs E-utilities rate.",
        ],
      },
      { status: 200 },
    );
  } catch (err) {
    safeLog.error("cron.run-225a-wave1-pubmed", "threw", { error: err });
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
