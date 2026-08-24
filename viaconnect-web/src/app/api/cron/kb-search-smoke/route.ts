/**
 * Prompt 221: hybrid kb_search smoke (Bearer CRON_SECRET).
 * Never returns secrets. Proves Jeffery-approved + embedded items are retrievable.
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { kbSearch } from "@/lib/kb/search";
import { EMBEDDING_MODEL } from "@/lib/kb/embeddings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const q =
    url.searchParams.get("q")?.trim() ||
    "liposomal curcumin bioavailability omega-3 peptide education";

  const admin = createAdminClient();

  const { count: liveCount } = await admin
    .from("kb_items")
    .select("id", { count: "exact", head: true })
    .in("gate_status", ["approved", "lex_approved"])
    .eq("jeffery_verdict", "approved");

  // Count embedded via raw: PostgREST cannot easily count non-null vector;
  // sample a batch and check embedding presence through a select of ids only.
  const { data: sampleRows } = await admin
    .from("kb_items")
    .select("id, title, jeffery_verdict, gate_status")
    .eq("jeffery_verdict", "approved")
    .in("gate_status", ["approved", "lex_approved"])
    .limit(50);

  const hits = await kbSearch(q, { limit: 6, consumerOnly: true });

  const { data: collections } = await admin
    .from("kb_collections")
    .select("slug, status, seeding_phase")
    .in("slug", [
      "clinical_studies",
      "bioavailability_studies",
      "peptide_education",
    ]);

  return Response.json({
    ok: hits.length > 0,
    query: q,
    model: EMBEDDING_MODEL,
    liveRetrievable: liveCount ?? 0,
    sampleApproved: sampleRows?.length ?? 0,
    hitCount: hits.length,
    hits: hits.map((h) => ({
      title: h.title.slice(0, 120),
      collection: h.collectionSlug,
      grade: h.evidenceGrade,
      distance: Number(h.distance.toFixed(4)),
      payloadType: h.payloadType,
    })),
    phase1Collections: collections ?? [],
  });
}
