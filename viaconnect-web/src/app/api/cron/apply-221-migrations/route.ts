/**
 * Prompt 221/221A: one-shot migration apply (Bearer CRON_SECRET).
 * Runs append-only SQL on production Postgres. Idempotent IF NOT EXISTS.
 * Never returns secret values.
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { safeLog } from "@/lib/utils/safe-log";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

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

const MIGRATION_FILES = [
  "20260820000010_prompt_221_kb_schema.sql",
  "20260820000011_prompt_221_kb_collections_seed.sql",
  "20260820000012_prompt_221_kb_promote_search.sql",
  "20260820000013_prompt_221a_jeffery_reviews.sql",
] as const;

function loadSql(name: string): string | null {
  const candidates = [
    join(process.cwd(), "supabase", "migrations", name),
    join(process.cwd(), "viaconnect-web", "supabase", "migrations", name),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return readFileSync(p, "utf8");
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
      { status: 200 }
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
      for (const file of MIGRATION_FILES) {
        const body = loadSql(file);
        if (!body) {
          results.push({ file, ok: false, error: "file_not_found_in_bundle" });
          continue;
        }
        try {
          await sql.unsafe(body);
          results.push({ file, ok: true });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          safeLog.error("cron.apply-221", "migration failed", { file, error: e });
          results.push({ file, ok: false, error: msg.slice(0, 500) });
          // Stop on first hard failure so partial state is visible
          break;
        }
      }

      let collections: Array<Record<string, unknown>> = [];
      let tables: string[] = [];
      let functions: string[] = [];
      let jefferyVerdictCol = false;

      if (results.every((r) => r.ok)) {
        collections = await sql`
          SELECT slug, status, seeding_phase, gate_profile, owning_agent
          FROM public.kb_collections
          ORDER BY seeding_phase, slug
        `;
        const t = await sql`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND (table_name LIKE 'kb_%' OR table_name = 'jeffery_reviews')
          ORDER BY table_name
        `;
        tables = t.map((r) => String(r.table_name));
        const f = await sql`
          SELECT p.proname
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'
            AND p.proname IN ('promote_kb_item', 'kb_search', 'record_jeffery_review')
          ORDER BY 1
        `;
        functions = f.map((r) => String(r.proname));
        const c = await sql`
          SELECT 1 AS n
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'kb_items'
            AND column_name = 'jeffery_verdict'
          LIMIT 1
        `;
        jefferyVerdictCol = c.length > 0;
      }

      const ok = results.length === MIGRATION_FILES.length && results.every((r) => r.ok);
      return Response.json({
        ok,
        results,
        collectionsCount: collections.length,
        collections,
        tables,
        functions,
        jefferyVerdictCol,
      });
    } finally {
      await sql.end({ timeout: 5 });
    }
  } catch (err) {
    safeLog.error("cron.apply-221", "threw", { error: err });
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        results,
      },
      { status: 200 }
    );
  }
}
