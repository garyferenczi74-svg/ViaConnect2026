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

  it("returns stale when heartbeat is older than threshold", () => {
    const old = hb({ last_heartbeat: new Date(Date.now() - STALE_THRESHOLD_MS - 1000).toISOString() });
    expect(deriveStatus(old)).toBe("stale");
  });

  it("returns paused regardless of age", () => {
    const old = hb({ status: "paused", last_heartbeat: new Date(Date.now() - 120_000).toISOString() });
    expect(deriveStatus(old)).toBe("paused");
  });

  it("passes through degraded status when fresh", () => {
    expect(deriveStatus(hb({ status: "degraded" }))).toBe("degraded");
  });

  it("passes through error status when fresh", () => {
    expect(deriveStatus(hb({ status: "error" }))).toBe("error");
  });
});

describe("STATUS_COLOR", () => {
  it("has a color per status", () => {
    for (const s of ["healthy", "degraded", "error", "idle", "paused", "stale"] as const) {
      expect(STATUS_COLOR[s]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
