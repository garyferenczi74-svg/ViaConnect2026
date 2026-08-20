/**
 * Prompt 225: one-shot migration apply (Bearer CRON_SECRET).
 * Uses embedded SQL (supabase/ is vercelignored). Idempotent IF NOT EXISTS.
 * Also proves practitioner_depth dose CHECK rejects a violating insert.
 * Never returns secret values.
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { PROMPT_225_MIGRATIONS } from "@/lib/kb/migrations/embedded225";
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
      for (const mig of PROMPT_225_MIGRATIONS) {
        try {
          await sql.unsafe(mig.sql);
          results.push({ file: mig.file, ok: true });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          safeLog.error("cron.apply-225", "migration failed", {
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
          AND table_name LIKE 'kb_peptide%'
        ORDER BY table_name
      `;
      const tables = tablesRows.map((r) => String(r.table_name));

      const coll = await sql`
        SELECT slug, status, gate_profile, owning_agent
        FROM public.kb_collections
        WHERE slug = 'peptide_education'
      `;

      let doseCheckRejectedInsert = false;
      let doseCheckErrorSample: string | null = null;
      try {
        await sql.unsafe(`
          DO $$
          DECLARE
            v_item uuid;
          BEGIN
            INSERT INTO public.kb_items (
              primary_collection_id, payload_type, title, summary, content_hash,
              gate_status, consumer_safe, jeffery_verdict
            )
            SELECT c.id, 'peptide', '225-dose-check-probe', 'probe',
                   '225-dose-check-probe-' || gen_random_uuid()::text,
                   'pending', false, 'pending'
            FROM public.kb_collections c
            WHERE c.slug = 'peptide_education'
            LIMIT 1
            RETURNING id INTO v_item;

            INSERT INTO public.kb_peptides (
              kb_item_id, slug, canonical_name, display_name, molecular_class,
              category, practitioner_depth
            ) VALUES (
              v_item,
              '225-dose-check-probe',
              'Dose Check Probe',
              'Dose Check Probe',
              'peptide',
              'Tissue Repair and Regeneration',
              '{"dose":"1mg"}'::jsonb
            );
          END $$;
        `);
      } catch (e) {
        doseCheckRejectedInsert = true;
        doseCheckErrorSample = String(
          e instanceof Error ? e.message : e,
        ).slice(0, 300);
      }

      await sql`DELETE FROM public.kb_peptides WHERE slug = '225-dose-check-probe'`;
      await sql`DELETE FROM public.kb_items WHERE title = '225-dose-check-probe'`;

      let peptideCount = 0;
      try {
        const cnt = await sql`SELECT count(*)::int AS n FROM public.kb_peptides`;
        peptideCount = Number(cnt[0]?.n ?? 0);
      } catch {
        peptideCount = 0;
      }

      const ok =
        results.every((r) => r.ok) &&
        tables.includes("kb_peptides") &&
        doseCheckRejectedInsert &&
        peptideCount > 0;

      return Response.json(
        {
          ok,
          results,
          tables,
          collection: coll[0] ?? null,
          doseCheckRejectedInsert,
          doseCheckErrorSample,
          peptideCount,
        },
        { status: 200 },
      );
    } finally {
      await sql.end({ timeout: 5 });
    }
  } catch (err) {
    safeLog.error("cron.apply-225", "threw", { error: err });
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
