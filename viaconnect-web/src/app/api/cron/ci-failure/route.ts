// Prompt 219k: single CI failure surface into continuous ops (platform_events).
// Auth: Bearer CRON_SECRET. Coalesce key keeps one alert per workflow per window.

import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { emitPlatformEvent } from "@/lib/jeffery/ops/eventBus";
import { writeAgentJobHeartbeat } from "@/lib/jeffery/ops/heartbeats";
import { safeLog } from "@/lib/utils/safe-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: {
    workflow?: string;
    runId?: string;
    runUrl?: string;
    headSha?: string;
    conclusion?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const workflow = (body.workflow ?? "unknown").slice(0, 120);
  const runId = (body.runId ?? "").slice(0, 64);
  const coalesceKey = `ci_failure:${workflow}`;

  try {
    const emitted = await emitPlatformEvent({
      eventType: "ci_failure",
      payload: {
        workflow,
        runId,
        runUrl: body.runUrl ?? null,
        headSha: body.headSha ?? null,
        conclusion: body.conclusion ?? "failure",
        message: `CI failed: ${workflow}`,
      },
      coalesceKey,
      eventId: runId ? `ci-${workflow}-${runId}` : undefined,
    });

    await writeAgentJobHeartbeat({
      agentId: "jeffery",
      eventType: "error",
      jobKey: "ci.failure",
      runId: runId || undefined,
      status: "failed",
      severity: "warning",
      detail: {
        workflow,
        runId,
        runUrl: body.runUrl ?? null,
        coalesced: emitted.coalesced ?? false,
      },
    });

    return Response.json({
      ok: true,
      accepted: emitted.accepted,
      coalesced: emitted.coalesced ?? false,
      eventId: emitted.eventId,
    });
  } catch (err) {
    safeLog.error("cron.ci-failure", "threw", { error: err });
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 200 }
    );
  }
}
