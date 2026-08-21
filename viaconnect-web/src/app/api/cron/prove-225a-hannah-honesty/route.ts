/**
 * Prompt 225a: prove Hannah honesty context loads stored counts + ICTRP disclosure.
 * Does not call the model. Fail-closed on dose-like leakage.
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import {
  PEPTIDE_HONESTY_MARKER,
  buildPeptideHonestyContext,
  matchWave1Slugs,
} from "@/lib/hannah/peptideHonestyContext";
import { safeLog } from "@/lib/utils/safe-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const PROBE =
  "What is known about BPC-157 research and human clinical evidence?";

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const matched = matchWave1Slugs(PROBE);
    const block = await buildPeptideHonestyContext(PROBE);
    const hasMarker = block.includes(PEPTIDE_HONESTY_MARKER);
    const hasIctrp = /ICTRP source_status=pending_access/i.test(block);
    const hasGap = /evidence_gap_statement/i.test(block);
    const doseLeak = /\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|iu)\b/i.test(block);

    return Response.json(
      {
        ok: hasMarker && hasIctrp && hasGap && !doseLeak && block.length > 0,
        prompt: "225a",
        phase: "hannah-honesty-retrieval",
        probe: PROBE,
        matchedSlugs: matched,
        blockLength: block.length,
        hasMarker,
        hasIctrpPending: hasIctrp,
        hasEvidenceGapStatement: hasGap,
        doseLeakBlocked: !doseLeak,
        sample: block.slice(0, 1200),
        proofNotes: [
          "Honesty block is built from kb_peptides.honesty_layer + kb_ingest_source_status.",
          "No model call. No trial dose amounts.",
          "Ask route appends this block into kbContextBlock after kbSearch.",
        ],
      },
      { status: 200 },
    );
  } catch (err) {
    safeLog.error("cron.prove-225a-hannah-honesty", "threw", { error: err });
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
