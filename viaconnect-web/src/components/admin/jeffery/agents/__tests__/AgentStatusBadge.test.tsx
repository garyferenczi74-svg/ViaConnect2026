import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import AgentStatusBadge from "../AgentStatusBadge";

afterEach(() => cleanup());

describe("AgentStatusBadge", () => {
  it("renders each status with a status role", () => {
    const statuses = ["healthy", "degraded", "error", "idle", "paused", "stale"] as const;
    for (const s of statuses) {
      const { getByRole, unmount } = render(<AgentStatusBadge status={s} />);
      expect(getByRole("status")).toBeTruthy();
      unmount();
    }
  });

  it("aria-label incorporates agent name and status label", () => {
    const { getByRole } = render(<AgentStatusBadge status="healthy" agentName="Sherlock" />);
    const node = getByRole("status");
    expect(node.getAttribute("aria-label")).toContain("Sherlock");
    expect(node.getAttribute("aria-label")).toContain("Healthy");
  });

  it("hides text label when withLabel=false", () => {
    const { queryByText } = render(<AgentStatusBadge status="healthy" agentName="Arnold" withLabel={false} />);
    expect(queryByText("Healthy")).toBeNull();
  });
});
