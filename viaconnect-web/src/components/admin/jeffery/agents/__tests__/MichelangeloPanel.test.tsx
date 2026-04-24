import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import MichelangeloPanel from "../panels/MichelangeloPanel";
import { AGENT_REGISTRY } from "@/lib/agents/registry";
import type { AgentCurrentTask } from "@/lib/agents/types";

afterEach(() => cleanup());

function task(overrides: Partial<AgentCurrentTask> = {}): AgentCurrentTask {
  return {
    id: "t1",
    agent_id: "michelangelo",
    task_title: "Implement prompt 126",
    task_description: null,
    task_status: "running",
    progress_percent: 50,
    priority: "normal",
    assigned_by_agent_id: null,
    correlation_id: null,
    metadata: {},
    started_at: new Date().toISOString(),
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("MichelangeloPanel", () => {
  it("renders OBRA pipeline with all four gates", () => {
    const { container } = render(
      <MichelangeloPanel
        registry={AGENT_REGISTRY.michelangelo}
        heartbeat={null}
        tasks={[task()]}
        events={[]}
      />,
    );
    const text = container.textContent ?? "";
    expect(text.toLowerCase()).toContain("observe");
    expect(text.toLowerCase()).toContain("blueprint");
    expect(text.toLowerCase()).toContain("review");
    expect(text.toLowerCase()).toContain("audit");
  });

  it("marks gates before the active metadata gate as passed", () => {
    const { getAllByText } = render(
      <MichelangeloPanel
        registry={AGENT_REGISTRY.michelangelo}
        heartbeat={null}
        tasks={[task({ metadata: { obra_gate: "review" } })]}
        events={[]}
      />,
    );
    const passed = getAllByText(/Passed/i);
    expect(passed.length).toBe(2);
  });
});
