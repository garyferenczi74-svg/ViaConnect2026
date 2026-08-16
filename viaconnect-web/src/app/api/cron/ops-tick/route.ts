// Prompt 219H: continuous ops tick (every 15 minutes).
// Auth: Bearer CRON_SECRET. Fail-open 200 on partial failures.

import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { runOpsTick } from "@/lib/jeffery/ops/tick";
import { safeLog } from "@/lib/utils/safe-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await runOpsTick();
    return Response.json({ ok: true, result }, { status: 200 });
  } catch (err) {
    safeLog.error("cron.ops-tick", "threw", { error: err });
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 200 }
    );
  }
}
