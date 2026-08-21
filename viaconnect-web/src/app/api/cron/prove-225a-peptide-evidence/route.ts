/**
 * Prompt 225a: prove admin peptide evidence dashboard loader (no UI auth).
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { loadPeptideEvidenceDashboard } from "@/lib/admin/peptideEvidence";
import { safeLog } from "@/lib/utils/safe-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const dash = await loadPeptideEvidenceDashboard({ limit: 12 });
    const hasIctrp = dash.sourceStatus.some(
      (s) => s.sourceSystem === "ictrp" && s.status === "pending_access",
    );
    const sample = dash.tiles.slice(0, 3).map((t) => ({
      slug: t.slug,
      trialsLinked: t.trialsLinked,
      publicationsLinked: t.publicationsLinked,
      trialsRegistered: t.trialsRegistered,
      publicationsHuman: t.publicationsHuman,
      hasGap: Boolean(t.evidenceGapStatement),
    }));
    const doseLeak = JSON.stringify(dash).match(
      /\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|iu)\b/i,
    );

    return Response.json(
      {
        ok:
          dash.tiles.length > 0 &&
          hasIctrp &&
          !doseLeak &&
          dash.totals.kbTrials >= 0,
        prompt: "225a",
        phase: "admin-peptide-evidence",
        totals: dash.totals,
        sourceStatus: dash.sourceStatus.map((s) => ({
          sourceSystem: s.sourceSystem,
          status: s.status,
        })),
        tileCount: dash.tiles.length,
        sample,
        doseLeakBlocked: !doseLeak,
        canonicalFraming: dash.canonicalFraming,
        uiPath: "/admin/peptide-evidence",
      },
      { status: 200 },
    );
  } catch (err) {
    safeLog.error("cron.prove-225a-peptide-evidence", "threw", { error: err });
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
