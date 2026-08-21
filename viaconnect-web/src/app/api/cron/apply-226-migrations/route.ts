/**
 * Prompt 226: apply converter schema + Marshall allowlist seed (Bearer CRON_SECRET).
 * Uses embedded SQL. Never returns secrets. Does not clear Lex G20 gate.
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { PROMPT_226_MIGRATIONS } from "@/lib/kb/migrations/embedded226";
import { createAdminClient } from "@/lib/supabase/admin";
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
      for (const mig of PROMPT_226_MIGRATIONS) {
        try {
          await sql.unsafe(mig.sql);
          results.push({ file: mig.file, ok: true });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          safeLog.error("cron.apply-226", "migration failed", {
            file: mig.file,
            error: e,
          });
          results.push({ file: mig.file, ok: false, error: msg.slice(0, 500) });
          break;
        }
      }

      const admin = createAdminClient();
      const { count: eligible } = await admin
        .from("kb_peptides")
        .select("id", { count: "exact", head: true })
        .eq("converter_eligible", true);
      const { count: blockedRc } = await admin
        .from("kb_peptides")
        .select("id", { count: "exact", head: true })
        .eq("slug", "edu-bpc157")
        .eq("converter_eligible", false);
      const { data: disc } = await admin
        .from("converter_disclaimer_versions")
        .select("version, lex_status, marshall_status")
        .eq("version", "226-v1")
        .maybeSingle();

      return Response.json(
        {
          ok: results.every((r) => r.ok),
          prompt: "226",
          phase: "wave0-schema",
          results,
          converterEligibleCount: eligible ?? 0,
          bpc157Blocked: (blockedRc ?? 0) >= 1,
          disclaimer226v1: disc,
          productionGate: {
            g20Lex: disc?.lex_status === "cleared",
            note: "Module A UI must not ship until Lex clears 226-v1 (G20).",
          },
        },
        { status: 200 },
      );
    } finally {
      await sql.end({ timeout: 5 });
    }
  } catch (err) {
    safeLog.error("cron.apply-226", "threw", { error: err });
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
