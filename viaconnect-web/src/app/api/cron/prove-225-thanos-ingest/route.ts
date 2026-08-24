/**
 * Prompt 225 Phase 9: Thanos live ingest proof dump.
 * Bearer CRON_SECRET. Optionally runs thanos allowlist ingest (?run=1),
 * then dumps pipeline_runs / firecrawl_run_ledger / hounddog_staging_items
 * / peptide_education_entries evidence. Never returns secrets.
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { logOpsJobRun } from "@/lib/jeffery/ops/logJobRun";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

type Dump = {
  at: string;
  pipelineRuns: unknown[];
  firecrawlLedger: unknown[];
  stagingItems: unknown[];
  stagingCount: number;
  educationEntries: unknown[];
  educationCount: number;
  kbPeptideCount: number;
  collection: unknown;
};

async function dumpThanosEvidence(): Promise<Dump> {
  const admin = createAdminClient();
  const at = new Date().toISOString();

  // Pull recent ops runs and filter client-side for thanos job_key / agent.
  const { data: opsRuns } = await admin
    .from("pipeline_runs")
    .select("run_id, run_date, status, started_at, ended_at, stages")
    .like("run_id", "ops-%")
    .order("started_at", { ascending: false })
    .limit(100);

  const { data: proveRuns } = await admin
    .from("pipeline_runs")
    .select("run_id, run_date, status, started_at, ended_at, stages")
    .ilike("run_id", "%thanos%")
    .order("started_at", { ascending: false })
    .limit(20);

  const thanosOps = (opsRuns ?? []).filter((row) => {
    if (String(row.run_id ?? "").includes("thanos")) return true;
    const raw = row.stages as unknown;
    const stages = Array.isArray(raw)
      ? (raw as Array<Record<string, unknown>>)
      : raw && typeof raw === "object"
        ? [raw as Record<string, unknown>]
        : [];
    return stages.some(
      (s) =>
        String(s.job_key ?? "") === "thanos.allowlist" ||
        String(s.agent ?? "") === "thanos",
    );
  });

  const mergedRuns = [
    ...(proveRuns ?? []),
    ...thanosOps.filter(
      (r) => !(proveRuns ?? []).some((p) => p.run_id === r.run_id),
    ),
  ].slice(0, 25);

  const { data: firecrawlLedger } = await admin
    .from("firecrawl_run_ledger")
    .select(
      "run_id, run_date, source_class, pages_used, credits_used, hit_budget, detail, created_at",
    )
    .eq("source_class", "thanos_peptide")
    .order("created_at", { ascending: false })
    .limit(15);

  const { data: stagingItems, count: stagingCount } = await admin
    .from("hounddog_staging_items")
    .select(
      "external_id, title, source_url, source_type, agent_slug, topic_key, gate_status, created_at, retrieved_at",
      { count: "exact" },
    )
    .or(
      "agent_slug.eq.thanos,topic_key.eq.peptide-education,source_type.eq.thanos_peptide",
    )
    .order("retrieved_at", { ascending: false })
    .limit(40);

  const { data: educationEntries, count: educationCount } = await admin
    .from("peptide_education_entries")
    .select(
      "entry_key, title, is_practitioner_depth, last_verified_at, updated_at, is_active",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .limit(30);

  const { count: kbPeptideCount } = await admin
    .from("kb_peptides")
    .select("id", { count: "exact", head: true });

  const { data: collection } = await admin
    .from("kb_collections")
    .select("slug, status, gate_profile, owning_agent")
    .eq("slug", "peptide_education")
    .maybeSingle();

  return {
    at,
    pipelineRuns: mergedRuns,
    firecrawlLedger: firecrawlLedger ?? [],
    stagingItems: stagingItems ?? [],
    stagingCount: stagingCount ?? (stagingItems ?? []).length,
    educationEntries: educationEntries ?? [],
    educationCount: educationCount ?? (educationEntries ?? []).length,
    kbPeptideCount: kbPeptideCount ?? 0,
    collection: collection ?? null,
  };
}

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const shouldRun =
      url.searchParams.get("run") === "1" ||
      url.searchParams.get("run") === "true";

    const before = await dumpThanosEvidence();

    let ingest: Record<string, unknown> | null = null;
    let pipelineRunId: string | null = null;
    let runError: string | null = null;

    if (shouldRun) {
      const started = Date.now();
      try {
        const { runThanosDailyIngest } = await import(
          "@/lib/thanos/allowlistIngest"
        );
        const stats = await runThanosDailyIngest({
          runId: `prove-225-thanos-${Date.now()}`,
          runDate: new Date().toISOString().slice(0, 10),
        });
        ingest = { ...stats } as unknown as Record<string, unknown>;
        pipelineRunId = await logOpsJobRun({
          jobKey: "thanos.allowlist",
          agentId: "thanos",
          status: "ok",
          durationMs: Date.now() - started,
          detail: ingest,
        });
      } catch (err) {
        runError = err instanceof Error ? err.message : String(err);
        pipelineRunId = await logOpsJobRun({
          jobKey: "thanos.allowlist",
          agentId: "thanos",
          status: "failed",
          durationMs: Date.now() - started,
          detail: { error: runError },
          error: runError,
        });
      }
    }

    const after = await dumpThanosEvidence();

    const searchFailed = Number(ingest?.searchFailed ?? 0);
    const searchFailReasons = Array.isArray(ingest?.searchFailReasons)
      ? (ingest?.searchFailReasons as string[])
      : [];
    const firecrawlBillingBlocked = searchFailReasons.some((r) =>
      String(r).includes("402"),
    );
    const pipelineHealthy =
      !runError &&
      after.kbPeptideCount > 0 &&
      after.collection != null &&
      (Boolean(pipelineRunId) || after.pipelineRuns.length > 0);
    const stagingHealthy = after.stagingCount > 0 || Number(ingest?.staged ?? 0) > 0;
    const ingestHealthy =
      pipelineHealthy &&
      stagingHealthy &&
      !firecrawlBillingBlocked &&
      searchFailed === 0;
    const ok = pipelineHealthy;

    return Response.json(
      {
        ok,
        prompt: "225",
        phase: "9-thanos-live-ingest-proof",
        ranIngest: shouldRun,
        runError,
        pipelineRunId,
        pipelineHealthy,
        stagingHealthy,
        ingestHealthy,
        firecrawlBillingBlocked,
        ingest,
        before: {
          at: before.at,
          pipelineRunCount: before.pipelineRuns.length,
          firecrawlLedgerCount: before.firecrawlLedger.length,
          stagingCount: before.stagingCount,
          educationCount: before.educationCount,
          kbPeptideCount: before.kbPeptideCount,
        },
        after: {
          at: after.at,
          pipelineRuns: after.pipelineRuns,
          firecrawlLedger: after.firecrawlLedger,
          stagingCount: after.stagingCount,
          stagingSample: after.stagingItems.slice(0, 12),
          educationCount: after.educationCount,
          educationSample: after.educationEntries.slice(0, 12),
          kbPeptideCount: after.kbPeptideCount,
          collection: after.collection,
        },
        proofNotes: [
          "Live dump of pipeline_runs / firecrawl_run_ledger / hounddog_staging_items / peptide_education_entries.",
          "Dashboard state alone is not evidence; this cron is the Phase 0 1.7 required dump.",
          "Thanos stages to hounddog_staging_items; Marshall gate still required before consumer promotion.",
          "pipelineHealthy means ops path + ledger write works. ingestHealthy also requires staged rows and no Firecrawl 402.",
        ],
      },
      { status: 200 },
    );
  } catch (err) {
    safeLog.error("cron.prove-225-thanos-ingest", "threw", { error: err });
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 200 },
    );
  }
}

export async function GET(request: Request): Promise<Response> {
  return POST(request);
}
