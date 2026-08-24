/**
 * Prompt 219J: 24/7 execution engine — heartbeats, stale definition, ops wiring.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  STALE_MULTIPLIER,
  DEFAULT_EXPECTED_PERIOD_MINUTES,
  STALE_THRESHOLD_MS,
  deriveStatus,
  staleThresholdMs,
} from "@/lib/agents/status";
import {
  isUuidString,
  resolveHeartbeatRunId,
} from "@/lib/jeffery/ops/heartbeats";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("Prompt 219J Stale contract", () => {
  it("defines Stale as 2x expected period (default 15m ops-tick → 30m)", () => {
    expect(STALE_MULTIPLIER).toBe(2);
    expect(DEFAULT_EXPECTED_PERIOD_MINUTES).toBe(15);
    expect(STALE_THRESHOLD_MS).toBe(30 * 60 * 1000);
    expect(staleThresholdMs(360)).toBe(360 * 2 * 60 * 1000);
  });

  it("null heartbeat is idle not stale", () => {
    expect(deriveStatus(null)).toBe("idle");
  });
});

describe("Prompt 219J heartbeat p_run_id UUID contract", () => {
  it("accepts UUID-shaped strings and rejects ops run ids", () => {
    expect(isUuidString("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isUuidString("ops-marshall.gate-1734")).toBe(false);
    expect(isUuidString("marshall.gate")).toBe(false);
    expect(isUuidString(undefined)).toBe(false);
    expect(isUuidString(null)).toBe(false);
  });

  it("reuses caller UUID as p_run_id", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const r = resolveHeartbeatRunId(uuid);
    expect(r.pRunId).toBe(uuid);
    expect(r.opsRunId).toBeNull();
    expect(isUuidString(r.pRunId)).toBe(true);
  });

  it("mints UUID when ops run id is non-UUID and keeps ops correlation", () => {
    const ops = "ops-marshall.gate-1734";
    const r = resolveHeartbeatRunId(ops);
    expect(isUuidString(r.pRunId)).toBe(true);
    expect(r.pRunId).not.toBe(ops);
    expect(r.opsRunId).toBe(ops);
  });

  it("mints UUID when runId is missing", () => {
    const r = resolveHeartbeatRunId(undefined);
    expect(isUuidString(r.pRunId)).toBe(true);
    expect(r.opsRunId).toBeNull();
  });

  it("writeAgentJobHeartbeat never passes non-UUID as p_run_id (source shape)", () => {
    const src = read("src/lib/jeffery/ops/heartbeats.ts");
    // Must not fall back to jobKey / raw runId for the RPC uuid arg
    expect(src).not.toMatch(/p_run_id:\s*args\.runId\s*\?\?\s*args\.jobKey/);
    expect(src).toMatch(/resolveHeartbeatRunId/);
    expect(src).toMatch(/p_run_id:\s*pRunId/);
    expect(src).toMatch(/ops_run_id/);
    expect(src).toMatch(/run_id_text/);
    expect(src).toMatch(/crypto\.randomUUID/);
  });
});

describe("Prompt 219J execution wiring (source shape)", () => {
  it("ops-tick registers seats and writes Jeffery heartbeat", () => {
    const src = read("src/lib/jeffery/ops/tick.ts");
    expect(src).toMatch(/ensureAgentRegistrySeats/);
    expect(src).toMatch(/writeAgentJobHeartbeat/);
    expect(src).toMatch(/loadPausedAgentIds/);
    expect(src).toMatch(/watchdog\.tick/);
  });

  it("job runners emit start and complete heartbeats", () => {
    const src = read("src/lib/jeffery/ops/jobRunners.ts");
    expect(src).toMatch(/eventType: "start"/);
    expect(src).toMatch(/eventType: "complete"/);
    expect(src).toMatch(/agent_paused/);
  });

  it("heartbeats target ultrathink_agent_heartbeat RPC (ACC SOT)", () => {
    const src = read("src/lib/jeffery/ops/heartbeats.ts");
    expect(src).toMatch(/ultrathink_agent_heartbeat/);
    expect(src).toMatch(/DISPATCH/);
    expect(src).toMatch(/ops-tick/);
  });

  it("ensureAgentRegistrySeats never inserts invented seats", () => {
    const src = read("src/lib/jeffery/ops/heartbeats.ts");
    expect(src).not.toMatch(/ultrathink_agent_registry"\)\.insert/);
    expect(src).toMatch(/if \(!existing\?\.id\)/);
    expect(src).toMatch(/continue/);
  });

  it("vercel.json registers ops-tick every 15 minutes", () => {
    const v = read("vercel.json");
    expect(v).toMatch(/\/api\/cron\/ops-tick/);
    expect(v).toMatch(/\*\/15 \* \* \* \*/);
  });

  it("pause route persists is_active false", () => {
    const src = read("src/app/api/admin/agents/[id]/status/route.ts");
    expect(src).toMatch(/is_active/);
    expect(src).toMatch(/await createServerClient/);
  });

  it("activity-tracker never invents epoch heartbeats", () => {
    const src = read("src/lib/agents/activity-tracker.ts");
    expect(src).not.toMatch(/new Date\(0\)/);
  });
});
