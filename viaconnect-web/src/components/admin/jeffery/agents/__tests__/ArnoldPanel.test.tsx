import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import ArnoldPanel from "../panels/ArnoldPanel";
import { AGENT_REGISTRY } from "@/lib/agents/registry";
import type { AgentCurrentTask } from "@/lib/agents/types";

afterEach(() => cleanup());

function task(title: string): AgentCurrentTask {
  return {
    id: `t-${title}`,
    agent_id: "arnold",
    task_title: title,
    task_description: null,
    task_status: "queued",
    progress_percent: 0,
    priority: "normal",
    assigned_by_agent_id: null,
    correlation_id: null,
    metadata: {},
    started_at: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe("ArnoldPanel", () => {
  it("shows reconcile queue = 0 with muted copy when empty", () => {
    const { container } = render(
      <ArnoldPanel registry={AGENT_REGISTRY.arnold} heartbeat={null} tasks={[]} events={[]} />,
    );
    const text = container.textContent ?? "";
    expect(text).toContain("Reconciliation queue");
    expect(text).toContain("at or below threshold");
  });

  it("shows warn copy when queue depth exceeds 5", () => {
    const tasks = Array.from({ length: 6 }, (_, i) => task(`reconcile user ${i}`));
    const { container } = render(
      <ArnoldPanel registry={AGENT_REGISTRY.arnold} heartbeat={null} tasks={tasks} events={[]} />,
    );
    const text = container.textContent ?? "";
    expect(text).toContain("above threshold");
  });
});
