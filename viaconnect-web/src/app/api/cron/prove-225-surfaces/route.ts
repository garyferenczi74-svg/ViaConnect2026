/**
 * Prompt 225: surface data proof for auth-gated peptide UI.
 * Bearer CRON_SECRET. Proves consumer_safe WADA chip candidates and
 * no numeric dose strings in consumer-visible fields.
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const NUMERIC_DOSE = /\b\d+(?:\.\d+)?\s?(mg|mcg|µg|ug|iu|ml)\b/i;

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const admin = createAdminClient();

    const { data: consumerRows, error } = await admin
      .from("kb_peptides")
      .select(
        "slug, display_name, wada_status, exclusion_tier, consumer_safe, mechanism_summary, misconception_notes, category",
      )
      .eq("consumer_safe", true)
      .eq("exclusion_tier", "educational")
      .order("display_name", { ascending: true })
      .limit(500);

    if (error) {
      return Response.json(
        { ok: false, error: error.message },
        { status: 200 },
      );
    }

    const rows = consumerRows ?? [];
    const wadaChipCandidates = rows.filter(
      (r) =>
        r.wada_status &&
        r.wada_status !== "unknown" &&
        r.wada_status !== "not_prohibited",
    );
    const doseFieldHits = rows
      .map((r) => {
        const blob = `${r.mechanism_summary ?? ""}\n${r.misconception_notes ?? ""}`;
        const m = blob.match(NUMERIC_DOSE);
        return m
          ? { slug: r.slug, hit: m[0], fieldSample: blob.slice(0, 120) }
          : null;
      })
      .filter(Boolean);

    const ok =
      rows.length > 0 &&
      wadaChipCandidates.length > 0 &&
      doseFieldHits.length === 0;

    return Response.json(
      {
        ok,
        prompt: "225",
        phase: "surface-data-proof",
        consumerSafeEducationalCount: rows.length,
        wadaChipCandidateCount: wadaChipCandidates.length,
        wadaChipSample: wadaChipCandidates.slice(0, 12).map((r) => ({
          slug: r.slug,
          displayName: r.display_name,
          wadaStatus: r.wada_status,
          category: r.category,
        })),
        numericDoseHitsInConsumerFields: doseFieldHits,
        g1Note: "G1 shop routes redirect to /peptide-protocol",
        uiNote:
          "KbPeptideCatalogSection renders WADA chip when wadaStatus is not unknown/not_prohibited. Production /peptide-protocol is auth-gated; browser smoke captures login redirect chain.",
      },
      { status: 200 },
    );
  } catch (err) {
    safeLog.error("cron.prove-225-surfaces", "threw", { error: err });
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
