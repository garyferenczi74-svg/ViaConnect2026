/**
 * Prompt 219G: Jeffery capability registry (single agent-facing entrypoint).
 * Agents call invokeCapability; they never own per-agent integration copies.
 */

import { isCapabilityGranted } from "./grants";
import { logCapabilityUsage } from "./logUsage";
import {
  CAPABILITY_DEFINITIONS,
  CAPABILITY_IDS,
  CORE_SEVEN_AGENTS,
  isConsumerPublishAllowed,
  type CapabilityAgentId,
  type CapabilityId,
  type CapabilityResult,
} from "./types";
import { capFirecrawlScrape, capFirecrawlSearch } from "./modules/firecrawl";
import { capPubMedSearch } from "./modules/pubmed";
import { capGrokResearch, markMarshallApproved, isGrokConfigured, GROK_MODEL } from "./modules/grok";
import { capScienceAuthoritiesRead } from "./modules/authorities";
import { capResearchHubRead } from "./modules/researchHub";
import { capHealthPlatformRead, HEALTH_PLATFORM_SCOPES } from "./modules/healthPlatform";
import { capKbSearch, capKbRead } from "./modules/kb";
import { snapshotBudgets } from "./budgets";
import type { KbCollectionSlug } from "@/lib/kb/collections";
import type { EvidenceGrade } from "@/lib/kb/grades";

export {
  CAPABILITY_DEFINITIONS,
  CAPABILITY_IDS,
  CORE_SEVEN_AGENTS,
  isConsumerPublishAllowed,
  markMarshallApproved,
  isGrokConfigured,
  GROK_MODEL,
  HEALTH_PLATFORM_SCOPES,
  snapshotBudgets,
};

export type {
  CapabilityAgentId,
  CapabilityId,
  CapabilityResult,
} from "./types";

export type CapabilityAction =
  | { capability: "firecrawl"; action: "scrape"; url: string }
  | { capability: "firecrawl"; action: "search"; query: string; limit?: number }
  | {
      capability: "pubmed";
      action: "search";
      term: string;
      mindate?: string;
      retmax?: number;
      includeAbstracts?: boolean;
    }
  | { capability: "grok_research"; action: "research"; query: string }
  | { capability: "science_authorities"; action: "read"; domainTag?: string; limit?: number }
  | { capability: "research_hub"; action: "read"; routeTag?: string; limit?: number }
  | { capability: "health_platform"; action: "read"; userId: string }
  | {
      capability: "kb_search";
      action: "search";
      query: string;
      collectionSlugs?: KbCollectionSlug[];
      minGrade?: EvidenceGrade;
      includePractitioner?: boolean;
      limit?: number;
    }
  | { capability: "kb_read"; action: "read"; query: string; limit?: number };

async function deny(
  agent: CapabilityAgentId,
  capability: CapabilityId,
  queryShape: string
): Promise<CapabilityResult> {
  const usage = {
    agent: String(agent),
    capability,
    queryShape,
    credits: 0,
    tokens: 0,
    outcome: "denied" as const,
    reason: "not_granted",
    durationMs: 0,
  };
  await logCapabilityUsage(usage);
  return {
    ok: false,
    denied: true,
    reason: "not_granted",
    usage,
    marshallGateRequired: CAPABILITY_DEFINITIONS[capability].requiresMarshallGate,
    marshallApproved: false,
  };
}

/**
 * Invoke a registered capability for an agent. Enforces grant matrix.
 */
export async function invokeCapability(
  agent: CapabilityAgentId,
  action: CapabilityAction
): Promise<CapabilityResult> {
  const capability = action.capability;
  const granted = await isCapabilityGranted(agent, capability);
  if (!granted) {
    return deny(agent, capability, `${capability}:denied`);
  }

  switch (action.capability) {
    case "firecrawl":
      if (action.action === "scrape") return capFirecrawlScrape(agent, action.url);
      return capFirecrawlSearch(agent, action.query, action.limit);
    case "pubmed":
      return capPubMedSearch(agent, action.term, {
        mindate: action.mindate,
        retmax: action.retmax,
        includeAbstracts: action.includeAbstracts,
      });
    case "grok_research":
      return capGrokResearch(agent, action.query);
    case "science_authorities":
      return capScienceAuthoritiesRead(agent, {
        domainTag: action.domainTag,
        limit: action.limit,
      });
    case "research_hub":
      return capResearchHubRead(agent, {
        routeTag: action.routeTag,
        limit: action.limit,
      });
    case "health_platform":
      return capHealthPlatformRead(agent, action.userId);
    case "kb_search":
      return capKbSearch(agent, action.query, {
        collectionSlugs: action.collectionSlugs,
        minGrade: action.minGrade,
        includePractitioner: action.includePractitioner,
        limit: action.limit,
      });
    case "kb_read":
      return capKbRead(agent, action.query, action.limit);
    default: {
      const _exhaustive: never = action;
      return deny(agent, "research_hub", `unknown:${JSON.stringify(_exhaustive)}`);
    }
  }
}

/**
 * Demo suite: one representative call per core-seven agent (Section 4.2).
 * Fail-open when keys/network missing; still logs usage rows when possible.
 */
export async function runCoreSevenCapabilityDemos(opts?: {
  userId?: string;
}): Promise<Array<{ agent: string; capability: string; result: CapabilityResult }>> {
  const userId = opts?.userId ?? "00000000-0000-0000-0000-000000000000";
  const demos: Array<{ agent: CapabilityAgentId; action: CapabilityAction }> = [
    {
      agent: "hannah",
      action: {
        capability: "pubmed",
        action: "search",
        term: "MTHFR polymorphism folate structure function",
        retmax: 2,
        includeAbstracts: true,
      },
    },
    {
      agent: "gordon",
      action: {
        capability: "research_hub",
        action: "read",
        routeTag: "gordon",
        limit: 3,
      },
    },
    {
      agent: "elysium",
      action: {
        capability: "science_authorities",
        action: "read",
        domainTag: "genetic",
        limit: 10,
      },
    },
    {
      agent: "thanos",
      action: {
        capability: "science_authorities",
        action: "read",
        domainTag: "peptide",
        limit: 10,
      },
    },
    {
      agent: "sherlock",
      action: {
        capability: "grok_research",
        action: "research",
        query:
          "Summarize recent peer-reviewed evidence on omega-3 and triglyceride structure-function relationships. Label uncertainty.",
      },
    },
    {
      agent: "hounddog",
      action: {
        capability: "firecrawl",
        action: "search",
        query: "site:nih.gov nutraceutical bioavailability review",
        limit: 2,
      },
    },
    {
      agent: "jeffery",
      action: {
        capability: "research_hub",
        action: "read",
        limit: 5,
      },
    },
  ];

  // Optional health platform demo (user-scoped) attached to jeffery as second pass if needed
  void userId;

  const out: Array<{ agent: string; capability: string; result: CapabilityResult }> = [];
  for (const d of demos) {
    const result = await invokeCapability(d.agent, d.action);
    out.push({ agent: String(d.agent), capability: d.action.capability, result });
  }
  return out;
}
