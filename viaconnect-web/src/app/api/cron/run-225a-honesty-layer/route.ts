/**
 * Prompt 225a: refresh honesty_layer on peptides with evidence links.
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { refreshHonestyLayerAll } from "@/lib/thanos/computeHonestyLayer";
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
    const result = await refreshHonestyLayerAll({ limit: 300 });
    const admin = createAdminClient();

    const { data: thin } = await admin
      .from("kb_peptides")
      .select("slug, honesty_layer")
      .contains("honesty_layer", { trials_registered: 0, publications_human: 0 })
      .limit(5);

    const { count: withStatement } = await admin
      .from("kb_peptides")
      .select("id", { count: "exact", head: true })
      .not("honesty_layer->>evidence_gap_statement", "is", null)
      .neq("honesty_layer->>evidence_gap_statement", "");

    return Response.json(
      {
        ok: result.ok,
        prompt: "225a",
        phase: "honesty-layer",
        updated: result.updated,
        peptidesWithGapStatement: withStatement ?? 0,
        zeroHumanExamples:
          result.zeroHumanExamples.length > 0
            ? result.zeroHumanExamples
            : (thin ?? []).map((r) => ({
                slug: r.slug,
                statement:
                  (r.honesty_layer as { evidence_gap_statement?: string })
                    ?.evidence_gap_statement ?? "",
              })),
        errors: result.errors,
        canonicalFraming:
          "Registration is not completion. Completion is not publication. Publication is not a positive result.",
      },
      { status: 200 },
    );
  } catch (err) {
    safeLog.error("cron.run-225a-honesty-layer", "threw", { error: err });
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
