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
      let consumerSafeCount = 0;
      let snpLinkCount = 0;
      let viaCuraAdjacencyCount = 0;
      let regulatoryEventCount = 0;
      try {
        const cnt = await sql`SELECT count(*)::int AS n FROM public.kb_peptides`;
        peptideCount = Number(cnt[0]?.n ?? 0);
        const cs = await sql`
          SELECT count(*)::int AS n FROM public.kb_peptides
          WHERE consumer_safe = true AND exclusion_tier = 'educational'
        `;
        consumerSafeCount = Number(cs[0]?.n ?? 0);
        const sn = await sql`SELECT count(*)::int AS n FROM public.kb_peptide_snp_links`;
        snpLinkCount = Number(sn[0]?.n ?? 0);
        const va = await sql`
          SELECT count(*)::int AS n FROM public.kb_peptides
          WHERE via_cura_adjacency IS NOT NULL
        `;
        viaCuraAdjacencyCount = Number(va[0]?.n ?? 0);
        const re = await sql`
          SELECT count(*)::int AS n FROM public.kb_peptide_regulatory_events
        `;
        regulatoryEventCount = Number(re[0]?.n ?? 0);
      } catch {
        peptideCount = 0;
        consumerSafeCount = 0;
        snpLinkCount = 0;
        viaCuraAdjacencyCount = 0;
        regulatoryEventCount = 0;
      }

      let wadaProhibitedCount = 0;
      let jefferyApplyFnCount = 0;
      let stagedUnappliedCount = 0;
      try {
        const wp = await sql`
          SELECT count(*)::int AS n FROM public.kb_peptides
          WHERE wada_status = 'prohibited_all_times'
        `;
        wadaProhibitedCount = Number(wp[0]?.n ?? 0);
        const fn = await sql`
          SELECT count(*)::int AS n FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'
            AND p.proname = 'apply_kb_peptide_regulatory_event'
        `;
        jefferyApplyFnCount = Number(fn[0]?.n ?? 0);
        const st = await sql`
          SELECT count(*)::int AS n FROM public.kb_peptide_regulatory_events
          WHERE applied_at IS NULL
        `;
        stagedUnappliedCount = Number(st[0]?.n ?? 0);
      } catch {
        wadaProhibitedCount = 0;
        jefferyApplyFnCount = 0;
        stagedUnappliedCount = 0;
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
          consumerSafeCount,
          snpLinkCount,
          viaCuraAdjacencyCount,
          regulatoryEventCount,
          wadaProhibitedCount,
          jefferyApplyFnCount,
          stagedUnappliedCount,
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
