import { describe, it, expect } from "vitest";
import { AGENT_REGISTRY, orderedRegistry, isKnownAgentId } from "../registry";
import { AGENT_IDS } from "../types";

describe("AGENT_REGISTRY", () => {
  it("contains exactly the canonical 5 agents", () => {
    expect(Object.keys(AGENT_REGISTRY).sort()).toEqual([...AGENT_IDS].sort());
  });

  it("produces a stable sort order", () => {
    const ids = orderedRegistry().map((r) => r.agent_id);
    expect(ids).toEqual(["jeffery", "hannah", "michelangelo", "sherlock", "arnold"]);
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

  it("rejects unknown agent IDs", () => {
    expect(isKnownAgentId("jeffery")).toBe(true);
    expect(isKnownAgentId("gordan")).toBe(false);
    expect(isKnownAgentId("")).toBe(false);
  });
});
