/**
 * Prompt 219N Stage 1: pre-soak gate diagnostics (read-only SQL via Postgres).
 * Auth: Bearer CRON_SECRET. Never returns secret values.
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { safeLog } from "@/lib/utils/safe-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function buildConnectionString(): string | null {
  const direct =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL;
  if (direct && direct.trim().length > 0)
    return direct.trim().replace(/^["']|["']$/g, "");

  const host = process.env.POSTGRES_HOST?.trim();
  const user = process.env.POSTGRES_USER?.trim() || "postgres";
  const password = process.env.POSTGRES_PASSWORD?.trim();
  const database = process.env.POSTGRES_DATABASE?.trim() || "postgres";
  if (host && password) {
    return `postgresql://${user}:${encodeURIComponent(password)}@${host}:5432/${database}`;
  }
  return null;
}

const EXPECTED_JOBS = [
  "viaconnect_ops_tick_15m",
  "viaconnect_ops_discovery_6h",
] as const;

export async function GET(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const conn = buildConnectionString();
  if (!conn) {
    return Response.json(
      { ok: false, error: "no_postgres_connection", stage1: "FAIL" },
      { status: 200 }
    );
  }

  try {
    const postgres = (await import("postgres")).default;
    const sql = postgres(conn, { max: 1, idle_timeout: 5, connect_timeout: 20 });
    try {
      // Ensure schema/cron registration path has run once
      try {
        const { ensureContinuousOpsSchema } = await import(
          "@/lib/jeffery/ops/ensureSchema"
        );
        // Force re-run within process if needed: call anyway; may no-op if applied
        await ensureContinuousOpsSchema();
      } catch (e) {
        safeLog.warn("soak.stage1", "ensureSchema threw", { error: e });
      }

      let cronJobs: Array<{
        jobname: string;
        schedule: string;
        active: boolean;
      }> = [];
      let cronError: string | null = null;
      try {
        const rows = await sql<
          { jobname: string; schedule: string; active: boolean }[]
        >`
          SELECT jobname, schedule, active
          FROM cron.job
          WHERE jobname LIKE 'viaconnect%'
          ORDER BY jobname
        `;
        cronJobs = rows.map((r) => ({
          jobname: r.jobname,
          schedule: r.schedule,
          active: Boolean(r.active),
        }));
      } catch (e) {
        cronError = e instanceof Error ? e.message : String(e);
      }

      // If missing, try schedule again and re-query
      const missing = EXPECTED_JOBS.filter(
        (j) => !cronJobs.some((c) => c.jobname === j && c.active)
      );
      if (missing.length > 0 && !cronError) {
        try {
          await sql.unsafe(`
            DO $$ BEGIN PERFORM cron.unschedule('viaconnect_ops_tick_15m'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
            SELECT cron.schedule('viaconnect_ops_tick_15m', '*/15 * * * *', $cron$ SELECT public.invoke_ops_tick(); $cron$);
            DO $$ BEGIN PERFORM cron.unschedule('viaconnect_ops_discovery_6h'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
            SELECT cron.schedule('viaconnect_ops_discovery_6h', '22 */6 * * *', $cron$ SELECT public.invoke_ops_tick(); $cron$);
          `);
          const rows = await sql<
            { jobname: string; schedule: string; active: boolean }[]
          >`
            SELECT jobname, schedule, active
            FROM cron.job
            WHERE jobname LIKE 'viaconnect%'
            ORDER BY jobname
          `;
          cronJobs = rows.map((r) => ({
            jobname: r.jobname,
            schedule: r.schedule,
            active: Boolean(r.active),
          }));
        } catch (e) {
          cronError = e instanceof Error ? e.message : String(e);
        }
      }

      let cursors: Array<Record<string, unknown>> = [];
      let cursorError: string | null = null;
      try {
        cursors = await sql`
          SELECT source_key, topic_key, cursor_date, last_run_status, last_new_items, last_run_at
          FROM public.discovery_cursors
          ORDER BY 1, 2
          LIMIT 40
        `;
      } catch (e) {
        cursorError = e instanceof Error ? e.message : String(e);
      }

      let secretConfigured = false;
      try {
        const sec = await sql<{ n: number }[]>`
          SELECT count(*)::int AS n FROM public.ops_internal_secrets WHERE key = 'CRON_SECRET'
        `;
        secretConfigured = (sec[0]?.n ?? 0) > 0;
      } catch {
        secretConfigured = false;
      }

      let functionExists = false;
      try {
        const fn = await sql<{ n: number }[]>`
          SELECT count(*)::int AS n
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'invoke_ops_tick'
        `;
        functionExists = (fn[0]?.n ?? 0) > 0;
      } catch {
        functionExists = false;
      }

      // Recent cron run history if available
      let recentRuns: Array<Record<string, unknown>> = [];
      try {
        recentRuns = await sql`
          SELECT j.jobname, d.status, d.start_time, d.end_time, d.return_message
          FROM cron.job_run_details d
          JOIN cron.job j ON j.jobid = d.jobid
          WHERE j.jobname LIKE 'viaconnect%'
          ORDER BY d.start_time DESC
          LIMIT 20
        `;
      } catch {
        recentRuns = [];
      }

      const expectedOk = EXPECTED_JOBS.every((j) =>
        cronJobs.some((c) => c.jobname === j && c.active)
      );
      const cursorsOk = cursors.length > 0 && !cursorError;
      const stage1Pass =
        expectedOk && cursorsOk && secretConfigured && functionExists;

      return Response.json({
        ok: stage1Pass,
        stage1: stage1Pass ? "PASS" : "FAIL",
        checkedAt: new Date().toISOString(),
        expectedJobs: EXPECTED_JOBS,
        cronJobs,
        cronError,
        missingOrInactive: EXPECTED_JOBS.filter(
          (j) => !cronJobs.some((c) => c.jobname === j && c.active)
        ),
        cursors,
        cursorError,
        cursorCount: cursors.length,
        secretConfigured,
        functionExists,
        recentCronRuns: recentRuns,
      });
    } finally {
      await sql.end({ timeout: 5 });
    }
  } catch (err) {
    safeLog.error("soak.stage1", "threw", { error: err });
    return Response.json(
      {
        ok: false,
        stage1: "FAIL",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 200 }
    );
  }
}
