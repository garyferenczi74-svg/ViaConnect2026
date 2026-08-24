import { describe, it, expect } from "vitest";
import { AGENT_REGISTRY, orderedRegistry, isKnownAgentId } from "../registry";
import { AGENT_IDS } from "../types";

describe("AGENT_REGISTRY (Brief 23 Grok roster)", () => {
  it("contains exactly the canonical 17 Grok agents", () => {
    expect(Object.keys(AGENT_REGISTRY).sort()).toEqual([...AGENT_IDS].sort());
    expect(AGENT_IDS).toHaveLength(17);
  });

  it("produces a stable sort order matching the Grok roster", () => {
    const ids = orderedRegistry().map((r) => r.agent_id);
    expect(ids).toEqual([
      "jeffery",
      "picasso",
      "michelangelo",
      "conan",
      "hermes",
      "gene",
      "elysium",
      "marshall",
      "martha",
      "hannah",
      "thanos",
      "elizabeth",
      "lex",
      "sherlock",
      "watson",
      "arnold",
      "hounddog",
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

  it("rejects invented advisors and gordon; accepts real Grok seats", () => {
    expect(isKnownAgentId("kelsey")).toBe(false);
    expect(isKnownAgentId("gordon")).toBe(false);
    expect(isKnownAgentId("security_advisor")).toBe(false);
    expect(isKnownAgentId("performance_advisor")).toBe(false);
    expect(isKnownAgentId("thanos")).toBe(true);
    expect(isKnownAgentId("elysium")).toBe(true);
    expect(isKnownAgentId("picasso")).toBe(true);
    expect(isKnownAgentId("hermes")).toBe(true);
    expect(isKnownAgentId("elizabeth")).toBe(true);
    expect(isKnownAgentId("watson")).toBe(true);
  });
});
