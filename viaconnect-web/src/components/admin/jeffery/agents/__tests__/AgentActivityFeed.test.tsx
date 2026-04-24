import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import AgentActivityFeed from "../AgentActivityFeed";
import type { AgentActivityEvent } from "@/lib/agents/types";

afterEach(() => cleanup());

function e(overrides: Partial<AgentActivityEvent> = {}): AgentActivityEvent {
  return {
    id: "1",
    agent_id: "jeffery",
    event_type: "info",
    severity: "info",
    message: "hello",
    metadata: {},
    correlation_id: null,
    user_id: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("AgentActivityFeed", () => {
  it("renders empty state when events is empty", () => {
    const { getByText } = render(<AgentActivityFeed events={[]} />);
    expect(getByText(/No activity in the last 24 hours/i)).toBeTruthy();
  });

  it("renders first 30 by default; Show older reveals more", () => {
    const events = Array.from({ length: 45 }, (_, i) => e({ id: `e${i}`, message: `m${i}` }));
    const { getAllByText, getByRole } = render(<AgentActivityFeed events={events} />);
    expect(getAllByText(/m\d+/).length).toBe(30);
    const btn = getByRole("button", { name: /Show older/i });
    btn.click();
    expect(getAllByText(/m\d+/).length).toBe(45);
  });

  it("includes each event message in output", () => {
    const { container } = render(
      <AgentActivityFeed
        events={[
          e({ id: "a", severity: "info", message: "info-msg" }),
          e({ id: "b", severity: "warn", message: "warn-msg" }),
          e({ id: "c", severity: "error", message: "err-msg" }),
        ]}
      />,
    );
    expect(container.textContent).toContain("info-msg");
    expect(container.textContent).toContain("warn-msg");
    expect(container.textContent).toContain("err-msg");
  });
});
