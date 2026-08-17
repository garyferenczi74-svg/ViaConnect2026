/**
 * Prompt 221: kb_search / kb_read capability modules.
 * Only Jeffery-approved + Marshall/Lex gated items are returned (DB hard-block).
 */

import { kbSearch, formatHitsForHannahContext } from "@/lib/kb/search";
import type { KbCollectionSlug } from "@/lib/kb/collections";
import type { EvidenceGrade } from "@/lib/kb/grades";
import { budgetEventMeta } from "../budgets";
import type { CapabilityAgentId, CapabilityResult } from "../types";
import { logCapabilityUsage } from "../logUsage";

export async function capKbSearch(
  agent: CapabilityAgentId,
  query: string,
  opts?: {
    collectionSlugs?: KbCollectionSlug[];
    minGrade?: EvidenceGrade;
    includePractitioner?: boolean;
    limit?: number;
  }
): Promise<
  CapabilityResult<{ hits: Awaited<ReturnType<typeof kbSearch>>; contextBlock: string }>
> {
  const t0 = Date.now();
  const queryShape = `kb_search:${query.slice(0, 100)}`;

  try {
    const hits = await kbSearch(query, {
      collectionSlugs: opts?.collectionSlugs,
      minGrade: opts?.minGrade,
      includePractitioner: opts?.includePractitioner,
      consumerOnly: true,
      limit: opts?.limit ?? 6,
    });
    const contextBlock = formatHitsForHannahContext(hits);
    const usage = {
      agent: String(agent),
      capability: "kb_search" as const,
      queryShape,
      credits: 0,
      tokens: 0,
      outcome: hits.length > 0 ? ("ok" as const) : ("partial" as const),
      durationMs: Date.now() - t0,
      meta: {
        ...budgetEventMeta("kb_search", agent),
        hitCount: hits.length,
      },
    };
    await logCapabilityUsage(usage);
    return {
      ok: true,
      data: { hits, contextBlock },
      usage,
      marshallGateRequired: false,
      marshallApproved: true,
    };
  } catch (err) {
    const usage = {
      agent: String(agent),
      capability: "kb_search" as const,
      queryShape,
      credits: 0,
      tokens: 0,
      outcome: "failed" as const,
      reason: err instanceof Error ? err.message : "kb_search_error",
      durationMs: Date.now() - t0,
      meta: budgetEventMeta("kb_search", agent),
    };
    await logCapabilityUsage(usage);
    return {
      ok: false,
      reason: usage.reason,
      usage,
      marshallGateRequired: false,
      marshallApproved: false,
    };
  }
}

export async function capKbRead(
  agent: CapabilityAgentId,
  query: string,
  limit = 6
): Promise<
  CapabilityResult<{ contextBlock: string; hitCount: number }>
> {
  const r = await capKbSearch(agent, query, { limit });
  if (!r.ok || !r.data) {
    return {
      ok: false,
      reason: r.reason,
      usage: {
        ...r.usage,
        capability: "kb_read",
      },
      marshallGateRequired: false,
      marshallApproved: false,
    };
  }
  return {
    ok: true,
    data: {
      contextBlock: r.data.contextBlock,
      hitCount: r.data.hits.length,
    },
    usage: {
      ...r.usage,
      capability: "kb_read",
      agent: String(agent),
    },
    marshallGateRequired: false,
    marshallApproved: true,
  };
}
