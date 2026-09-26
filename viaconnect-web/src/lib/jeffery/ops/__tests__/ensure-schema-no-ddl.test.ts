/**
 * Prompt 219H incident: schema presence checks must not apply DDL or
 * touch pg_cron, including when PostgREST schema cache is unavailable.
 * Database access is mocked. No live Postgres connection.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ENV_KEYS = [
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_PRISMA_URL",
  "DATABASE_URL",
  "POSTGRES_HOST",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "POSTGRES_DATABASE",
] as const;

const { createAdminClientOrNull, postgresDefault, unsafe } = vi.hoisted(() => {
  const unsafe = vi.fn(async (_query: string) => undefined);
  const end = vi.fn(async () => undefined);
  const tagged = vi.fn(async () => [{ n: 0 }]);
  const sql = Object.assign(tagged, { unsafe, end });
  return {
    createAdminClientOrNull: vi.fn(),
    postgresDefault: vi.fn(() => sql),
    unsafe,
  };
});

vi.mock("postgres", () => ({
  default: postgresDefault,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
  createAdminClientOrNull,
}));

vi.mock("@/lib/utils/safe-log", () => ({
  safeLog: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../cadence", () => ({
  loadCadenceJobs: vi.fn(async () => []),
  jobsDueNow: vi.fn(() => []),
}));

vi.mock("../jobRunners", () => ({
  runCadenceJob: vi.fn(),
}));

vi.mock("../eventBus", () => ({
  processPendingEvents: vi.fn(async () => ({ processed: 0, failed: 0 })),
}));

vi.mock("../watchdog", () => ({
  runWatchdog: vi.fn(async () => ({
    checked: 0,
    missed: [],
    retried: [],
    deadLettered: [],
    stuck: [],
  })),
}));

vi.mock("../budgetQueue", () => ({
  resumeBacklogIfPossible: vi.fn(async () => ({ resumed: 0 })),
}));

vi.mock("../freshness", () => ({
  measureFreshness: vi.fn(async () => []),
}));

vi.mock("../heartbeats", () => ({
  ensureAgentRegistrySeats: vi.fn(async () => ({ ensured: 0 })),
  loadPausedAgentIds: vi.fn(async () => new Set<string>()),
  writeAgentJobHeartbeat: vi.fn(async () => undefined),
}));

vi.mock("../discoveryCursors", () => ({
  listDiscoveryCursors: vi.fn(async () => []),
}));

vi.mock("@/lib/agents/command-center-ingest", () => ({
  pollGithubPrsForCommandCenter: vi.fn(async () => undefined),
}));

import { safeLog } from "@/lib/utils/safe-log";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

type PostgrestLike = { code: string; message: string };

function clientReturning(error: PostgrestLike | null) {
  return {
    from: () => ({
      select: () => ({
        limit: async () => ({ data: error ? null : [{ job_key: "watchdog.tick" }], error }),
      }),
    }),
  };
}

async function loadEnsure() {
  const mod = await import("../ensureSchema");
  return mod.ensureContinuousOpsSchema;
}

async function loadTick() {
  const mod = await import("../tick");
  return mod.runOpsTick;
}

function expectNoDdl(): void {
  expect(postgresDefault).not.toHaveBeenCalled();
  expect(unsafe).not.toHaveBeenCalled();
}

let savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

beforeEach(() => {
  savedEnv = {};
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  // Old apply path opens a direct connection whenever this is set.
  // Port 1 is closed; the postgres driver is mocked and must not be called.
  process.env.POSTGRES_URL_NON_POOLING =
    "postgresql://postgres:unused@127.0.0.1:1/postgres";
  vi.clearAllMocks();
  vi.resetModules();
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const prior = savedEnv[key];
    if (prior === undefined) delete process.env[key];
    else process.env[key] = prior;
  }
});

describe("ensureContinuousOpsSchema never applies DDL", () => {
  it("fails open on PGRST002 without postgres or pg_cron", async () => {
    createAdminClientOrNull.mockReturnValue(
      clientReturning({
        code: "PGRST002",
        message: "Could not query the database for the schema cache. Retrying.",
      })
    );
    const ensure = await loadEnsure();
    const result = await ensure();
    expectNoDdl();
    expect(result.applied).toBe(false);
    expect(result.ok).toBe(true);
    expect(result.reason).toContain("PGRST002");
    expect(safeLog.warn).toHaveBeenCalled();
  });

  it("fails open on PGRST205 without postgres or pg_cron", async () => {
    createAdminClientOrNull.mockReturnValue(
      clientReturning({
        code: "PGRST205",
        message: "Could not find the table 'public.agent_cadence_jobs' in the schema cache",
      })
    );
    const ensure = await loadEnsure();
    const result = await ensure();
    expectNoDdl();
    expect(result.applied).toBe(false);
    expect(result.ok).toBe(true);
    expect(result.reason).toContain("PGRST205");
    expect(safeLog.warn).toHaveBeenCalled();
  });

  it("fails open when the admin client is null", async () => {
    createAdminClientOrNull.mockReturnValue(null);
    const ensure = await loadEnsure();
    const result = await ensure();
    expectNoDdl();
    expect(result.applied).toBe(false);
    expect(result.ok).toBe(true);
    expect(result.reason).toContain("null_admin_client");
    expect(safeLog.warn).toHaveBeenCalled();
  });

  it("fails open when the admin client throws", async () => {
    createAdminClientOrNull.mockImplementation(() => {
      throw new Error("admin client exploded");
    });
    const ensure = await loadEnsure();
    const result = await ensure();
    expectNoDdl();
    expect(result.applied).toBe(false);
    expect(result.ok).toBe(true);
    expect(result.reason).toContain("admin client exploded");
    expect(safeLog.error).toHaveBeenCalled();
  });

  it("does not apply DDL when the table is present", async () => {
    createAdminClientOrNull.mockReturnValue(clientReturning(null));
    const ensure = await loadEnsure();
    const result = await ensure();
    expectNoDdl();
    expect(result).toEqual({
      ok: true,
      applied: false,
      reason: "tables_present",
    });
  });
});

describe("ops tick fails open when the presence check cannot confirm tables", () => {
  it.each([
    ["PGRST002", { code: "PGRST002", message: "schema cache unavailable" }],
    [
      "PGRST205",
      {
        code: "PGRST205",
        message: "Could not find the table 'public.agent_cadence_jobs' in the schema cache",
      },
    ],
  ])("continues the tick on %s", async (_label, error) => {
    createAdminClientOrNull.mockReturnValue(clientReturning(error));
    const runOpsTick = await loadTick();
    const result = await runOpsTick();
    expectNoDdl();
    expect(result.endedAt).toEqual(expect.any(String));
    expect(result.schema).toEqual(
      expect.objectContaining({ ok: true, applied: false })
    );
    expect(result.jobsRun).toEqual([]);
  });

  it("continues the tick when the admin client is null", async () => {
    createAdminClientOrNull.mockReturnValue(null);
    const runOpsTick = await loadTick();
    const result = await runOpsTick();
    expectNoDdl();
    expect(result.schema?.applied).toBe(false);
    expect(result.endedAt).toEqual(expect.any(String));
  });

  it("continues the tick when the admin client throws", async () => {
    createAdminClientOrNull.mockImplementation(() => {
      throw new Error("admin client exploded");
    });
    const runOpsTick = await loadTick();
    const result = await runOpsTick();
    expectNoDdl();
    expect(result.schema?.applied).toBe(false);
    expect(result.schema?.reason).toContain("admin client exploded");
    expect(result.endedAt).toEqual(expect.any(String));
  });
});

describe("runtime sources do not reschedule continuous-ops cron", () => {
  it("soak-stage1 does not call cron.schedule or cron.unschedule", () => {
    const src = read("src/app/api/cron/soak-stage1/route.ts");
    expect(src).not.toMatch(/cron\.schedule/);
    expect(src).not.toMatch(/cron\.unschedule/);
    expect(src).not.toMatch(/cron\.alter_job/);
  });

  it("ensureSchema source has no DDL and no direct postgres client", () => {
    const src = read("src/lib/jeffery/ops/ensureSchema.ts");
    expect(src).not.toMatch(/cron\.schedule/);
    expect(src).not.toMatch(/cron\.unschedule/);
    expect(src).not.toMatch(/cron\.alter_job/);
    expect(src).not.toMatch(/sql\.unsafe/);
    expect(src).not.toMatch(/import\(["']postgres["']\)/);
    expect(src).not.toMatch(/\bCREATE TABLE\b/);
    expect(src).not.toMatch(/\bCREATE OR REPLACE FUNCTION\b/);
  });

  it("the three embedded cadence seeds live in a migration without cron registration", () => {
    const dir = join(root, "supabase/migrations");
    const hits = readdirSync(dir).filter((name) => {
      if (!name.endsWith(".sql")) return false;
      const sql = readFileSync(join(dir, name), "utf8");
      return (
        sql.includes("jeffery.kb_review") &&
        sql.includes("hounddog.competitive") &&
        sql.includes("elysium.genetic_tests")
      );
    });
    expect(hits.length).toBe(1);
    const sql = readFileSync(join(dir, hits[0] ?? ""), "utf8");
    expect(sql).not.toMatch(/cron\.schedule/);
    expect(sql).not.toMatch(/cron\.unschedule/);
    expect(sql).not.toMatch(/cron\.alter_job/);
    expect(sql).not.toMatch(/NOTIFY\s+pgrst/i);
    expect(sql).not.toMatch(/\bCREATE TABLE\b/);
  });
});
