/**
 * Elizabeth research assistant cron (reports to Hannah).
 * Helps accelerate Hannah research freshness; no consumer dosing.
 * Bearer CRON_SECRET.
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!isCronAuthorized(req.headers.get("authorization"))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const runDate = new Date().toISOString().slice(0, 10);
  const runId = `elizabeth-research-${runDate}-${crypto.randomUUID().slice(0, 8)}`;

  try {
    const admin = createAdminClient();

    await admin
      .from("ultrathink_agent_registry")
      .update({
        last_heartbeat_at: new Date().toISOString(),
        health_status: "healthy",
        consecutive_misses: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("agent_name", "elizabeth");

    // Light assist: record a research-assist heartbeat for Hannah's lane.
    // Full domain research remains on /api/cron/hannah-research; Elizabeth
    // does not invent atoms here (avoids duplicate writes). Follow-up can
    // fan out parallel domain passes.
    await admin.from("pipeline_runs").insert({
      run_id: runId,
      run_date: runDate,
      status: "ok",
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      stages: {
        agent: "elizabeth",
        reports_to: "hannah",
        jeffery_lane: "research",
        mode: "assist_heartbeat",
        note: "Elizabeth authorized; Wave2 peptide evidence rotation owned by Thanos/Hermes path.",
      },
    });

    await admin
      .from("agent_cadence_jobs")
      .update({
        last_run_at: new Date().toISOString(),
        last_status: "ok",
        updated_at: new Date().toISOString(),
      })
      .eq("job_key", "elizabeth.research");

    return Response.json({
      ok: true,
      agent: "elizabeth",
      runId,
      reportsTo: "hannah",
      jefferyLane: "research",
      heartbeatAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error("elizabeth.research", "tick failed", { error: message, runId });
    return Response.json({ ok: false, error: message, runId }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
