/**
 * Prompt 219H: budget-aware backlog (queue when ceiling hit, resume later).
 */

import { createAdminClientOrNull } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import { snapshotBudgets } from "@/lib/jeffery/capabilities/budgets";
import type { BudgetClass } from "./types";

export async function enqueueBacklog(args: {
  jobKey: string;
  agentId: string;
  budgetClass: BudgetClass;
  reason?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createAdminClientOrNull();
    if (!supabase) return;
    await supabase.from("agent_job_backlog").insert({
      job_key: args.jobKey,
      agent_id: args.agentId,
      budget_class: args.budgetClass,
      reason: args.reason ?? "budget_exhausted",
      payload: args.payload ?? {},
      status: "queued",
    });
  } catch (err) {
    safeLog.warn("ops.backlog", "enqueue failed open", {
      jobKey: args.jobKey,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function listQueuedBacklog(limit = 50): Promise<
  Array<{
    id: string;
    job_key: string;
    agent_id: string;
    budget_class: string;
    reason: string;
    created_at: string;
  }>
> {
  try {
    const supabase = createAdminClientOrNull();
    if (!supabase) return [];
    const { data } = await supabase
      .from("agent_job_backlog")
      .select("id, job_key, agent_id, budget_class, reason, created_at")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(limit);
    return (data as never) ?? [];
  } catch {
    return [];
  }
}

/** Resume queued jobs when shared budgets have headroom. */
export async function resumeBacklogIfPossible(
  runner: (jobKey: string) => Promise<void>
): Promise<{ resumed: number }> {
  const snap = snapshotBudgets();
  const firecrawlOpen = !snap.firecrawl.hitBudget;
  const grokOpen = snap.grok.tokensUsed < snap.grok.maxTokens * 0.9;
  if (!firecrawlOpen && !grokOpen) return { resumed: 0 };

  const queued = await listQueuedBacklog(10);
  let resumed = 0;
  for (const item of queued) {
    const classOk =
      item.budget_class === "none" ||
      (item.budget_class === "A" && firecrawlOpen) ||
      (item.budget_class === "B" && (firecrawlOpen || grokOpen)) ||
      (item.budget_class === "C" && grokOpen);
    if (!classOk) continue;
    try {
      await runner(item.job_key);
      const supabase = createAdminClientOrNull();
      if (supabase) {
        await supabase
          .from("agent_job_backlog")
          .update({ status: "resumed", resumed_at: new Date().toISOString() })
          .eq("id", item.id);
      }
      resumed += 1;
    } catch (err) {
      safeLog.warn("ops.backlog", "resume failed", {
        jobKey: item.job_key,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return { resumed };
}

/**
 * Projected daily consumption under 219H cadences vs current ceilings.
 * For Gary to tune; does not raise ceilings.
 */
export function projectDailyBudgetConsumption(): {
  firecrawl: {
    projectedPages: number;
    ceilingPages: number;
    projectedCredits: number;
    ceilingCredits: number;
    flag: boolean;
  };
  grok: { projectedTokens: number; ceilingTokens: number; flag: boolean };
  pubmed: { projectedCalls: number; note: string };
  hannahCompile: { projectedFull: number; projectedLight: number; note: string };
  flags: string[];
} {
  // Cadence-based projections (conservative)
  // hounddog.discovery 4x/day * 8 pages = 32
  // hounddog.social 4x * 1 = 4
  // elysium+thanos allowlist 2x each * 3 = 12
  // product/sherlock hybrid ~6
  const projectedPages = 32 + 4 + 12 + 6; // 54
  const ceilingPages = Number(process.env.FIRECRAWL_MAX_PAGES_PER_RUN ?? "25");
  // Note: firecrawl budget is per-run in client but shared daily credits 200
  const ceilingCredits = Number(process.env.FIRECRAWL_MAX_CREDITS_PER_DAY ?? "200");
  const projectedCredits = projectedPages; // 1 credit per page/search

  // Grok: sherlock curate 2x/day * ~2k tokens + light research
  const projectedGrok = 2 * 2000 + 4 * 1200; // 8800
  const ceilingGrok = Number(process.env.XAI_GROK_MAX_TOKENS_PER_DAY ?? "200000");

  // PubMed: hounddog 2x/day * ~3 e-util calls
  const projectedPubmed = 2 * 3;

  const flags: string[] = [];
  // Flag if projected pages exceed per-run ceiling (shared daily is credits)
  if (projectedCredits > ceilingCredits * 0.7) {
    flags.push(
      `Firecrawl projected ~${projectedCredits} credits/day vs ceiling ${ceilingCredits} (70% warning). Consider raising FIRECRAWL_MAX_CREDITS_PER_DAY or lowering discovery pages.`
    );
  }
  // Per-run max pages 25 would block a single discovery wanting 8*4 if wrongly scoped as one run
  if (ceilingPages < 10) {
    flags.push(
      `FIRECRAWL_MAX_PAGES_PER_RUN=${ceilingPages} may be too low for multi-page discovery jobs (recommend >= 15 for 24/7).`
    );
  }
  if (projectedGrok > ceilingGrok * 0.5) {
    flags.push(
      `Grok projected ~${projectedGrok} tokens/day approaching ceiling ${ceilingGrok}.`
    );
  }

  return {
    firecrawl: {
      projectedPages,
      ceilingPages,
      projectedCredits,
      ceilingCredits,
      flag: projectedCredits > ceilingCredits * 0.7 || ceilingPages < 10,
    },
    grok: {
      projectedTokens: projectedGrok,
      ceilingTokens: ceilingGrok,
      flag: projectedGrok > ceilingGrok * 0.5,
    },
    pubmed: {
      projectedCalls: projectedPubmed,
      note: "NCBI throttle (~3/s without key, ~10/s with). Cadence 12h keeps well under limits.",
    },
    hannahCompile: {
      projectedFull: 1,
      projectedLight: 6,
      note: "Full compile once via synchronism-daily; light freshness 4h does not call heavy AI.",
    },
    flags,
  };
}
