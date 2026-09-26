/**
 * Manual, CRON_SECRET-gated presence check for Prompt 219H tables.
 * Does not apply DDL and does not register pg_cron jobs.
 * Schema ownership is supabase/migrations. Nothing calls this route automatically.
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
    return Response.json(result, { status: 200 });
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
