/**
 * Hermes peptide scout cron (weekday 8am Edmonton / 14:00 UTC Mon-Fri).
 * Jeffery-authorized research scout; reports to Thanos.
 * Bearer CRON_SECRET. Educational / allowlist scout only.
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

type ScoutResult = {
  ok: boolean;
  agent: "hermes";
  runId: string;
  reportsTo: "thanos";
  jefferyLane: "research";
  authorizedPriorRun: string;
  heartbeatAt: string;
  note: string;
  error?: string;
};

export async function POST(req: Request) {
  if (!isCronAuthorized(req.headers.get("authorization"))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const runDate = new Date().toISOString().slice(0, 10);
  const runId = `hermes-scout-${runDate}-${crypto.randomUUID().slice(0, 8)}`;
  const result: ScoutResult = {
    ok: true,
    agent: "hermes",
    runId,
    reportsTo: "thanos",
    jefferyLane: "research",
    authorizedPriorRun: "hermes-scout-2026-08-22",
    heartbeatAt: new Date().toISOString(),
    note:
      "Jeffery-authorized Hermes weekday scout tick. First scout hermes-scout-2026-08-22 accepted. Full discovery loop lands in a follow-up; this path heartbeats and records the cadence run.",
  };

  try {
    const admin = createAdminClient();

    await admin.from("ultrathink_agent_registry").update({
      last_heartbeat_at: new Date().toISOString(),
      health_status: "healthy",
      consecutive_misses: 0,
      updated_at: new Date().toISOString(),
    }).eq("agent_name", "hermes");

    await admin.from("pipeline_runs").insert({
      run_id: runId,
      run_date: runDate,
      status: "ok",
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      stages: {
        agent: "hermes",
        reports_to: "thanos",
        jeffery_lane: "research",
        mode: "cadence_heartbeat",
        authorized_prior_run: "hermes-scout-2026-08-22",
      },
    });

    await admin
      .from("agent_cadence_jobs")
      .update({
        last_run_at: new Date().toISOString(),
        last_status: "ok",
        updated_at: new Date().toISOString(),
      })
      .eq("job_key", "hermes.scout");

    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error("hermes.scout", "tick failed", { error: message, runId });
    return Response.json(
      { ...result, ok: false, error: message },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return POST(req);
}
