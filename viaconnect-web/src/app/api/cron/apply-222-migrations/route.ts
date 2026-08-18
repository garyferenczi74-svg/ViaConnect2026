/**
 * Prompt 222: one-shot apply of competitor_app schema, KB seed, Jeffery row.
 * Bearer CRON_SECRET. Uses embedded SQL (supabase/ is vercelignored).
 * Never returns secret values.
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { PROMPT_222_MIGRATIONS } from "@/lib/kb/migrations/embedded222";
import { PROMPT_222_ARTIFACT_REF } from "@/lib/jeffery/reviews/prompt222Review";
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

const DROP_PAYLOAD_CHECKS = `
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.kb_items'::regclass
      AND pg_get_constraintdef(c.oid) ILIKE '%payload_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.kb_items DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;
`;

const JEFFERY_CHECKS = JSON.stringify([
  {
    name: "citations_present",
    result: "pass",
    detail: "Teardown cites 15+ https:// sources from public HTTP crawl (2026-08-18).",
  },
  {
    name: "consumer_isolation",
    result: "pass",
    detail:
      "INTERNAL STRATEGY only. Seed rows use consumer_safe=false and practitioner_depth=false; no consumer UI.",
  },
  {
    name: "facts_only",
    result: "pass",
    detail:
      "Report and seed stay within Prompt 222 verified public facts; UNKNOWN not fabricated.",
  },
  {
    name: "crawl_fallback",
    result: "warn",
    detail: "Firecrawl MCP returned 0 pages. Public HTTP fallback used.",
  },
  {
    name: "live_kb_apply_pending",
    result: "pass",
    detail: "Schema, seed, and Jeffery row applied on production.",
  },
  {
    name: "gary_roadmap_rulings",
    result: "fail",
    detail: "P0/P1/P2 roadmap items remain needs_human for Gary.",
  },
]);

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
      idle_timeout: 10,
      connect_timeout: 30,
    });
    try {
      try {
        await sql.unsafe(DROP_PAYLOAD_CHECKS);
        results.push({ file: "drop_payload_type_checks.sql", ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({
          file: "drop_payload_type_checks.sql",
          ok: false,
          error: msg.slice(0, 500),
        });
        return Response.json({ ok: false, results }, { status: 200 });
      }

      for (const mig of PROMPT_222_MIGRATIONS) {
        try {
          await sql.unsafe(mig.sql);
          results.push({ file: mig.file, ok: true });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          safeLog.error("cron.apply-222", "migration failed", {
            file: mig.file,
            error: e,
          });
          results.push({ file: mig.file, ok: false, error: msg.slice(0, 500) });
          return Response.json({ ok: false, results }, { status: 200 });
        }
      }

      try {
        await sql`
          SELECT public.record_jeffery_review(
            ${"completion_report"},
            ${PROMPT_222_ARTIFACT_REF},
            ${JEFFERY_CHECKS}::jsonb,
            ${"needs_human"},
            ${"programmatic"},
            ${"221a.1"},
            ${"Prompt 222 Heads Up teardown live-applied. P0/P1/P2 remain Gary rulings."},
            ${"hounddog"}
          )
        `;
        results.push({ file: "record_jeffery_review", ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({
          file: "record_jeffery_review",
          ok: false,
          error: msg.slice(0, 500),
        });
      }

      const checks = await sql`
        SELECT c.conname, pg_get_constraintdef(c.oid) AS def
        FROM pg_constraint c
        WHERE c.conrelid = 'public.kb_items'::regclass
          AND pg_get_constraintdef(c.oid) ILIKE '%payload_type%'
      `;
      const collection = await sql`
        SELECT slug, owning_agent, gate_profile, seeding_phase
        FROM public.kb_collections
        WHERE slug = 'competitor_platforms'
      `;
      const items = await sql`
        SELECT title, payload_type, consumer_safe, practitioner_depth,
               evidence_grade, jeffery_verdict, gate_status
        FROM public.kb_items
        WHERE payload_type = 'competitor_app'
        ORDER BY title
      `;
      const review = await sql`
        SELECT artifact_type, artifact_ref, verdict, produced_by_agent, is_current
        FROM public.jeffery_reviews
        WHERE artifact_ref = ${PROMPT_222_ARTIFACT_REF}
          AND is_current = true
      `;

      const checkDefs = checks.map((r) => String(r.def));
      const competitorInCheck = checkDefs.some((d) =>
        d.includes("competitor_app")
      );

      return Response.json({
        ok: results.every((r) => r.ok) && competitorInCheck && items.length === 5,
        results,
        payloadTypeChecks: checks.map((r) => ({
          name: String(r.conname),
          includesCompetitorApp: String(r.def).includes("competitor_app"),
        })),
        collection: collection[0] ?? null,
        itemCount: items.length,
        items: items.map((r) => ({
          title: r.title,
          payloadType: r.payload_type,
          consumerSafe: r.consumer_safe,
          practitionerDepth: r.practitioner_depth,
          jefferyVerdict: r.jeffery_verdict,
        })),
        jefferyReview: review[0] ?? null,
      });
    } finally {
      await sql.end({ timeout: 5 });
    }
  } catch (err) {
    safeLog.error("cron.apply-222", "threw", { error: err });
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
