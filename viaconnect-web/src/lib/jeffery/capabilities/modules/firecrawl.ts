/**
 * Registry Firecrawl capability: single shared module (wraps 214b client).
 * Agents never import the low-level client for agent work; they invoke via registry.
 */

import {
  firecrawlScrape,
  firecrawlSearch,
  isFirecrawlConfigured,
  type ScrapeResult,
} from "@/lib/hounddog/firecrawl/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { tryReserveFirecrawlAsync, budgetEventMeta } from "../budgets";
import type { CapabilityAgentId, CapabilityResult } from "../types";
import { CAPABILITY_DEFINITIONS } from "../types";
import { logCapabilityUsage } from "../logUsage";

export async function capFirecrawlScrape(
  agent: CapabilityAgentId,
  url: string
): Promise<CapabilityResult<ScrapeResult>> {
  const t0 = Date.now();
  const queryShape = `scrape:${url.slice(0, 120)}`;
  const reserve = await tryReserveFirecrawlAsync(createAdminClient(), agent, 1, 1);
  if (!reserve.allowed) {
    const usage = {
      agent: String(agent),
      capability: "firecrawl" as const,
      queryShape,
      credits: 0,
      tokens: 0,
      outcome: "budget_exhausted" as const,
      reason: reserve.reason,
      durationMs: Date.now() - t0,
      meta: budgetEventMeta("firecrawl", agent),
    };
    await logCapabilityUsage(usage);
    return {
      ok: false,
      skipped: true,
      reason: reserve.reason,
      usage,
      marshallGateRequired: true,
      marshallApproved: false,
    };
  }

  // Spend already recorded in tryReserve; pass a budget that still allows the call
  // by using a local budget clone that pretends capacity remains for the client.
  const localBudget = {
    pagesUsed: 0,
    creditsUsed: 0,
    maxPages: 1,
    maxCredits: 1,
    hitBudget: false,
  };
  const data = await firecrawlScrape(url, localBudget);
  const usage = {
    agent: String(agent),
    capability: "firecrawl" as const,
    queryShape,
    credits: 1,
    tokens: 0,
    outcome: data.ok ? ("ok" as const) : data.skipped ? ("skipped" as const) : ("failed" as const),
    reason: data.reason,
    durationMs: Date.now() - t0,
    meta: {
      ...budgetEventMeta("firecrawl", agent),
      configured: isFirecrawlConfigured(),
    },
  };
  await logCapabilityUsage(usage);
  return {
    ok: data.ok,
    skipped: data.skipped,
    reason: data.reason,
    data,
    usage,
    marshallGateRequired: CAPABILITY_DEFINITIONS.firecrawl.requiresMarshallGate,
    marshallApproved: false,
  };
}

export async function capFirecrawlSearch(
  agent: CapabilityAgentId,
  query: string,
  limit = 5
): Promise<
  CapabilityResult<{ results: Array<{ url: string; title?: string; description?: string }> }>
> {
  const t0 = Date.now();
  const queryShape = `search:${query.slice(0, 120)}`;
  const reserve = await tryReserveFirecrawlAsync(createAdminClient(), agent, 1, 1);
  if (!reserve.allowed) {
    const usage = {
      agent: String(agent),
      capability: "firecrawl" as const,
      queryShape,
      credits: 0,
      tokens: 0,
      outcome: "budget_exhausted" as const,
      reason: reserve.reason,
      durationMs: Date.now() - t0,
      meta: budgetEventMeta("firecrawl", agent),
    };
    await logCapabilityUsage(usage);
    return {
      ok: false,
      skipped: true,
      reason: reserve.reason,
      usage,
      marshallGateRequired: true,
      marshallApproved: false,
    };
  }

  const localBudget = {
    pagesUsed: 0,
    creditsUsed: 0,
    maxPages: 1,
    maxCredits: 1,
    hitBudget: false,
  };
  const res = await firecrawlSearch(query, localBudget, limit);
  const usage = {
    agent: String(agent),
    capability: "firecrawl" as const,
    queryShape,
    credits: 1,
    tokens: 0,
    outcome: res.ok ? ("ok" as const) : ("failed" as const),
    reason: res.reason,
    durationMs: Date.now() - t0,
    meta: budgetEventMeta("firecrawl", agent),
  };
  await logCapabilityUsage(usage);
  return {
    ok: res.ok,
    reason: res.reason,
    data: { results: res.results },
    usage,
    marshallGateRequired: true,
    marshallApproved: false,
  };
}
