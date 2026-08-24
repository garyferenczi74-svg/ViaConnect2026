/**
 * Prompt 227f: prove 227 pg_cron jobs are registered with expected schedules.
 */
import { isCronAuthorized } from '@/lib/jeffery/ops/cronAuth';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const EXPECTED: Record<string, string> = {
  viaconnect_227_retraction_watch_daily: '10 5 * * *',
  viaconnect_227_curation_cycle_daily: '25 5 * * *',
  viaconnect_227_thanos_apply_daily: '40 5 * * *',
  viaconnect_227_deep_sweep_weekly: '50 6 * * 0',
  viaconnect_227_drift_audit_weekly: '5 7 * * 0',
  viaconnect_227_reverify_quarterly: '20 8 1 1,4,7,10 *',
};

function buildConnectionString(): string | null {
  const direct =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL;
  if (direct && direct.trim().length > 0) {
    return direct.trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get('authorization'))) {
    return new Response('Unauthorized', { status: 401 });
  }

  const conn = buildConnectionString();
  if (!conn) {
    return Response.json(
      { ok: false, error: 'no_postgres_connection' },
      { status: 200 },
    );
  }

  try {
    const postgres = (await import('postgres')).default;
    const sql = postgres(conn, {
      max: 1,
      idle_timeout: 10,
      connect_timeout: 30,
      prepare: false,
      ssl: 'require',
    });

    try {
      const rows = await sql`
        SELECT jobname, schedule, active, command
        FROM cron.job
        WHERE jobname LIKE 'viaconnect_227_%'
        ORDER BY jobname
      `;

      const byName = new Map(
        rows.map((r) => [
          String(r.jobname),
          {
            schedule: String(r.schedule),
            active: r.active === true,
            command: String(r.command ?? ''),
          },
        ]),
      );

      const missing: string[] = [];
      const scheduleMismatches: string[] = [];
      for (const [name, schedule] of Object.entries(EXPECTED)) {
        const hit = byName.get(name);
        if (!hit) {
          missing.push(name);
          continue;
        }
        if (hit.schedule !== schedule) {
          scheduleMismatches.push(`${name}: got ${hit.schedule}`);
        }
        if (!hit.command.includes('invoke_viaconnect_bearer_cron')) {
          scheduleMismatches.push(`${name}: missing invoker`);
        }
      }

      const fn = await sql`
        SELECT 1 AS ok
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'invoke_viaconnect_bearer_cron'
        LIMIT 1
      `;

      const ok =
        missing.length === 0 &&
        scheduleMismatches.length === 0 &&
        fn.length > 0 &&
        rows.length >= 6;

      return Response.json({
        ok,
        prompt: '227f',
        phase: 'pg_cron_registration',
        jobCount: rows.length,
        jobs: rows.map((r) => ({
          jobname: String(r.jobname),
          schedule: String(r.schedule),
          active: r.active === true,
        })),
        missing,
        scheduleMismatches,
        invokerPresent: fn.length > 0,
      });
    } finally {
      await sql.end({ timeout: 5 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('cron.prove-227f', 'threw', { error: message });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}
