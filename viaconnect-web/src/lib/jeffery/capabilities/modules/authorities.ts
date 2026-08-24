/**
 * Science & Authorities read capability (authorities_sources allowlist).
 * Read interface only; no raw table coupling for agents outside this module.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  FALLBACK_ALLOWLIST_DOMAINS,
  loadApprovedAllowlistDomains,
  type AuthoritySource,
} from "@/lib/agents/authorityAllowlist";
import type { CapabilityAgentId, CapabilityResult } from "../types";
import { logCapabilityUsage } from "../logUsage";

export interface AuthoritiesReadResult {
  domains: string[];
  sources: Array<Pick<AuthoritySource, "domain" | "label" | "source_kind" | "domain_tags">>;
  filter?: string;
}

export async function capScienceAuthoritiesRead(
  agent: CapabilityAgentId,
  opts?: { domainTag?: string; limit?: number }
): Promise<CapabilityResult<AuthoritiesReadResult>> {
  const t0 = Date.now();
  const tag = opts?.domainTag?.toLowerCase();
  const limit = opts?.limit ?? 40;
  const queryShape = `authorities:${tag ?? "all"}`;

  try {
    const domains = await loadApprovedAllowlistDomains();
    let sources: AuthoritiesReadResult["sources"] = [];

    try {
      const supabase = createAdminClient();
      let q = supabase
        .from("authorities_sources")
        .select("domain, label, source_kind, domain_tags, is_active, approval_status")
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .limit(limit);
      const { data, error } = await q;
      if (!error && Array.isArray(data)) {
        sources = data
          .map((r) => ({
            domain: String((r as { domain?: string }).domain ?? ""),
            label: String((r as { label?: string }).label ?? ""),
            source_kind: String((r as { source_kind?: string }).source_kind ?? ""),
            domain_tags: ((r as { domain_tags?: string[] }).domain_tags ?? []) as string[],
          }))
          .filter((s) => s.domain);
        if (tag) {
          sources = sources.filter(
            (s) =>
              s.domain_tags.some((t) => t.toLowerCase().includes(tag)) ||
              s.source_kind.toLowerCase().includes(tag) ||
              s.label.toLowerCase().includes(tag)
          );
        }
      }
    } catch {
      sources = domains.map((d) => ({
        domain: d,
        label: d,
        source_kind: "fallback",
        domain_tags: [],
      }));
    }

    if (sources.length === 0) {
      sources = (domains.length ? domains : [...FALLBACK_ALLOWLIST_DOMAINS]).map((d) => ({
        domain: d,
        label: d,
        source_kind: "allowlist",
        domain_tags: [],
      }));
    }

    // Thanos/Elysium charter: callers still apply allowlist scoping on crawl URLs.
    const usage = {
      agent: String(agent),
      capability: "science_authorities" as const,
      queryShape,
      credits: 0,
      tokens: 0,
      outcome: "ok" as const,
      durationMs: Date.now() - t0,
      meta: { count: sources.length, tag: tag ?? null },
    };
    await logCapabilityUsage(usage);
    return {
      ok: true,
      data: { domains, sources, filter: tag },
      usage,
      marshallGateRequired: false,
      marshallApproved: true,
    };
  } catch (err) {
    const usage = {
      agent: String(agent),
      capability: "science_authorities" as const,
      queryShape,
      credits: 0,
      tokens: 0,
      outcome: "failed" as const,
      reason: err instanceof Error ? err.message : "authorities_error",
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
