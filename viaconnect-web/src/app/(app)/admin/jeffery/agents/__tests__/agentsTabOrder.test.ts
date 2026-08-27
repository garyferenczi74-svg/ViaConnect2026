/**
 * Agents tab stack order: ACC seat chips first, recon secondary below.
 * Brief 39 seat authority is unchanged (ACC seats only).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("AgentsClient stack order", () => {
  it("chip bar appears before registry-reconciliation in AgentsClient markup", () => {
    const src = read("src/app/(app)/admin/jeffery/agents/AgentsClient.tsx");
    const chip = src.indexOf('data-testid="agents-chip-bar"');
    const workspace = src.indexOf('data-testid="agents-workspace"');
    const recon = src.indexOf("<RegistryReconciliationPanel");
    const secondary = src.indexOf('data-testid="agents-secondary-chrome"');

    expect(chip).toBeGreaterThan(-1);
    expect(workspace).toBeGreaterThan(chip);
    expect(secondary).toBeGreaterThan(workspace);
    expect(recon).toBeGreaterThan(secondary);
    expect(src).toContain("<RegistryReconciliationPanel");
    expect(src).toContain("<AgentTabBar");
  });

  it("does not delete recon or bind the Agents digit to ultrathink", () => {
    const src = read("src/app/(app)/admin/jeffery/agents/AgentsClient.tsx");
    const client = read("src/app/(app)/admin/jeffery/JefferyClient.tsx");
    const panel = read("src/components/admin/jeffery/RegistryReconciliationPanel.tsx");
    const bar = read("src/components/admin/jeffery/agents/AgentTabBar.tsx");

    expect(src).toContain("RegistryReconciliationPanel");
    expect(panel).toContain('data-testid="registry-reconciliation-panel"');
    expect(panel).toContain("no merge");
    expect(bar).toContain('data-testid="agents-chip-bar-tabs"');
    expect(client).toContain("{agentRegistry.length}");
    expect(client).not.toMatch(/ultrathink_agent_registry/);
    expect(src).not.toMatch(/ultrathink_agent_registry/);
  });

  it("fail-opens empty activity props instead of throwing on filter", () => {
    const src = read("src/app/(app)/admin/jeffery/agents/AgentsClient.tsx");
    expect(src).toContain("Array.isArray(initialTasks)");
    expect(src).toContain("Array.isArray(initialEvents)");
    expect(src).toContain("Array.isArray(initialHeartbeats)");
    expect(src).toContain("Array.isArray(initialRegistry)");
  });
});
