/**
 * Prompt 219H: continuous operations types.
 * Autonomous 24/7 = scheduled + event-triggered with recovery and budgets.
 * Never self-modifying code or prompt rewrite by agents.
 */

export type BudgetClass = "A" | "B" | "C" | "none";
export type JobMechanism = "cron_tick" | "event" | "cron_daily" | "hybrid";

export type PlatformEventType =
  | "meal_logged"
  | "scan_landed"
  | "genetics_confirmed"
  | "lab_uploaded"
  | "wearable_synced"
  | "health_connected"
  | "staging_landed"
  | "content_gated"
  | "purchase_completed"
  | "interpretation_updated"
  | "product_evidence"
  | "manual_refresh"
  | "ci_failure";

export interface CadenceJob {
  job_key: string;
  agent_id: string;
  label: string;
  interval_minutes: number;
  priority: number;
  budget_class: BudgetClass;
  mechanism: JobMechanism;
  enabled: boolean;
  timeout_minutes: number;
  coalesce_window_sec: number;
  config: Record<string, unknown>;
  last_run_at: string | null;
  last_status: string | null;
  next_run_at: string | null;
}

export interface JobRunResult {
  jobKey: string;
  agentId: string;
  status: "ok" | "partial" | "failed" | "skipped" | "budget_queued";
  durationMs: number;
  detail: Record<string, unknown>;
  error?: string;
}

export interface FreshnessReading {
  targetKey: string;
  label: string;
  maxAgeHours: number;
  ageHours: number | null;
  status: "ok" | "warning" | "breach" | "unknown";
  domain: string;
}

/** Default cadence rows when DB seed not applied yet. */
export const DEFAULT_CADENCE_SEED: Omit<
  CadenceJob,
  "last_run_at" | "last_status" | "next_run_at"
>[] = [
  {
    job_key: "hounddog.discovery",
    agent_id: "hounddog",
    label: "Hound Dog broad discovery",
    interval_minutes: 360,
    priority: 40,
    budget_class: "A",
    mechanism: "cron_tick",
    enabled: true,
    timeout_minutes: 45,
    coalesce_window_sec: 300,
    config: { pages: 8 },
  },
  {
    job_key: "hounddog.pubmed",
    agent_id: "hounddog",
    label: "PubMed date-bounded discovery",
    interval_minutes: 720,
    priority: 45,
    budget_class: "B",
    mechanism: "cron_tick",
    enabled: true,
    timeout_minutes: 30,
    coalesce_window_sec: 300,
    config: { retmax: 8 },
  },
  {
    job_key: "hounddog.social",
    agent_id: "hounddog",
    label: "Social relevance sweep",
    interval_minutes: 360,
    priority: 50,
    budget_class: "B",
    mechanism: "cron_tick",
    enabled: true,
    timeout_minutes: 30,
    coalesce_window_sec: 300,
    config: {},
  },
  {
    job_key: "marshall.gate",
    agent_id: "marshall",
    label: "Marshall gate pending staging",
    interval_minutes: 15,
    priority: 10,
    budget_class: "none",
    mechanism: "hybrid",
    enabled: true,
    timeout_minutes: 15,
    coalesce_window_sec: 60,
    config: { sla_minutes: 30 },
  },
  {
    job_key: "sherlock.curate",
    agent_id: "sherlock",
    label: "Sherlock curation sweep",
    interval_minutes: 720,
    priority: 35,
    budget_class: "B",
    mechanism: "hybrid",
    enabled: true,
    timeout_minutes: 40,
    coalesce_window_sec: 300,
    config: { includes_grok: true },
  },
  {
    job_key: "digest.rollup",
    agent_id: "jeffery",
    label: "Domain digest hourly rollup",
    interval_minutes: 60,
    priority: 30,
    budget_class: "none",
    mechanism: "cron_tick",
    enabled: true,
    timeout_minutes: 20,
    coalesce_window_sec: 300,
    config: { domains: ["gordon", "arnold", "elysium", "thanos"] },
  },
  {
    job_key: "hannah.light_freshness",
    agent_id: "hannah",
    label: "Hannah light freshness pass",
    interval_minutes: 240,
    priority: 25,
    budget_class: "C",
    mechanism: "cron_tick",
    enabled: true,
    timeout_minutes: 15,
    coalesce_window_sec: 300,
    config: { mode: "light" },
  },
  {
    job_key: "hannah.full_compile",
    agent_id: "hannah",
    label: "Hannah full daily compile",
    interval_minutes: 1440,
    priority: 20,
    budget_class: "A",
    mechanism: "cron_daily",
    enabled: true,
    timeout_minutes: 120,
    coalesce_window_sec: 600,
    config: { via: "synchronism-daily" },
  },
  {
    job_key: "elysium.allowlist",
    agent_id: "elysium",
    label: "Elysium genetics allowlist crawl",
    interval_minutes: 720,
    priority: 45,
    budget_class: "B",
    mechanism: "cron_tick",
    enabled: true,
    timeout_minutes: 40,
    coalesce_window_sec: 300,
    config: {},
  },
  {
    job_key: "thanos.allowlist",
    agent_id: "thanos",
    label: "Thanos peptide allowlist crawl",
    interval_minutes: 720,
    priority: 45,
    budget_class: "B",
    mechanism: "cron_tick",
    enabled: true,
    timeout_minutes: 40,
    coalesce_window_sec: 300,
    config: {},
  },
  {
    job_key: "security.daily",
    agent_id: "security_advisor",
    label: "Security Advisor daily",
    interval_minutes: 1440,
    priority: 60,
    budget_class: "none",
    // 219J: hybrid so ops-tick can run when due (no dedicated Vercel cron path)
    mechanism: "hybrid",
    enabled: true,
    timeout_minutes: 30,
    coalesce_window_sec: 600,
    config: {},
  },
  {
    job_key: "performance.daily",
    agent_id: "performance_advisor",
    label: "Performance Advisor daily",
    interval_minutes: 1440,
    priority: 60,
    budget_class: "none",
    // 219J: hybrid so ops-tick can run when due
    mechanism: "hybrid",
    enabled: true,
    timeout_minutes: 30,
    coalesce_window_sec: 600,
    config: {},
  },
  {
    job_key: "product.freshness",
    agent_id: "jeffery",
    label: "Product layer evidence freshness",
    interval_minutes: 720,
    priority: 55,
    budget_class: "C",
    mechanism: "hybrid",
    enabled: true,
    timeout_minutes: 30,
    coalesce_window_sec: 300,
    config: { touches: ["ingredient_snp_relevance", "product_content"] },
  },
  {
    job_key: "watchdog.tick",
    agent_id: "jeffery",
    label: "Jeffery watchdog",
    interval_minutes: 15,
    priority: 5,
    budget_class: "none",
    mechanism: "cron_tick",
    enabled: true,
    timeout_minutes: 10,
    coalesce_window_sec: 60,
    config: {},
  },
];

/**
 * Hannah light pass may touch (only):
 * - note staleness flag / recency timestamps
 * - Personalized read recency metadata
 * Must NOT: full multi-supplier compile, full insight rewrite, heavy AI generation.
 */
export const HANNAH_LIGHT_PASS_TOUCHES = [
  "personalized_read_recency",
  "note_staleness",
  "surface_timestamps",
] as const;

export const HANNAH_FULL_COMPILE_TOUCHES = [
  "supplier_digests",
  "accelerators",
  "hannah_note",
  "personalized_read",
  "chain_compose",
] as const;
