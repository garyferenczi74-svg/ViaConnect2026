/**
 * Prompt 219G: shared agent capability layer types.
 * One registry, six capabilities, seven grantee agents.
 */

/** Agents granted the full capability matrix (core seven). */
export const CORE_SEVEN_AGENTS = [
  "jeffery",
  "sherlock",
  "hounddog",
  "hannah",
  "gordon",
  "thanos",
  "elysium",
] as const;

export type CoreSevenAgent = (typeof CORE_SEVEN_AGENTS)[number];

export const CAPABILITY_IDS = [
  "firecrawl",
  "pubmed",
  "grok_research",
  "health_platform",
  "science_authorities",
  "research_hub",
  "kb_search",
  "kb_read",
] as const;

export type CapabilityId = (typeof CAPABILITY_IDS)[number];

export type CapabilityAgentId = CoreSevenAgent | string;

export interface CapabilityDefinition {
  id: CapabilityId;
  label: string;
  description: string;
  /** External research input that must pass Marshall before consumer surfaces. */
  requiresMarshallGate: boolean;
}

export const CAPABILITY_DEFINITIONS: Readonly<Record<CapabilityId, CapabilityDefinition>> = {
  firecrawl: {
    id: "firecrawl",
    label: "Firecrawl",
    description: "Shared web scrape/search (214b). Research input only.",
    requiresMarshallGate: true,
  },
  pubmed: {
    id: "pubmed",
    label: "PubMed",
    description: "NCBI E-utilities discovery with shared rate limit (214b).",
    requiresMarshallGate: true,
  },
  grok_research: {
    id: "grok_research",
    label: "xAI Grok research",
    description:
      "xAI API research/search input. Never user-facing without Marshall gate.",
    requiresMarshallGate: true,
  },
  health_platform: {
    id: "health_platform",
    label: "User health platform data",
    description:
      "Consented Apple Health / Google Health Connect data via digests only.",
    requiresMarshallGate: false,
  },
  science_authorities: {
    id: "science_authorities",
    label: "Science and Authorities",
    description: "Read interface over authorities_sources allowlist (214c).",
    requiresMarshallGate: false,
  },
  research_hub: {
    id: "research_hub",
    label: "Research Hub",
    description:
      "Gated curated research (Sherlock + Hound Dog gated). No ungated staging.",
    requiresMarshallGate: false,
  },
  kb_search: {
    id: "kb_search",
    label: "KB hybrid search",
    description:
      "Prompt 221 hybrid search over Jeffery-approved corpus items with provenance.",
    requiresMarshallGate: false,
  },
  kb_read: {
    id: "kb_read",
    label: "KB read",
    description:
      "Prompt 221 read of Jeffery-approved KB items (fail-closed on pending review).",
    requiresMarshallGate: false,
  },
};

export interface CapabilityCallContext {
  agent: CapabilityAgentId;
  capability: CapabilityId;
  /** Free-text shape for logs (never full PHI). */
  queryShape: string;
  userId?: string;
}

export interface CapabilityUsageRecord {
  agent: string;
  capability: CapabilityId;
  queryShape: string;
  credits: number;
  tokens: number;
  outcome: "ok" | "partial" | "failed" | "denied" | "budget_exhausted" | "skipped";
  reason?: string;
  durationMs: number;
  userId?: string;
  meta?: Record<string, unknown>;
}

export interface CapabilityResult<T = unknown> {
  ok: boolean;
  denied?: boolean;
  skipped?: boolean;
  reason?: string;
  data?: T;
  usage: CapabilityUsageRecord;
  /** Research inputs must not go to consumers without Marshall. */
  marshallGateRequired: boolean;
  marshallApproved: boolean;
}

/** Grok / Firecrawl / PubMed material is research input until Marshall approves. */
export function isConsumerPublishAllowed(result: {
  marshallGateRequired: boolean;
  marshallApproved: boolean;
}): boolean {
  if (!result.marshallGateRequired) return true;
  return result.marshallApproved === true;
}
