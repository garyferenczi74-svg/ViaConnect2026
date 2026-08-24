import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import AgentHeader from "../AgentHeader";
import { AGENT_REGISTRY } from "@/lib/agents/registry";

afterEach(() => cleanup());

describe("AgentHeader Brief 27 runner honesty", () => {
  it("disables Run now and Pause when the seat has no runner", () => {
    const { getByTitle } = render(
      <AgentHeader
        registry={AGENT_REGISTRY.picasso}
        heartbeat={null}
        hasOwnedCadenceJob={false}
        hasRunner={false}
      />,
    );
    expect(getByTitle("No runner for this seat").getAttribute("aria-disabled")).toBe("true");
    expect(getByTitle("No runner to pause").getAttribute("aria-disabled")).toBe("true");
  });

  it("keeps Pause available when a runner exists but Run now needs an owned cadence job", () => {
    const { getByTitle } = render(
      <AgentHeader
        registry={AGENT_REGISTRY.michelangelo}
        heartbeat={null}
        hasOwnedCadenceJob={false}
        hasRunner={true}
      />,
    );
    expect(getByTitle("No runner for this seat").getAttribute("aria-disabled")).toBe("true");
    expect(getByTitle("Pause this seat").getAttribute("aria-disabled")).toBe("false");
  });
});
