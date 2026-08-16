/**
 * Prompt 219H: continuous ops unit tests.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_CADENCE_SEED,
  HANNAH_LIGHT_PASS_TOUCHES,
  HANNAH_FULL_COMPILE_TOUCHES,
} from "../types";
import { jobsDueNow } from "../cadence";
import { projectDailyBudgetConsumption } from "../budgetQueue";
import type { CadenceJob } from "../types";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("Prompt 219H cadence matrix", () => {
  it("seeds core jobs with Section 1 defaults", () => {
    const keys = DEFAULT_CADENCE_SEED.map((j) => j.job_key);
    expect(keys).toContain("hounddog.discovery");
    expect(keys).toContain("hounddog.pubmed");
    expect(keys).toContain("marshall.gate");
    expect(keys).toContain("sherlock.curate");
    expect(keys).toContain("digest.rollup");
    expect(keys).toContain("hannah.light_freshness");
    expect(keys).toContain("hannah.full_compile");
    expect(keys).toContain("watchdog.tick");
    expect(keys).toContain("elysium.allowlist");
    expect(keys).toContain("thanos.allowlist");

    const discovery = DEFAULT_CADENCE_SEED.find((j) => j.job_key === "hounddog.discovery");
    expect(discovery?.interval_minutes).toBe(360);
    const pubmed = DEFAULT_CADENCE_SEED.find((j) => j.job_key === "hounddog.pubmed");
    expect(pubmed?.interval_minutes).toBe(720);
    const light = DEFAULT_CADENCE_SEED.find((j) => j.job_key === "hannah.light_freshness");
    expect(light?.interval_minutes).toBe(240);
    const digest = DEFAULT_CADENCE_SEED.find((j) => j.job_key === "digest.rollup");
    expect(digest?.interval_minutes).toBe(60);
  });

  it("jobsDueNow schedules never-run cron_tick jobs", () => {
    const jobs: CadenceJob[] = DEFAULT_CADENCE_SEED.map((j) => ({
      ...j,
      last_run_at: null,
      last_status: null,
      next_run_at: null,
    }));
    const due = jobsDueNow(jobs, new Date());
    expect(due.some((j) => j.job_key === "hounddog.discovery")).toBe(true);
    expect(due.every((j) => j.mechanism !== "cron_daily" || j.job_key === "watchdog.tick")).toBe(
      true
    );
  });

  it("Hannah light vs full compile touches are disjoint for heavy work", () => {
    for (const t of HANNAH_LIGHT_PASS_TOUCHES) {
      expect(HANNAH_FULL_COMPILE_TOUCHES).not.toContain(t as never);
    }
    expect(HANNAH_FULL_COMPILE_TOUCHES).toContain("supplier_digests");
  });
});

describe("Prompt 219H budget projection", () => {
  it("returns projection and may flag ceilings without raising them", () => {
    const p = projectDailyBudgetConsumption();
    expect(p.firecrawl.projectedCredits).toBeGreaterThan(0);
    expect(p.firecrawl.ceilingCredits).toBeGreaterThan(0);
    expect(p.grok.projectedTokens).toBeGreaterThan(0);
    expect(Array.isArray(p.flags)).toBe(true);
  });
});

describe("Prompt 219H source shape", () => {
  it("migration defines cadence, events, dead letters, freshness, backlog", () => {
    const sql = read("supabase/migrations/20260816010000_prompt_219h_continuous_ops.sql");
    expect(sql).toMatch(/agent_cadence_jobs/);
    expect(sql).toMatch(/platform_events/);
    expect(sql).toMatch(/agent_job_dead_letters/);
    expect(sql).toMatch(/freshness_targets/);
    expect(sql).toMatch(/agent_job_backlog/);
    expect(sql).toMatch(/hounddog\.discovery/);
  });

  it("vercel.json schedules ops-tick every 15 minutes", () => {
    const v = read("vercel.json");
    expect(v).toMatch(/\/api\/cron\/ops-tick/);
    expect(v).toMatch(/\*\/15 \* \* \* \*/);
  });

  it("ops tick and ACC panel exist", () => {
    expect(read("src/app/api/cron/ops-tick/route.ts")).toMatch(/runOpsTick/);
    expect(read("src/app/api/admin/jeffery/ops/route.ts")).toMatch(/coalesce_test/);
    expect(read("src/components/admin/jeffery/ContinuousOpsPanel.tsx")).toMatch(
      /Continuous operations/
    );
    expect(read("src/app/(app)/admin/jeffery/JefferyClient.tsx")).toMatch(/Ops 24\/7/);
  });

  it("meal confirm emits platform event", () => {
    const src = read("src/app/api/nutrition/confirm/route.ts");
    expect(src).toMatch(/emitPlatformEvent/);
    expect(src).toMatch(/meal_logged/);
  });

  it("definition discipline: no self-modifying agent code patterns in ops", () => {
    const tick = read("src/lib/jeffery/ops/tick.ts");
    expect(tick).not.toMatch(/eval\(/);
    expect(tick).not.toMatch(/new Function/);
    expect(tick).not.toMatch(/writeFileSync.*prompt/);
  });
});
