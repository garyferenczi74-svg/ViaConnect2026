import { describe, it, expect } from "vitest";
import { deriveStatus, STALE_THRESHOLD_MS, STATUS_COLOR } from "../status";
import type { AgentHeartbeat } from "../types";

function hb(overrides: Partial<AgentHeartbeat> = {}): AgentHeartbeat {
  return {
    agent_id: "jeffery",
    status: "healthy",
    last_heartbeat: new Date().toISOString(),
    health_score: 100,
    error_count_24h: 0,
    metadata: {},
    ...overrides,
  };
}

describe("deriveStatus", () => {
  it("returns idle for null heartbeat", () => {
    expect(deriveStatus(null)).toBe("idle");
  });

  it("returns healthy for a fresh healthy heartbeat", () => {
    expect(deriveStatus(hb())).toBe("healthy");
  });

  it("returns stale when heartbeat is older than 2x expected period", () => {
    const old = hb({
      last_heartbeat: new Date(Date.now() - STALE_THRESHOLD_MS - 1000).toISOString(),
    });
    expect(deriveStatus(old)).toBe("stale");
  });

  it("does not mark stale at 30s when default period is 15 minutes", () => {
    const almostOld = hb({
      last_heartbeat: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(deriveStatus(almostOld)).toBe("healthy");
  });

  it("returns idle for empty last_heartbeat (never epoch-stale)", () => {
    expect(deriveStatus(hb({ last_heartbeat: "" }))).toBe("idle");
  });

  it("returns paused regardless of age", () => {
    const old = hb({
      status: "paused",
      last_heartbeat: new Date(Date.now() - 120_000).toISOString(),
    });
    expect(deriveStatus(old)).toBe("paused");
  });

  it("passes through degraded status when fresh", () => {
    expect(deriveStatus(hb({ status: "degraded" }))).toBe("degraded");
  });

  it("passes through error status when fresh", () => {
    expect(deriveStatus(hb({ status: "error" }))).toBe("error");
  });

  it("uses metadata expected_period_minutes for longer cadences", () => {
    // 6h job: 2x = 12h; 1h old is still healthy
    const mid = hb({
      last_heartbeat: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      metadata: { expected_period_minutes: 360 },
    });
    expect(deriveStatus(mid)).toBe("healthy");
    const tooOld = hb({
      last_heartbeat: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(),
      metadata: { expected_period_minutes: 360 },
    });
    expect(deriveStatus(tooOld)).toBe("stale");
  });
});

describe("STATUS_COLOR", () => {
  it("has a color per status", () => {
    for (const s of ["healthy", "degraded", "error", "idle", "paused", "stale"] as const) {
      expect(STATUS_COLOR[s]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
