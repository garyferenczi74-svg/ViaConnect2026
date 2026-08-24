/**
 * Prompt 219L: admin "Run now" enqueues that agent's primary cadence job immediately.
 */
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { isKnownAgentId } from "@/lib/agents/registry";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { loadCadenceJobs } from "@/lib/jeffery/ops/cadence";
import { runCadenceJob } from "@/lib/jeffery/ops/jobRunners";
import { loadPausedAgentIds } from "@/lib/jeffery/ops/heartbeats";
import type { AgentId } from "@/lib/agents/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Primary job_key preference per ACC agent for Run now. */
const PRIMARY_JOB: Partial<Record<AgentId, string>> = {
  hounddog: "hounddog.pubmed",
  marshall: "marshall.gate",
  sherlock: "sherlock.curate",
  hannah: "hannah.light_freshness",
  jeffery: "digest.rollup",
  elysium: "elysium.allowlist",
  thanos: "thanos.allowlist",
  hermes: "hermes.scout",
  elizabeth: "elizabeth.research",
  arnold: "digest.rollup",
  michelangelo: "product.freshness",
  lex: "marshall.gate",
};

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    if (!isKnownAgentId(id)) {
      return NextResponse.json({ error: "Unknown agent" }, { status: 400 });
    }

    const userClient = await createServerClient();
    const {
      data: { user },
    } = await withTimeout(
      userClient.auth.getUser(),
      5000,
      "api.agents.run-now.auth"
    );
    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const profileRes = await withTimeout(
      (async () =>
        userClient
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle())(),
      5000,
      "api.agents.run-now.profile"
    );
    const role = (profileRes.data as { role?: string } | null)?.role;
    if (role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const paused = await loadPausedAgentIds();
    if (paused.has(id)) {
      return NextResponse.json(
        { ok: false, error: "agent_paused", agentId: id },
        { status: 409 }
      );
    }

    const jobs = await loadCadenceJobs();
    const preferred = PRIMARY_JOB[id as AgentId];
    const job =
      (preferred ? jobs.find((j) => j.job_key === preferred) : undefined) ??
      jobs.find((j) => j.agent_id === id && j.enabled);

    if (!job) {
      return NextResponse.json(
        { ok: false, error: "no_cadence_job", agentId: id },
        { status: 404 }
      );
    }

    const result = await runCadenceJob(job, { force: true });
    safeLog.info("api.agents.run-now", "complete", {
      agentId: id,
      jobKey: job.job_key,
      status: result.status,
    });

    return NextResponse.json({
      ok: true,
      agentId: id,
      jobKey: job.job_key,
      result,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      return NextResponse.json(
        { error: "Database operation timed out." },
        { status: 503 }
      );
    }
    safeLog.error("api.agents.run-now", "unexpected", { id, error: err });
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
