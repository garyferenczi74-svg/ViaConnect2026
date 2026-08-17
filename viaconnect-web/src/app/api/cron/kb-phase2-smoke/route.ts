/**
 * Prompt 221 Phase 2: allowlist + collection status smoke (Bearer CRON_SECRET).
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadApprovedCompetitiveSources } from "@/lib/kb/competitiveAllowlist";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const sources = await loadApprovedCompetitiveSources();
  const byKind: Record<string, number> = {};
  for (const s of sources) {
    byKind[s.source_kind] = (byKind[s.source_kind] ?? 0) + 1;
  }

  const { data: collections } = await admin
    .from("kb_collections")
    .select("slug, status, seeding_phase")
    .in("slug", ["competitive_supplements", "genetic_tests"]);

  const { count: competitiveItems } = await admin
    .from("kb_items")
    .select("id", { count: "exact", head: true })
    .eq("payload_type", "product")
    .eq("jeffery_verdict", "approved");

  const { count: geneticItems } = await admin
    .from("kb_items")
    .select("id", { count: "exact", head: true })
    .eq("payload_type", "genetic_test")
    .eq("jeffery_verdict", "approved");

  const { count: stagedCompetitive } = await admin
    .from("hounddog_staging_items")
    .select("id", { count: "exact", head: true })
    .eq("source_type", "competitive_product");

  const { count: stagedGenetic } = await admin
    .from("hounddog_staging_items")
    .select("id", { count: "exact", head: true })
    .eq("source_type", "genetic_test");

  const allowlistOk = sources.length >= 20;
  return Response.json({
    ok: allowlistOk,
    allowlistCount: sources.length,
    byKind,
    sampleDomains: sources.slice(0, 8).map((s) => s.domain),
    phase2Collections: collections ?? [],
    competitiveItemsApproved: competitiveItems ?? 0,
    geneticItemsApproved: geneticItems ?? 0,
    stagedCompetitive: stagedCompetitive ?? 0,
    stagedGenetic: stagedGenetic ?? 0,
  });
}
