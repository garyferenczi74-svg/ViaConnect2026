/**
 * Prompt 223: one-shot location migration apply (Bearer CRON_SECRET).
 * Uses embedded gzipped SQL because supabase/ is vercelignored.
 * Never returns secret values.
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { loadPrompt223Migrations } from "@/lib/location/migrations/load223";
import { safeLog } from "@/lib/utils/safe-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

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
    return Response.json({ ok: false, error: "no_postgres_connection" }, { status: 200 });
  }

  const migrations = loadPrompt223Migrations();
  const results: Array<{ file: string; ok: boolean; error?: string }> = [];

  try {
    const postgres = (await import("postgres")).default;
    const sql = postgres(conn, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 30,
    });
    try {
      await sql.unsafe("SET statement_timeout = '4min'");
      for (const mig of migrations) {
        try {
          await sql.unsafe(mig.sql);
          results.push({ file: mig.file, ok: true });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          safeLog.error("cron.apply-223", "migration failed", {
            file: mig.file,
            error: e,
          });
          results.push({ file: mig.file, ok: false, error: msg.slice(0, 500) });
          break;
        }
      }

      let verify: Record<string, unknown> = {};
      if (results.every((r) => r.ok)) {
        const counts = await sql`
          SELECT
            (SELECT count(*)::int FROM public.ref_countries) AS countries,
            (SELECT count(*)::int FROM public.ref_subdivisions) AS subdivisions,
            (SELECT count(*)::int FROM public.ref_cities) AS cities
        `;
        const stats = await sql`SELECT * FROM public.backfill_profile_locations()`;
        const buffalo = await sql`
          SELECT count(*)::int AS n
          FROM public.ref_cities
          WHERE name_normalized = 'buffalo'
        `;
        const search = await sql`
          SELECT code, name FROM public.search_ref_countries('can', 5)
        `;
        verify = {
          countries: counts[0].countries,
          subdivisions: counts[0].subdivisions,
          cities: counts[0].cities,
          buffaloRows: buffalo[0].n,
          searchCan: search.map((r) => r.code),
          backfill: {
            total: stats[0].total,
            parsed: stats[0].parsed,
            prompted: stats[0].prompted,
          },
        };
      }

      return Response.json({ ok: results.every((r) => r.ok), results, verify });
    } finally {
      await sql.end({ timeout: 5 });
    }
  } catch (err) {
    safeLog.error("cron.apply-223", "threw", { error: err });
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
