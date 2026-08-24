// Phase 1 ultrathink feed dispatch (pubmed, clinicaltrials_gov, openfda).
// Observed 2026-08-24: pg_cron ultrathink_orchestrator_cron is missing in
// production and vercel.json had no orchestrator path. Hannah research
// (/api/cron/hannah-research) is a different job.
//
// Auth: Bearer CRON_SECRET. Vercel cron uses GET; pg_cron
// invoke_viaconnect_bearer_cron uses POST. Both land here.

import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { dispatchPhase1Feeds } from "@/lib/ultrathink/feeds/dispatchPhase1";
import { createSupabasePhase1Store } from "@/lib/ultrathink/feeds/store";
import { safeLog } from "@/lib/utils/safe-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

async function handlePhase1Tick(): Promise<Response> {
  try {
    const result = await dispatchPhase1Feeds({
      store: createSupabasePhase1Store(),
    });
    return Response.json({ ok: result.ok, result }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    safeLog.error("cron.ultrathink-feeds", "tick threw", { error });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}

export async function GET(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  return handlePhase1Tick();
}

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  return handlePhase1Tick();
}
