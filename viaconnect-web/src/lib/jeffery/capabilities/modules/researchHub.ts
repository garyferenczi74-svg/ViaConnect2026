/**
 * Research Hub read capability for agents.
 * GATED material only: sherlock_curation_items + hounddog_gated_items.
 * UNGATED staging is never exposed here (Hound Dog / Marshall territory).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { CapabilityAgentId, CapabilityResult } from "../types";
import { logCapabilityUsage } from "../logUsage";

export interface ResearchHubItem {
  id: string;
  title: string;
  summary: string;
  provenance: string;
  source: "sherlock_curation" | "hounddog_gated";
  qualityGrade?: string;
  routeTags?: string[];
}

export interface ResearchHubReadResult {
  items: ResearchHubItem[];
  ungatedStagingExcluded: true;
}

export async function capResearchHubRead(
  agent: CapabilityAgentId,
  opts?: { limit?: number; routeTag?: string }
): Promise<CapabilityResult<ResearchHubReadResult>> {
  const t0 = Date.now();
  const limit = opts?.limit ?? 10;
  const queryShape = `research_hub:${opts?.routeTag ?? "gated"}`;

  try {
    const supabase = createAdminClient();
    const items: ResearchHubItem[] = [];

    // Sherlock finished curation
    let sherlockQ = supabase
      .from("sherlock_curation_items")
      .select("id, title, summary, source_url, quality_grade, route_tags, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (opts?.routeTag) {
      sherlockQ = sherlockQ.contains("route_tags", [opts.routeTag]);
    }
    const { data: curated } = await sherlockQ;
    for (const r of curated ?? []) {
      const row = r as {
        id?: string;
        title?: string;
        summary?: string;
        source_url?: string;
        quality_grade?: string;
        route_tags?: string[];
      };
      items.push({
        id: String(row.id ?? ""),
        title: String(row.title ?? "Untitled"),
        summary: String(row.summary ?? "").slice(0, 400),
        provenance: row.source_url ?? `sherlock:${row.id}`,
        source: "sherlock_curation",
        qualityGrade: row.quality_grade,
        routeTags: row.route_tags,
      });
    }

    // Hound Dog GATED only (never staging)
    const { data: gated } = await supabase
      .from("hounddog_gated_items")
      .select("id, title, summary, attribution, approved_at")
      .order("approved_at", { ascending: false })
      .limit(limit);
    for (const r of gated ?? []) {
      const row = r as {
        id?: string;
        title?: string;
        summary?: string;
        attribution?: string;
      };
      items.push({
        id: String(row.id ?? ""),
        title: String(row.title ?? "Gated item"),
        summary: String(row.summary ?? "").slice(0, 400),
        provenance: row.attribution ?? `hounddog_gated:${row.id}`,
        source: "hounddog_gated",
      });
    }

    const usage = {
      agent: String(agent),
      capability: "research_hub" as const,
      queryShape,
      credits: 0,
      tokens: 0,
      outcome: "ok" as const,
      durationMs: Date.now() - t0,
      meta: { itemCount: items.length, ungatedStagingExcluded: true },
    };
    await logCapabilityUsage(usage);
    return {
      ok: true,
      data: { items: items.slice(0, limit * 2), ungatedStagingExcluded: true },
      usage,
      marshallGateRequired: false,
      marshallApproved: true,
    };
  } catch (err) {
    const usage = {
      agent: String(agent),
      capability: "research_hub" as const,
      queryShape,
      credits: 0,
      tokens: 0,
      outcome: "failed" as const,
      reason: err instanceof Error ? err.message : "research_hub_error",
      durationMs: Date.now() - t0,
    };
    await logCapabilityUsage(usage);
    return {
      ok: false,
      reason: usage.reason,
      usage,
      marshallGateRequired: false,
      marshallApproved: true,
    };
  }
}
