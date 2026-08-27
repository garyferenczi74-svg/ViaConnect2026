/**
 * Agents tab first paint must not throw when activity prefetch fail-opens.
 * Chip bar still lists ACC seats. Error boundary is not the happy path.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import AgentTabBar from "../AgentTabBar";
import AgentPanelShell from "../AgentPanelShell";
import AgentHeader from "../AgentHeader";
import JefferyPanel from "../panels/JefferyPanel";
import IdleRosterPanel from "../panels/IdleRosterPanel";
import { orderedRegistry } from "@/lib/agents/registry";
import { deriveStatus } from "@/lib/agents/status";
import { ACC_SEAT_COUNT } from "@/lib/agents/types";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const registry = orderedRegistry();
const jeffery = registry[0];
const picasso = registry.find((r) => r.agent_id === "picasso");

describe("Agents tab empty / fail-open paint", () => {
  it("chip bar renders all ACC seats when heartbeats are empty", () => {
    expect(jeffery?.agent_id).toBe("jeffery");
    const html = renderToStaticMarkup(
      <AgentTabBar
        registry={registry}
        heartbeats={new Map()}
        activeAgent="jeffery"
        onChange={() => undefined}
        deriveStatus={(hb) => deriveStatus(hb)}
      />,
    );
    expect(html).toContain('data-testid="agents-chip-bar-tabs"');
    expect(html).toContain("Jeffery");
    expect(html).toContain("Picasso");
    expect(html).toContain("Hound Dog");
    expect((html.match(/role="tab"/g) ?? []).length).toBe(ACC_SEAT_COUNT);
    expect(html).not.toContain("failed to load");
  });

  it("Jeffery workspace paints idle when tasks and events are empty", () => {
    const html = renderToStaticMarkup(
      <AgentPanelShell registry={jeffery} heartbeat={null} tasks={[]} events={[]}>
        <JefferyPanel registry={jeffery} heartbeat={null} tasks={[]} events={[]} />
      </AgentPanelShell>,
    );
    expect(html).toContain("Jeffery");
    expect(html).toContain("Idle. No tasks queued or running.");
    expect(html).toContain("No activity in the last 24 hours.");
    expect(html).not.toContain("failed to load");
  });

  it("idle roster seat paints when heartbeat and activity are empty", () => {
    expect(picasso).toBeTruthy();
    if (!picasso) return;
    const html = renderToStaticMarkup(
      <IdleRosterPanel registry={picasso} heartbeat={null} tasks={[]} events={[]} />,
    );
    expect(html).toContain(`data-testid="idle-ops-${picasso.agent_id}"`);
    expect(html).toContain("Idle — no current work.");
    expect(html).not.toContain("failed to load");
  });

  it("header paints with a null heartbeat (idle, no throw)", () => {
    const html = renderToStaticMarkup(
      <AgentHeader registry={jeffery} heartbeat={null} />,
    );
    expect(html).toContain("Jeffery");
    expect(html).toContain("Idle");
    expect(html).not.toContain("failed to load");
  });

  it("JefferyClient still wraps Agents in AdminPanel; happy path is chips not the error card", () => {
    const client = read("src/app/(app)/admin/jeffery/JefferyClient.tsx");
    const agents = read("src/app/(app)/admin/jeffery/agents/AgentsClient.tsx");
    const boundary = read("src/components/admin/AdminPanelErrorBoundary.tsx");
    expect(client).toMatch(/<AdminPanel name="Agents">/);
    expect(client).toContain("<AgentsClient");
    expect(agents).toContain('data-testid="agents-chip-bar"');
    expect(agents).toContain('data-testid="agents-workspace"');
    expect(agents).toContain("RegistryReconciliationPanel");
    expect(boundary).toContain("failed to load");
    expect(agents).not.toContain("failed to load");
  });
});
