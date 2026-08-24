import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import IdleRosterPanel from "../panels/IdleRosterPanel";
import { AGENT_REGISTRY } from "@/lib/agents/registry";

afterEach(() => cleanup());

describe("IdleRosterPanel", () => {
  it("stays idle and empty when a Grok seat has no ops row", () => {
    const { container } = render(
      <IdleRosterPanel
        registry={AGENT_REGISTRY.picasso}
        heartbeat={null}
        tasks={[]}
        events={[]}
      />,
    );
    const text = container.textContent ?? "";
    expect(text).toContain("No Command Center ops row");
    expect(text).toContain("Idle. No tasks queued or running.");
    expect(text).toContain("Tasks done (24h)");
    expect(text).toContain("0");
    expect(text).not.toMatch(/security_advisor|performance_advisor|gordon/i);
  });
});
