/**
 * Prompt 225a Wave 1: ClinicalTrials.gov ingest with dose redaction.
 * Bearer CRON_SECRET. Never returns secrets.
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { ingestCtgovWave1 } from "@/lib/thanos/ingestCtgovWave1";
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
    const result = await ingestCtgovWave1({
      pageSize: 25,
      maxPerCompound: 4,
    });

    const admin = createAdminClient();
    const { count: trialCount } = await admin
      .from("kb_trials")
      .select("id", { count: "exact", head: true });
    const { count: redactedCount } = await admin
      .from("kb_trials")
      .select("id", { count: "exact", head: true })
      .eq("dose_redaction_applied", true);
    const { count: linkCount } = await admin
      .from("kb_peptide_evidence_links")
      .select("id", { count: "exact", head: true })
      .not("trial_id", "is", null);
    const { data: ictrp } = await admin
      .from("kb_ingest_source_status")
      .select("source_system, status, coverage_note")
      .eq("source_system", "ictrp")
      .maybeSingle();

    return Response.json(
      {
        ok: result.ok,
        prompt: "225a",
        phase: "wave1-ctgov",
        ingest: result,
        counts: {
          kbTrials: trialCount ?? 0,
          doseRedactedTrials: redactedCount ?? 0,
          trialEvidenceLinks: linkCount ?? 0,
        },
        ictrpStatus: ictrp,
        proofNotes: [
          "Dose values must not survive in kb_trials text fields.",
          "semaglutideRedactionProof shows before/after on a real CT.gov record.",
          "ICTRP remains pending_access until WHO credentials (G10).",
        ],
      },
      { status: 200 },
    );
  } catch (err) {
    safeLog.error("cron.run-225a-wave1-ctgov", "threw", { error: err });
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
