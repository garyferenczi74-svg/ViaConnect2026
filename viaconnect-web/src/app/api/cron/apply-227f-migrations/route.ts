/**
 * Prompt 227f: apply pg_cron cadence migration (Bearer CRON_SECRET).
 */
import { isCronAuthorized } from '@/lib/jeffery/ops/cronAuth';
import { PROMPT_227F_MIGRATIONS } from '@/lib/kb/migrations/embedded227f';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

function buildConnectionString(): string | null {
  const direct =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL;
  if (direct && direct.trim().length > 0) {
    return direct.trim().replace(/^["']|["']$/g, '');
  }
  const host = process.env.POSTGRES_HOST?.trim();
  const user = process.env.POSTGRES_USER?.trim() || 'postgres';
  const password = process.env.POSTGRES_PASSWORD?.trim();
  const database = process.env.POSTGRES_DATABASE?.trim() || 'postgres';
  if (host && password) {
    return `postgresql://${user}:${encodeURIComponent(password)}@${host}:5432/${database}`;
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

  const results: Array<{ file: string; ok: boolean; error?: string }> = [];

  try {
    const postgres = (await import('postgres')).default;
    const sql = postgres(conn, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 30,
      prepare: false,
      ssl: 'require',
    });

    try {
      for (const migration of PROMPT_227F_MIGRATIONS) {
        try {
          await sql.unsafe(migration.sql);
          results.push({ file: migration.file, ok: true });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          safeLog.error('cron.apply-227f', 'migration failed', {
            file: migration.file,
            error: message,
          });
          results.push({ file: migration.file, ok: false, error: message });
        }
      }

      // Prove registration: list 227 jobs
      let jobs: Array<{ jobname: string; schedule: string; active: boolean }> =
        [];
      try {
        const rows = await sql`
          SELECT jobname, schedule, active
          FROM cron.job
          WHERE jobname LIKE 'viaconnect_227_%'
          ORDER BY jobname
        `;
        jobs = rows.map((r) => ({
          jobname: String(r.jobname),
          schedule: String(r.schedule),
          active: r.active === true,
        }));
      } catch (err) {
        safeLog.warn('cron.apply-227f', 'job list failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      return Response.json({
        ok: results.every((r) => r.ok) && jobs.length >= 6,
        prompt: '227f',
        results,
        jobs,
      });
    } finally {
      await sql.end({ timeout: 5 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('cron.apply-227f', 'threw', { error: message });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}
