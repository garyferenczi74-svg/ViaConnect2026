/**
 * Prompt 219G: shared capability budgets with per-agent sub-logging.
 * Firecrawl and Grok use shared daily ceilings; one agent cannot silently
 * exhaust the whole budget (soft per-agent cap + explicit budget events).
 */

import type { FirecrawlBudget } from "@/lib/hounddog/firecrawl/client";
import { defaultBudget, canSpend, recordSpend } from "@/lib/hounddog/firecrawl/client";
import {
  createDayAwareBudget,
  type DayCapAdmin,
} from "@/lib/hounddog/firecrawl/dayCap";
import { safeLog } from "@/lib/utils/safe-log";
import type { CapabilityAgentId, CapabilityId } from "./types";

export interface AgentSpendSlice {
  agent: string;
  credits: number;
  tokens: number;
  calls: number;
}

interface SharedDayState {
  dayKey: string;
  firecrawl: FirecrawlBudget;
  /** Per-agent firecrawl credits within the shared ceiling. */
  firecrawlByAgent: Map<string, number>;
  grokTokensUsed: number;
  grokMaxTokens: number;
  grokByAgent: Map<string, number>;
  pubmedCalls: number;
  pubmedByAgent: Map<string, number>;
  /** True once firecrawl creditsUsed was seeded from firecrawl_run_ledger. */
  firecrawlSeededFromLedger: boolean;
}

function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function grokDailyTokenBudget(): number {
  const n = Number(process.env.XAI_GROK_MAX_TOKENS_PER_DAY ?? "200000");
  return Number.isFinite(n) && n > 0 ? n : 200_000;
}

/** Soft cap: one agent may not take more than this fraction of the shared pool. */
const PER_AGENT_SOFT_FRACTION = 0.5;

let state: SharedDayState | null = null;

function ensureDay(): SharedDayState {
  const day = utcDayKey();
  if (!state || state.dayKey !== day) {
    state = {
      dayKey: day,
      firecrawl: defaultBudget(),
      firecrawlByAgent: new Map(),
      grokTokensUsed: 0,
      grokMaxTokens: grokDailyTokenBudget(),
      grokByAgent: new Map(),
      pubmedCalls: 0,
      pubmedByAgent: new Map(),
      firecrawlSeededFromLedger: false,
    };
  }
  return state;
}

/** Reset for unit tests only. */
export function resetCapabilityBudgetsForTests(): void {
  state = null;
}

export function getSharedFirecrawlBudget(): FirecrawlBudget {
  return ensureDay().firecrawl;
}

export function firecrawlAgentSpend(agent: CapabilityAgentId): number {
  return ensureDay().firecrawlByAgent.get(String(agent)) ?? 0;
}

/**
 * Check and reserve firecrawl spend under shared + soft per-agent caps.
 * Returns false when shared or agent soft-cap is exhausted.
 * Prefer tryReserveFirecrawlAsync in production so the day ceiling is
 * seeded from firecrawl_run_ledger across Vercel instances.
 */
export function tryReserveFirecrawl(
  agent: CapabilityAgentId,
  pages = 1,
  credits = 1
): { allowed: boolean; reason?: string; budget: FirecrawlBudget } {
  const s = ensureDay();
  const budget = s.firecrawl;
  if (!canSpend(budget, pages, credits)) {
    budget.hitBudget = true;
    safeLog.warn("capability.budget", "firecrawl shared ceiling", {
      agent: String(agent),
      pagesUsed: budget.pagesUsed,
      creditsUsed: budget.creditsUsed,
    });
    return { allowed: false, reason: "budget_exhausted", budget };
  }
  // Soft cap uses the env daily ceiling (not remaining), so one agent cannot
  // take more than half of the intended shared pool even after day seeding.
  const softMax = Math.max(
    1,
    Math.floor(firecrawlDailySoftBase() * PER_AGENT_SOFT_FRACTION)
  );
  const used = s.firecrawlByAgent.get(String(agent)) ?? 0;
  if (used + credits > softMax) {
    safeLog.warn("capability.budget", "firecrawl agent soft-cap", {
      agent: String(agent),
      used,
      softMax,
    });
    return { allowed: false, reason: "agent_soft_cap", budget };
  }
  recordSpend(budget, pages, credits);
  s.firecrawlByAgent.set(String(agent), used + credits);
  return { allowed: true, budget };
}

function firecrawlDailySoftBase(): number {
  const n = Number(process.env.FIRECRAWL_MAX_CREDITS_PER_DAY ?? "200");
  return Number.isFinite(n) && n > 0 ? n : 200;
}

/**
 * Seed in-memory shared Firecrawl state from ledger day totals, then reserve.
 * Durable across serverless instances for the day-credit ceiling.
 */
export async function tryReserveFirecrawlAsync(
  admin: DayCapAdmin,
  agent: CapabilityAgentId,
  pages = 1,
  credits = 1
): Promise<{ allowed: boolean; reason?: string; budget: FirecrawlBudget }> {
  const s = ensureDay();
  if (!s.firecrawlSeededFromLedger) {
    const dayBudget = await createDayAwareBudget(admin);
    // creditsUsed = already spent today; maxCredits = full ceiling so canSpend
    // checks used+request <= ceiling. remaining is encoded as
    // maxCredits - creditsUsed after seeding.
    const ceiling = firecrawlDailySoftBase();
    const alreadyUsed = Math.max(0, ceiling - dayBudget.maxCredits);
    s.firecrawl.creditsUsed = alreadyUsed;
    s.firecrawl.maxCredits = ceiling;
    s.firecrawl.maxPages = dayBudget.maxPages;
    s.firecrawl.pagesUsed = 0;
    s.firecrawl.hitBudget = dayBudget.hitBudget || alreadyUsed >= ceiling;
    s.firecrawlSeededFromLedger = true;
  }
  return tryReserveFirecrawl(agent, pages, credits);
}

export function tryReserveGrokTokens(
  agent: CapabilityAgentId,
  tokens: number
): { allowed: boolean; reason?: string; remaining: number } {
  const s = ensureDay();
  if (s.grokTokensUsed + tokens > s.grokMaxTokens) {
    safeLog.warn("capability.budget", "grok daily token ceiling", {
      agent: String(agent),
      used: s.grokTokensUsed,
      max: s.grokMaxTokens,
    });
    return {
      allowed: false,
      reason: "budget_exhausted",
      remaining: Math.max(0, s.grokMaxTokens - s.grokTokensUsed),
    };
  }
  const softMax = Math.max(1, Math.floor(s.grokMaxTokens * PER_AGENT_SOFT_FRACTION));
  const used = s.grokByAgent.get(String(agent)) ?? 0;
  if (used + tokens > softMax) {
    return {
      allowed: false,
      reason: "agent_soft_cap",
      remaining: Math.max(0, softMax - used),
    };
  }
  s.grokTokensUsed += tokens;
  s.grokByAgent.set(String(agent), used + tokens);
  return {
    allowed: true,
    remaining: Math.max(0, s.grokMaxTokens - s.grokTokensUsed),
  };
}

export function recordPubMedCall(agent: CapabilityAgentId): void {
  const s = ensureDay();
  s.pubmedCalls += 1;
  s.pubmedByAgent.set(String(agent), (s.pubmedByAgent.get(String(agent)) ?? 0) + 1);
}

export function snapshotBudgets(): {
  dayKey: string;
  firecrawl: FirecrawlBudget;
  firecrawlByAgent: AgentSpendSlice[];
  grok: { tokensUsed: number; maxTokens: number; byAgent: AgentSpendSlice[] };
  pubmed: { calls: number; byAgent: AgentSpendSlice[] };
} {
  const s = ensureDay();
  const mapToSlices = (m: Map<string, number>, kind: "credits" | "tokens" | "calls") =>
    Array.from(m.entries()).map(([agent, n]) => ({
      agent,
      credits: kind === "credits" ? n : 0,
      tokens: kind === "tokens" ? n : 0,
      calls: kind === "calls" ? n : 0,
    }));
  return {
    dayKey: s.dayKey,
    firecrawl: { ...s.firecrawl },
    firecrawlByAgent: mapToSlices(s.firecrawlByAgent, "credits"),
    grok: {
      tokensUsed: s.grokTokensUsed,
      maxTokens: s.grokMaxTokens,
      byAgent: mapToSlices(s.grokByAgent, "tokens"),
    },
    pubmed: {
      calls: s.pubmedCalls,
      byAgent: mapToSlices(s.pubmedByAgent, "calls"),
    },
  };
}

export function budgetEventMeta(
  capability: CapabilityId,
  agent: CapabilityAgentId
): Record<string, unknown> {
  const snap = snapshotBudgets();
  return {
    capability,
    agent: String(agent),
    dayKey: snap.dayKey,
    firecrawlCreditsUsed: snap.firecrawl.creditsUsed,
    firecrawlMaxCredits: snap.firecrawl.maxCredits,
    grokTokensUsed: snap.grok.tokensUsed,
    grokMaxTokens: snap.grok.maxTokens,
  };
}
