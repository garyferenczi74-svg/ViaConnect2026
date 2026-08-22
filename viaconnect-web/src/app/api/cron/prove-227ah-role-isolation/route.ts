/**
 * Prompt 227ah: prove sherlock_curation role cannot UPDATE kb_peptides.
 */
import { isCronAuthorized } from '@/lib/jeffery/ops/cronAuth';
import { createAdminClient } from '@/lib/supabase/admin';
import { refuseIfNotAutoApplicable } from '@/lib/thanos/applyCurationProposals227ah';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

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

  try {
    const conn = buildConnectionString();
    if (!conn) {
      return Response.json(
        { ok: false, error: 'no_postgres_connection' },
        { status: 200 },
      );
    }

    const postgres = (await import('postgres')).default;
    const sql = postgres(conn, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 30,
      prepare: false,
      ssl: 'require',
    });

    // Prefer session-level SET ROLE: SECURITY DEFINER cannot SET ROLE on this host.
    let roleProve: Record<string, unknown> = {};
    try {
      try {
        await sql.unsafe(`SET ROLE sherlock_curation`);
        try {
          await sql.unsafe(
            `UPDATE public.kb_peptides SET fda_status = fda_status WHERE false`,
          );
          roleProve = {
            ok: false,
            rejected: false,
            error: 'write_was_allowed',
            path: 'session_set_role',
          };
        } catch (updErr) {
          const message =
            updErr instanceof Error ? updErr.message : String(updErr);
          const sqlstate =
            typeof updErr === 'object' &&
            updErr &&
            'code' in updErr &&
            typeof (updErr as { code?: string }).code === 'string'
              ? (updErr as { code: string }).code
              : null;
          const rejected =
            sqlstate === '42501' ||
            /permission|privilege|denied/i.test(message);
          roleProve = {
            ok: rejected,
            rejected,
            sqlstate,
            message: message.slice(0, 200),
            path: 'session_set_role',
          };
        }
      } catch (setErr) {
        const message =
          setErr instanceof Error ? setErr.message : String(setErr);
        // Fallback to SQL function (may fail SET ROLE inside SECURITY DEFINER).
        try {
          const rows = await sql`
            SELECT public.prove_sherlock_curation_cannot_write_kb_peptides() AS result
          `;
          roleProve = {
            ...((rows[0]?.result as Record<string, unknown>) ?? {}),
            setRoleError: message.slice(0, 200),
            path: 'function_fallback',
          };
        } catch (fnErr) {
          roleProve = {
            ok: false,
            rejected: false,
            error: 'set_role_and_function_failed',
            setRoleError: message.slice(0, 200),
            functionError:
              fnErr instanceof Error
                ? fnErr.message.slice(0, 200)
                : String(fnErr).slice(0, 200),
            path: 'both_failed',
          };
        }
      } finally {
        try {
          await sql.unsafe(`RESET ROLE`);
        } catch {
          // ignore
        }
      }
    } finally {
      await sql.end({ timeout: 5 });
    }

    const class3Gate = await refuseIfNotAutoApplicable(3);
    const class0Gate = await refuseIfNotAutoApplicable(0);

    // Thanos must not apply Class 3: count proposed Class 3 and ensure none auto_applied.
    const admin = createAdminClient();
    const { count: class3Proposed } = await admin
      .from('curation_proposals')
      .select('id', { count: 'exact', head: true })
      .eq('change_class', 3)
      .eq('status', 'proposed');
    const { count: class3Auto } = await admin
      .from('curation_proposals')
      .select('id', { count: 'exact', head: true })
      .eq('change_class', 3)
      .eq('status', 'auto_applied');

    const ok =
      roleProve.ok === true &&
      roleProve.rejected === true &&
      class3Gate.allowed === false &&
      class0Gate.allowed === true &&
      (class3Auto ?? 0) === 0;

    return Response.json({
      ok,
      prompt: '227ah',
      phase: 'role_isolation',
      roleProve,
      thanosGates: { class0: class0Gate, class3: class3Gate },
      class3Proposed: class3Proposed ?? 0,
      class3AutoApplied: class3Auto ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    safeLog.error('cron.prove-227ah-role', 'threw', { error: message });
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}
