/**
 * Prompt 227a: apply Sherlock curation schema (Bearer CRON_SECRET).
 */
import { isCronAuthorized } from '@/lib/jeffery/ops/cronAuth';
import { PROMPT_227A_MIGRATIONS } from '@/lib/kb/migrations/embedded227a';
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
      for (const migration of PROMPT_227A_MIGRATIONS) {
        try {
          await sql.unsafe(migration.sql);
          results.push({ file: migration.file, ok: true });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          safeLog.error('cron.apply-227a', 'migration failed', {
            file: migration.file,
            error: message,
          });
          results.push({ file: migration.file, ok: false, error: message });
        }
      }
      // Reload PostgREST schema cache so new tables are visible immediately.
      try {
        await sql.unsafe(`NOTIFY pgrst, 'reload schema'`);
      } catch {
        // Non-fatal: cycle may need one retry if cache is stale.
      }
    } finally {
      await sql.end({ timeout: 5 });
    }

    return Response.json({
      ok: results.every((r) => r.ok),
      prompt: '227a',
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('cron.apply-227a', 'threw', { error: message });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}
