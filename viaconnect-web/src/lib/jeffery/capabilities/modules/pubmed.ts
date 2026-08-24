/**
 * Registry PubMed capability: shared NCBI E-utilities (214b).
 */

import {
  pubmedEsearch,
  pubmedEsummary,
  pubmedEfetchAbstracts,
} from "@/lib/hounddog/ingest/pubmed";
import { recordPubMedCall, budgetEventMeta } from "../budgets";
import type { CapabilityAgentId, CapabilityResult } from "../types";
import { logCapabilityUsage } from "../logUsage";

export interface PubMedQueryResult {
  pmids: string[];
  summaries: Array<{ pmid: string; title: string; pubDate?: string; abstract?: string }>;
}

export async function capPubMedSearch(
  agent: CapabilityAgentId,
  term: string,
  opts?: { mindate?: string; retmax?: number; includeAbstracts?: boolean }
): Promise<CapabilityResult<PubMedQueryResult>> {
  const t0 = Date.now();
  const mindate = opts?.mindate ?? "2020/01/01";
  const retmax = opts?.retmax ?? 5;
  const queryShape = `pubmed:${term.slice(0, 100)}`;

  try {
    recordPubMedCall(agent);
    const pmids = await pubmedEsearch(term, mindate, retmax);
    const summaries = await pubmedEsummary(pmids);
    let abstracts = new Map<string, string>();
    if (opts?.includeAbstracts !== false && pmids.length > 0) {
      abstracts = await pubmedEfetchAbstracts(pmids.slice(0, 5));
    }
    const data: PubMedQueryResult = {
      pmids,
      summaries: summaries.map((s) => ({
        ...s,
        abstract: abstracts.get(s.pmid)?.slice(0, 500),
      })),
    };
    const usage = {
      agent: String(agent),
      capability: "pubmed" as const,
      queryShape,
      credits: 0,
      tokens: 0,
      outcome: pmids.length > 0 ? ("ok" as const) : ("partial" as const),
      reason: pmids.length === 0 ? "no_results" : undefined,
      durationMs: Date.now() - t0,
      meta: { ...budgetEventMeta("pubmed", agent), hitCount: pmids.length },
    };
    await logCapabilityUsage(usage);
    return {
      ok: true,
      data,
      usage,
      marshallGateRequired: true,
      marshallApproved: false,
    };
  } catch (err) {
    const usage = {
      agent: String(agent),
      capability: "pubmed" as const,
      queryShape,
      credits: 0,
      tokens: 0,
      outcome: "failed" as const,
      reason: err instanceof Error ? err.message : "pubmed_error",
      durationMs: Date.now() - t0,
      meta: budgetEventMeta("pubmed", agent),
    };
    await logCapabilityUsage(usage);
    return {
      ok: false,
      reason: usage.reason,
      usage,
      marshallGateRequired: true,
      marshallApproved: false,
    };
  }
}
