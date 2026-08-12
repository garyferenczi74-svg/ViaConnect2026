import { describe, it, expect } from "vitest";
import { AGENT_REGISTRY, orderedRegistry, isKnownAgentId } from "../registry";
import { AGENT_IDS } from "../types";

describe("AGENT_REGISTRY (Prompt 214a)", () => {
  it("contains exactly the canonical 11 agents", () => {
    expect(Object.keys(AGENT_REGISTRY).sort()).toEqual([...AGENT_IDS].sort());
    expect(AGENT_IDS).toHaveLength(11);
  });

  it("produces a stable sort order matching Section 1", () => {
    const ids = orderedRegistry().map((r) => r.agent_id);
    expect(ids).toEqual([
      "jeffery",
      "hannah",
      "gordon",
      "arnold",
      "michelangelo",
      "hounddog",
      "sherlock",
      "marshall",
      "lex",
      "security_advisor",
      "performance_advisor",
    ]);
  });

  it("every row has valid accent color from palette", () => {
    const palette = new Set(["#2DA5A0", "#B75E18"]);
    for (const row of Object.values(AGENT_REGISTRY)) {
      expect(palette.has(row.accent_color)).toBe(true);
    }
  });

  it("every row has a Lucide icon name", () => {
    for (const row of Object.values(AGENT_REGISTRY)) {
      expect(row.icon_name).toMatch(/^[A-Z][A-Za-z0-9]+$/);
    }
  });

  it("rejects kelsey as live agent; accepts advisors", () => {
    expect(isKnownAgentId("kelsey")).toBe(false);
    expect(isKnownAgentId("gordon")).toBe(true);
    expect(isKnownAgentId("security_advisor")).toBe(true);
    expect(isKnownAgentId("performance_advisor")).toBe(true);
  });
});
