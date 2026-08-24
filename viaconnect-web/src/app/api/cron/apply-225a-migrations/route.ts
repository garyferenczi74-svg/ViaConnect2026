/**
 * Prompt 225a: apply clinical evidence schema (Bearer CRON_SECRET).
 * Uses embedded SQL (supabase/ is vercelignored). Never returns secrets.
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { PROMPT_225A_MIGRATIONS } from "@/lib/kb/migrations/embedded225a";
import { safeLog } from "@/lib/utils/safe-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function buildConnectionString(): string | null {
  const direct =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL;
  if (direct && direct.trim().length > 0) {
    return direct.trim().replace(/^["']|["']$/g, "");
  }
  const host = process.env.POSTGRES_HOST?.trim();
  const user = process.env.POSTGRES_USER?.trim() || "postgres";
  const password = process.env.POSTGRES_PASSWORD?.trim();
  const database = process.env.POSTGRES_DATABASE?.trim() || "postgres";
  if (host && password) {
    return `postgresql://${user}:${encodeURIComponent(password)}@${host}:5432/${database}`;
  }
  return null;
}

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const conn = buildConnectionString();
  if (!conn) {
    return Response.json(
      { ok: false, error: "no_postgres_connection" },
      { status: 200 },
    );
  }

  const results: Array<{ file: string; ok: boolean; error?: string }> = [];

  try {
    const postgres = (await import("postgres")).default;
    const sql = postgres(conn, {
      max: 1,
      idle_timeout: 5,
      connect_timeout: 30,
    });

    try {
      for (const mig of PROMPT_225A_MIGRATIONS) {
        try {
          await sql.unsafe(mig.sql);
          results.push({ file: mig.file, ok: true });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          safeLog.error("cron.apply-225a", "migration failed", {
            file: mig.file,
            error: e,
          });
          results.push({ file: mig.file, ok: false, error: msg.slice(0, 500) });
          break;
        }
      }

      const tablesRows = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (
            'kb_trials', 'kb_publications', 'kb_peptide_evidence_links',
            'kb_evidence_query_terms', 'kb_ingest_source_status'
          )
        ORDER BY table_name
      `;
      const tables = tablesRows.map((r) => String(r.table_name));

      const sources = await sql`
        SELECT source_system, status
        FROM public.kb_ingest_source_status
        ORDER BY source_system
      `;

      const ictrpBlocked = await sql`
        SELECT domain, approval_status, is_active
        FROM public.authorities_sources
        WHERE domain = 'trialsearch.who.int'
        LIMIT 1
      `;

      const ok =
        results.every((r) => r.ok) &&
        tables.includes("kb_trials") &&
        tables.includes("kb_publications") &&
        tables.includes("kb_ingest_source_status");

      return Response.json(
        {
          ok,
          results,
          tables,
          sourceStatus: sources,
          ictrpAllowlistRow: ictrpBlocked[0] ?? null,
        },
        { status: 200 },
      );
    } finally {
      await sql.end({ timeout: 5 });
    }
  } catch (err) {
    safeLog.error("cron.apply-225a", "threw", { error: err });
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        results,
      },
      { status: 200 },
    );
  }
}

export async function GET(request: Request): Promise<Response> {
  return POST(request);
}
