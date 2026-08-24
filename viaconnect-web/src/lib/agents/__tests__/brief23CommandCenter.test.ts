/**
 * Brief 23: Command Center uses the real Grok roster only.
 * Jeffery-approved lock. Idle/empty when a seat has no ops row.
 * No invented advisor seats. ACC and ultrathink counts stay separate.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AGENT_IDS, resolveAgentId } from "../types";
import { AGENT_REGISTRY, isKnownAgentId, orderedRegistry } from "../registry";
import { AGENT_PANELS } from "@/components/admin/jeffery/agents/panels";
import { deriveStatus } from "../status";
import { REGISTRY_END_STATE_RECOMMENDATION } from "../registryDrift";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const GROK_17 = [
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
] as const;

describe("Brief 23 Jeffery Command Center roster", () => {
  it("ACC tabs/rows are the 17 Grok seats in listed order", () => {
    expect(AGENT_IDS).toEqual([...GROK_17]);
    expect(orderedRegistry().map((r) => r.agent_id)).toEqual([...GROK_17]);
    expect(AGENT_REGISTRY.hannah.display_name).toBe("HannahAI");
    const types = read("src/lib/agents/types.ts");
    expect(types).toContain("Jeffery-approved lock");
    expect(types).not.toMatch(/export type AgentId[\s\S]*gordon/);
    expect(types).not.toMatch(/export const AGENT_IDS[\s\S]*security_advisor/);
  });

  it("does not invent advisor or Gordon Command Center seats", () => {
    expect(isKnownAgentId("security_advisor")).toBe(false);
    expect(isKnownAgentId("performance_advisor")).toBe(false);
    expect(isKnownAgentId("gordon")).toBe(false);
    expect(resolveAgentId("security_advisor")).toBeNull();
    expect(resolveAgentId("gordon")).toBeNull();
  });

  it("wires Picasso and the other missing Grok seats", () => {
    for (const id of ["picasso", "conan", "hermes", "gene", "martha", "elizabeth", "watson"] as const) {
      expect(isKnownAgentId(id)).toBe(true);
      expect(AGENT_PANELS[id]).toBeTypeOf("function");
    }
    expect(isKnownAgentId("thanos")).toBe(true);
    expect(isKnownAgentId("elysium")).toBe(true);
  });

  it("idle when there is no heartbeat row", () => {
    expect(deriveStatus(null)).toBe("idle");
    expect(deriveStatus(undefined)).toBe("idle");
  });

  it("Jeffery Agents badge uses live registry length, not a hardcoded 13", () => {
    const client = read("src/app/(app)/admin/jeffery/JefferyClient.tsx");
    expect(client).toContain("agentRegistry.length");
    expect(client).not.toMatch(/Agents.*\b13\b/);
  });

  it("admin jeffery page stays fail-closed on profiles.role admin", () => {
    const page = read("src/app/(app)/admin/jeffery/page.tsx");
    expect(page).toContain('profile.role !== "admin"');
    expect(page).toContain("orderedRegistry");
  });

  it("idle panel copy is honest and does not invent metrics", () => {
    const idle = read("src/components/admin/jeffery/agents/panels/IdleRosterPanel.tsx");
    expect(idle).toContain("Ops row present. Idle — no current work.");
    expect(idle).toContain("AgentMetricsTiles");
    expect(idle).not.toMatch(/tokens24h\s*=\s*[1-9]/);
    expect(idle).not.toMatch(/value=\{?["']10["']\}?/);
  });

  it("keeps ACC and ultrathink counts separate", () => {
    expect(REGISTRY_END_STATE_RECOMMENDATION.merge).toMatch(/not authorized/i);
    const panel = read("src/components/admin/jeffery/RegistryReconciliationPanel.tsx");
    expect(panel).toContain("acc_count");
    expect(panel).toContain("ultrathink_mapped_count");
    expect(panel).toContain("no merge");
  });

  it("ops ensure inserts ACC seats only via Brief 27 ensureAccOpsRow", () => {
    const src = read("src/lib/jeffery/ops/heartbeats.ts");
    expect(src).toMatch(/ensureAccOpsRow/);
    expect(src).not.toMatch(/security_advisor/);
    expect(src).not.toMatch(/gordon/);
  });
});
