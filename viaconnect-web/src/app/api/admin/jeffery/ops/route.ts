/**
 * GET  /api/admin/jeffery/ops — continuous ops dashboard payload
 * POST /api/admin/jeffery/ops — admin drills (watchdog, event, coalesce, budget)
 */

import { createClient } from "@/lib/supabase/server";
import { loadCadenceJobs } from "@/lib/jeffery/ops/cadence";
import { fetchOpsJobRuns } from "@/lib/jeffery/ops/logJobRun";
import { listOpenDeadLetters, runWatchdog, writeDeadLetter } from "@/lib/jeffery/ops/watchdog";
import { measureFreshness } from "@/lib/jeffery/ops/freshness";
import { listQueuedBacklog, projectDailyBudgetConsumption } from "@/lib/jeffery/ops/budgetQueue";
import { emitPlatformEvent, processPendingEvents } from "@/lib/jeffery/ops/eventBus";
import { runOpsTick } from "@/lib/jeffery/ops/tick";
import { snapshotBudgets } from "@/lib/jeffery/capabilities/budgets";
import { DEFAULT_CADENCE_SEED, HANNAH_LIGHT_PASS_TOUCHES, HANNAH_FULL_COMPILE_TOUCHES } from "@/lib/jeffery/ops/types";
import { safeLog } from "@/lib/utils/safe-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function requireAdmin(): Promise<
  { user: { id: string } } | { error: Response }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ error: "unauthenticated" }, { status: 401 }) };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") {
    return { error: Response.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { user: { id: user.id } };
}

export async function GET() {
  try {
    const gate = await requireAdmin();
    if ("error" in gate) return gate.error;

    const { listDiscoveryCursors, cursorFreshnessStatus } = await import(
      "@/lib/jeffery/ops/discoveryCursors"
    );
    const [cadence, runs, deadLetters, freshness, backlog, discoveryCursors] =
      await Promise.all([
        loadCadenceJobs(),
        fetchOpsJobRuns(60),
        listOpenDeadLetters(20),
        measureFreshness(),
        listQueuedBacklog(30),
        listDiscoveryCursors(),
      ]);

    const expectedMinutes: Record<string, number> = {
      pubmed: 360,
      firecrawl_social: 360,
      elysium_allowlist: 720,
      thanos_allowlist: 720,
      genomes_igsr: 10080,
    };

    return Response.json({
      cadence,
      defaults: DEFAULT_CADENCE_SEED,
      recentRuns: runs,
      deadLetters,
      freshness,
      backlog,
      discoveryCursors: discoveryCursors.map((c) => ({
        ...c,
        freshness: cursorFreshnessStatus(
          c.last_run_at,
          expectedMinutes[c.source_key] ?? 360
        ),
        expectedMinutes: expectedMinutes[c.source_key] ?? 360,
      })),
      budgets: snapshotBudgets(),
      budgetProjection: projectDailyBudgetConsumption(),
      hannahLightTouches: HANNAH_LIGHT_PASS_TOUCHES,
      hannahFullTouches: HANNAH_FULL_COMPILE_TOUCHES,
      mechanisms: {
        "hounddog.discovery": "pg_cron invoke_ops_tick every 15m + 6h discovery window; due when interval elapsed",
        "hounddog.pubmed": "pg_cron ops-tick; cursor-forward PubMed",
        "hounddog.social": "pg_cron ops-tick; cursor-forward social",
        "marshall.gate": "hybrid: platform_events staging_landed + pg_cron every 15m (SLA 30m)",
        "sherlock.curate": "hybrid: content_gated event + 12h sweep via ops-tick",
        "digest.rollup": "pg_cron ops-tick hourly + meal/scan events",
        "hannah.light_freshness": "pg_cron ops-tick every 4h; meal events touch recency only",
        "hannah.full_compose": "vercel_cron synchronism-daily Compose stage",
        "elysium.allowlist": "pg_cron ops-tick 12h",
        "thanos.allowlist": "pg_cron ops-tick 12h",
        "watchdog.tick": "pg_cron ops-tick every 15m",
        "security.daily": "vercel_cron / hybrid daily",
        "performance.daily": "vercel_cron / hybrid daily",
        "product.freshness": "hybrid event + 12h tick",
      },
    });
  } catch (err) {
    safeLog.error("api.admin.jeffery.ops", "GET failed", { error: err });
    return Response.json({ error: "failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requireAdmin();
    if ("error" in gate) return gate.error;
    const adminUserId = gate.user.id;

    let body: {
      mode?: string;
      userId?: string;
      forceSecondFailure?: boolean;
    };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "invalid_json" }, { status: 400 });
    }

    if (body.mode === "tick") {
      const result = await runOpsTick();
      return Response.json({ ok: true, result });
    }

    if (body.mode === "emit_meal") {
      const userId = body.userId ?? adminUserId;
      const e = await emitPlatformEvent({
        eventType: "meal_logged",
        userId,
        payload: { source: "admin_drill", at: new Date().toISOString() },
        coalesceKey: `meal_logged:${userId}`,
      });
      const processed = await processPendingEvents();
      return Response.json({ ok: true, emit: e, processed });
    }

    if (body.mode === "coalesce_test") {
      const userId = body.userId ?? adminUserId;
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(
          await emitPlatformEvent({
            eventType: "meal_logged",
            userId,
            payload: { burst: i },
            eventId: `coalesce-test-${userId}-${Date.now()}-${i}`,
            coalesceKey: `meal_logged:${userId}`,
          })
        );
      }
      const coalesced = results.filter((r) => r.coalesced).length;
      const processed = await processPendingEvents();
      return Response.json({
        ok: true,
        emitted: results.length,
        coalesced,
        pendingProcessed: processed.processed,
        pass: coalesced >= 9 && processed.processed <= 2,
      });
    }

    if (body.mode === "watchdog_drill") {
      // Simulate missed job by writing dead letter + optional second failure
      await writeDeadLetter(
        { job_key: "hounddog.discovery", agent_id: "hounddog" },
        body.forceSecondFailure ? "retry_exhausted" : "error",
        { drill: true, at: new Date().toISOString() }
      );
      if (body.forceSecondFailure) {
        await writeDeadLetter(
          { job_key: "hounddog.discovery", agent_id: "hounddog" },
          "retry_exhausted",
          { drill: true, second: true }
        );
      }
      const wd = await runWatchdog();
      const dead = await listOpenDeadLetters(10);
      return Response.json({ ok: true, watchdog: wd, deadLetters: dead });
    }

    if (body.mode === "budget_projection") {
      return Response.json({ ok: true, projection: projectDailyBudgetConsumption() });
    }

    return Response.json({ error: "invalid_mode" }, { status: 400 });
  } catch (err) {
    safeLog.error("api.admin.jeffery.ops", "POST failed", { error: err });
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
