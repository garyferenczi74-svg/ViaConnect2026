/**
 * One-shot / manual trigger: apply Prompt 219H continuous-ops SQL.
 * Auth: Bearer CRON_SECRET (same as other cron routes).
 * Safe to call repeatedly (CREATE IF NOT EXISTS + ON CONFLICT seeds).
 */

import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { ensureContinuousOpsSchema } from "@/lib/jeffery/ops/ensureSchema";
import { safeLog } from "@/lib/utils/safe-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const result = await ensureContinuousOpsSchema();
    safeLog.info("api.admin.migrate-219h", "result", result);
    return Response.json({ ok: result.ok, ...result }, { status: 200 });
  } catch (err) {
    safeLog.error("api.admin.migrate-219h", "threw", { error: err });
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 200 }
    );
  }
}

export async function GET(request: Request): Promise<Response> {
  return POST(request);
}
