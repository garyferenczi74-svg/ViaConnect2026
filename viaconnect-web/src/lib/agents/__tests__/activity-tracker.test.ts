import { describe, it, expect } from "vitest";
import { mapUltrathinkEvent, mapUltrathinkRegistry } from "../activity-tracker";

describe("mapUltrathinkEvent", () => {
  it("maps canonical agent + event_type to spec shape", () => {
    const e = mapUltrathinkEvent({
      id: "e1",
      agent_name: "jeffery",
      event_type: "complete",
      run_id: "r1",
      payload: { message: "scan tick done" },
      severity: "info",
      created_at: "2026-04-24T00:00:00.000Z",
    });
    expect(e).not.toBeNull();
    expect(e!.agent_id).toBe("jeffery");
    expect(e!.event_type).toBe("task_completed");
    expect(e!.message).toBe("scan tick done");
    expect(e!.severity).toBe("info");
  });

  it("returns null for unknown agent", () => {
    const e = mapUltrathinkEvent({
      id: "e2",
      agent_name: "gordan",
      event_type: "heartbeat",
      run_id: null,
      payload: {},
      severity: "info",
      created_at: new Date().toISOString(),
    });
    expect(e).toBeNull();
  });

  it("maps critical severity to error", () => {
    const e = mapUltrathinkEvent({
      id: "e3",
      agent_name: "arnold",
      event_type: "error",
      run_id: null,
      payload: {},
      severity: "critical",
      created_at: new Date().toISOString(),
    });
    expect(e!.severity).toBe("error");
  });

  it("maps unknown event_type to info", () => {
    const e = mapUltrathinkEvent({
      id: "e4",
      agent_name: "sherlock",
      event_type: "data_available",
      run_id: null,
      payload: {},
      severity: "info",
      created_at: new Date().toISOString(),
    });
    expect(e!.event_type).toBe("info");
  });

  it("humanizes event when payload has no message", () => {
    const e = mapUltrathinkEvent({
      id: "e5",
      agent_name: "hannah",
      event_type: "heartbeat",
      run_id: null,
      payload: {},
      severity: "info",
      created_at: new Date().toISOString(),
    });
    expect(e!.message).toContain("Hannah");
  });
});

describe("mapUltrathinkRegistry", () => {
  it("maps healthy status", () => {
    const h = mapUltrathinkRegistry({
      agent_name: "arnold",
      display_name: "Arnold",
      health_status: "healthy",
      last_heartbeat_at: "2026-04-24T00:00:00.000Z",
      consecutive_misses: 0,
      is_active: true,
    });
    expect(h!.status).toBe("healthy");
    expect(h!.health_score).toBe(100);
  });

  it("maps disabled to paused", () => {
    const h = mapUltrathinkRegistry({
      agent_name: "arnold",
      display_name: "Arnold",
      health_status: "disabled",
      last_heartbeat_at: new Date().toISOString(),
      consecutive_misses: 0,
      is_active: true,
    });
    expect(h!.status).toBe("paused");
  });

  it("maps unhealthy to error", () => {
    const h = mapUltrathinkRegistry({
      agent_name: "arnold",
      display_name: "Arnold",
      health_status: "unhealthy",
      last_heartbeat_at: new Date().toISOString(),
      consecutive_misses: 3,
      is_active: true,
    });
    expect(h!.status).toBe("error");
    expect(h!.error_count_24h).toBe(3);
  });

  it("returns null for unknown agent", () => {
    const h = mapUltrathinkRegistry({
      agent_name: "gordan",
      display_name: "Gordan",
      health_status: "healthy",
      last_heartbeat_at: new Date().toISOString(),
      consecutive_misses: 0,
      is_active: true,
    });
    expect(h).toBeNull();
  });
});
