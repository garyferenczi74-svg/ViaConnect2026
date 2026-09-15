import { describe, expect, it } from "vitest";
import {
  quarantineAgentEnrichment,
  quarantineEvent,
  quarantineHeartbeat,
  quarantineTask,
  safeMetadata,
} from "../quarantineEnrichment";

describe("quarantineAgentEnrichment", () => {
  it("drops null, non-objects, and object-shaped titles/messages", () => {
    const out = quarantineAgentEnrichment({
      heartbeats: [null, { agent_id: "jeffery", status: "idle", last_heartbeat: "" }],
      tasks: [
        null,
        { id: "t1", agent_id: "jeffery", task_title: { nested: true }, task_status: "running" },
        {
          id: "t2",
          agent_id: "jeffery",
          task_title: "Real tick",
          task_status: "running",
          priority: "normal",
          created_at: "2026-09-15T00:00:00.000Z",
          updated_at: "2026-09-15T00:00:00.000Z",
          task_description: null,
          progress_percent: 10,
          assigned_by_agent_id: null,
          correlation_id: null,
          metadata: {},
          started_at: null,
          completed_at: null,
        },
      ],
      events: [
        { id: "e1", message: { bad: true } },
        {
          id: "e2",
          agent_id: "jeffery",
          event_type: "info",
          severity: "info",
          message: "heartbeat",
          metadata: { ok: true },
          correlation_id: null,
          user_id: null,
          created_at: "2026-09-15T00:00:00.000Z",
        },
      ],
    });
    expect(out.tasks).toHaveLength(1);
    expect(out.tasks[0]?.task_title).toBe("Real tick");
    expect(out.events).toHaveLength(1);
    expect(out.events[0]?.message).toBe("heartbeat");
    expect(out.heartbeats).toHaveLength(1);
    expect(out.heartbeats[0]?.agent_id).toBe("jeffery");
  });

  it("does not invent rows when input is empty or non-array", () => {
    expect(quarantineAgentEnrichment({ heartbeats: null, tasks: {}, events: undefined })).toEqual({
      heartbeats: [],
      tasks: [],
      events: [],
    });
    expect(quarantineEvent(null)).toBeNull();
    expect(quarantineTask("nope")).toBeNull();
    expect(quarantineHeartbeat({ status: "healthy" })).toBeNull();
  });

  it("safeMetadata drops circular bags instead of throwing", () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    expect(safeMetadata(circular)).toEqual({});
    expect(safeMetadata("string")).toEqual({});
  });
});
