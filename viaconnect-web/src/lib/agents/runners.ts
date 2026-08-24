/**
 * Brief 27: honest ACC runner catalog.
 * A seat has a runner only when it owns a real cadence job or in-app trigger.
 * Grok-only seats (Picasso, Conan, Gene, Martha, Watson) have no runner.
 * Picasso is not launching — no cadence, no Run now.
 */

import type { AgentId } from "./types";
import { AGENT_IDS } from "./types";

export type AccTriggerKind = "cron" | "pg_cron" | "request" | "dev" | "chain";

export interface AccTrigger {
  kind: AccTriggerKind;
  path: string;
}

/**
 * Real triggers only. Empty means no runner — Idle is honest.
 * Do not invent Picasso/Conan/Gene/Martha/Watson jobs.
 */
export const AGENT_TRIGGER_CATALOG: Record<AgentId, AccTrigger[]> = {
  jeffery: [
    { kind: "cron", path: "/api/cron/synchronism-daily" },
    { kind: "cron", path: "/api/cron/ultrathink-feeds" },
    { kind: "pg_cron", path: "ultrathink_phase1_feeds_cron" },
  ],
  picasso: [],
  michelangelo: [{ kind: "dev", path: "CI / OBRA pipeline" }],
  conan: [],
  hermes: [{ kind: "cron", path: "/api/cron/run-hermes-scout" }],
  gene: [],
  elysium: [
    { kind: "chain", path: "synchronism stage ingest + domain_refresh" },
    { kind: "request", path: "genetics interpretation + IGSR watch" },
  ],
  marshall: [
    { kind: "chain", path: "synchronism stage gate" },
    { kind: "request", path: "compliance rules + precheck" },
  ],
  martha: [],
  hannah: [
    { kind: "chain", path: "synchronism stage compose/surface" },
    { kind: "cron", path: "/api/cron/hannah-research" },
  ],
  thanos: [
    { kind: "chain", path: "synchronism stage ingest + domain_refresh" },
    { kind: "request", path: "peptide education allowlist ingest" },
  ],
  elizabeth: [{ kind: "cron", path: "/api/cron/run-elizabeth-research" }],
  lex: [
    { kind: "chain", path: "synchronism stage gate (escalation)" },
    { kind: "request", path: "/api/admin/legal/* + Stage 2 review" },
  ],
  sherlock: [
    { kind: "chain", path: "synchronism stage curate" },
    { kind: "pg_cron", path: "sherlock_research_hub_cron" },
  ],
  watson: [],
  arnold: [
    { kind: "chain", path: "synchronism stage domain_refresh" },
    { kind: "pg_cron", path: "arnold_tick_cron" },
  ],
  hounddog: [
    { kind: "chain", path: "synchronism stage ingest" },
    { kind: "request", path: "/api/hounddog/collectors/tick" },
  ],
};

/**
 * Cadence job_key the seat owns. Never point Run now at another seat's job.
 * Michelangelo / Lex / Arnold / Grok-only seats have no owned cadence job.
 */
export const ACC_OWNED_CADENCE_JOB: Partial<Record<AgentId, string>> = {
  hounddog: "hounddog.pubmed",
  marshall: "marshall.gate",
  sherlock: "sherlock.curate",
  hannah: "hannah.light_freshness",
  jeffery: "digest.rollup",
  elysium: "elysium.allowlist",
  thanos: "thanos.allowlist",
  hermes: "hermes.scout",
  elizabeth: "elizabeth.research",
};

const OWNED_JOB_IDS = new Set(
  (Object.keys(ACC_OWNED_CADENCE_JOB) as AgentId[]).filter((id) => ACC_OWNED_CADENCE_JOB[id]),
);

/** Run now is honest only when this seat owns a cadence job. */
export function agentHasOwnedCadenceJob(id: AgentId): boolean {
  return OWNED_JOB_IDS.has(id);
}

/** Any real trigger (including Michelangelo OBRA). Grok-only seats are false. */
export function agentHasRunner(id: AgentId): boolean {
  return AGENT_TRIGGER_CATALOG[id].length > 0;
}

export function agentHasPauseTarget(id: AgentId): boolean {
  return AGENT_IDS.includes(id);
}

export const GROK_ONLY_IDLE_SEATS: readonly AgentId[] = [
  "picasso",
  "conan",
  "gene",
  "martha",
  "watson",
];
