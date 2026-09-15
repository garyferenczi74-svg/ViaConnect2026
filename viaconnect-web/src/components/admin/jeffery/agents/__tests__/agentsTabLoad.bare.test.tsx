/**
 * M4: Agents tab load. Roster stays up when enrichment is empty or malformed.
 * Deliberate child throw still trips AdminPanelErrorBoundary.
 */
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import AgentTabBar from "../AgentTabBar";
import AgentPanelShell from "../AgentPanelShell";
import JefferyPanel from "../panels/JefferyPanel";
import { PipelineChainView } from "@/components/admin/jeffery/PipelineChainView";
import { AdminPanelErrorBoundary } from "@/components/admin/AdminPanelErrorBoundary";
import { classifyPanelThrow } from "@/lib/admin/classifyPanelThrow";
import { quarantineStages } from "@/lib/jeffery/quarantineStages";
import { orderedRegistry } from "@/lib/agents/registry";
import { quarantineAgentEnrichment } from "@/lib/agents/quarantineEnrichment";
import { resolveAgentIcon } from "@/lib/agents/resolveAgentIcon";
import { deriveStatus } from "@/lib/agents/status";
import { STAGE_ORDER, type ChainRunResult } from "@/lib/agents/synchronism/chainTypes";
import { ACC_SEAT_COUNT } from "@/lib/agents/types";
import type { AgentActivityEvent, AgentCurrentTask } from "@/lib/agents/types";

const registry = orderedRegistry();
const jeffery = registry[0];

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("Agents tab load M4", () => {
  it("badge count equals registry passed to AgentTabBar (17 ACC seats)", () => {
    const html = renderToStaticMarkup(
      <AgentTabBar
        registry={registry}
        heartbeats={new Map()}
        activeAgent="jeffery"
        onChange={() => undefined}
        deriveStatus={(hb) => deriveStatus(hb)}
      />,
    );
    const tabs = (html.match(/role="tab"/g) ?? []).length;
    expect(registry).toHaveLength(ACC_SEAT_COUNT);
    expect(tabs).toBe(registry.length);
    expect(tabs).toBe(17);
    const client = read("src/app/(app)/admin/jeffery/JefferyClient.tsx");
    expect(client).toContain("{agentRegistry.length}");
  });

  it("empty activity paints 17 chips + idle and no fail card", () => {
    const chips = renderToStaticMarkup(
      <AgentTabBar
        registry={registry}
        heartbeats={new Map()}
        activeAgent="jeffery"
        onChange={() => undefined}
        deriveStatus={(hb) => deriveStatus(hb)}
      />,
    );
    const workspace = renderToStaticMarkup(
      <AgentPanelShell registry={jeffery} heartbeat={null} tasks={[]} events={[]}>
        <JefferyPanel registry={jeffery} heartbeat={null} tasks={[]} events={[]} />
      </AgentPanelShell>,
    );
    expect((chips.match(/role="tab"/g) ?? []).length).toBe(17);
    expect(workspace).toContain("Idle. No tasks queued or running.");
    expect(workspace).toContain("No activity in the last 24 hours.");
    expect(chips).not.toContain("failed to load");
    expect(workspace).not.toContain("failed to load");
  });

  it("malformed enrichment throws before quarantine (proven row-shape)", () => {
    const badTasks = [null] as unknown as AgentCurrentTask[];
    expect(() =>
      renderToStaticMarkup(
        <JefferyPanel registry={jeffery} heartbeat={null} tasks={badTasks} events={[]} />,
      ),
    ).toThrow();

    const badEvents = [
      {
        id: "e-obj",
        agent_id: "jeffery",
        event_type: "info",
        severity: "info",
        message: { nested: true },
        metadata: {},
        correlation_id: null,
        user_id: null,
        created_at: "2026-09-15T00:00:00.000Z",
      },
    ] as unknown as AgentActivityEvent[];
    expect(() =>
      renderToStaticMarkup(
        <JefferyPanel registry={jeffery} heartbeat={null} tasks={[]} events={badEvents} />,
      ),
    ).toThrow(/Objects are not valid as a React child/);

    const classified = classifyPanelThrow(
      new Error("Objects are not valid as a React child (found: object with keys {nested})"),
    );
    expect(classified.kind).toBe("invalid_child");
  });

  it("malformed enrichment does not crash roster after quarantine", () => {
    const safe = quarantineAgentEnrichment({
      heartbeats: [{ agent_id: "not-a-seat" }, null],
      tasks: [null, { task_title: { nested: true }, agent_id: "jeffery" }],
      events: [{ message: { nested: true } }, null],
    });
    const chips = renderToStaticMarkup(
      <AgentTabBar
        registry={registry}
        heartbeats={new Map()}
        activeAgent="jeffery"
        onChange={() => undefined}
        deriveStatus={(hb) => deriveStatus(hb)}
      />,
    );
    const workspace = renderToStaticMarkup(
      <AgentPanelShell registry={jeffery} heartbeat={null} tasks={safe.tasks} events={safe.events}>
        <JefferyPanel
          registry={jeffery}
          heartbeat={null}
          tasks={safe.tasks}
          events={safe.events}
        />
      </AgentPanelShell>,
    );
    expect((chips.match(/role="tab"/g) ?? []).length).toBe(17);
    expect(workspace).toContain("Idle. No tasks queued or running.");
    expect(workspace).not.toContain("failed to load");
    expect(safe.tasks).toEqual([]);
    expect(safe.events).toEqual([]);
  });

  it("non-array pipeline stages do not crash Agents panel chrome", () => {
    const objectStages = { ingest: { status: "ok" } };
    expect(() =>
      (objectStages as unknown as ChainRunResult["stages"]).find(
        (s) => s.stage === "ingest",
      ),
    ).toThrow(/find is not a function/);
    expect(quarantineStages(objectStages)).toEqual([]);

    const badRun = {
      runId: "sync-2026-09-15",
      runDate: "2026-09-15",
      startedAt: "2026-09-15T06:15:00.000Z",
      endedAt: "2026-09-15T06:16:00.000Z",
      status: "ok",
      stages: objectStages,
    } as unknown as ChainRunResult;

    const html = renderToStaticMarkup(
      <>
        <AgentTabBar
          registry={registry}
          heartbeats={new Map()}
          activeAgent="jeffery"
          onChange={() => undefined}
          deriveStatus={(hb) => deriveStatus(hb)}
        />
        <PipelineChainView initialRun={badRun} />
      </>,
    );
    expect((html.match(/role="tab"/g) ?? []).length).toBe(17);
    expect(html).toContain('data-testid="pipeline-chain-view"');
    expect(html).toContain('data-pipeline-stages-quarantine="array"');
    expect(html).toContain("sync-2026-09-15");
    expect(html).toContain('data-testid="pipeline-stage-ingest"');
    expect((html.match(/>skipped</g) ?? []).length).toBe(STAGE_ORDER.length);
    expect(html).not.toContain("failed to load");
    const pipeline = read("src/components/admin/jeffery/PipelineChainView.tsx");
    expect(pipeline).toContain("from '@/lib/jeffery/quarantineStages'");
    expect(pipeline).toContain("quarantineStages<StageResult>(run?.stages)");
    expect(pipeline).toContain('data-pipeline-stages-quarantine="array"');
    expect(pipeline).toContain("stages.find");
    expect(pipeline).not.toMatch(/run\.stages\.find/);
    const helper = read("src/lib/jeffery/quarantineStages.ts");
    expect(helper).toContain("Array.isArray(raw)");
    expect(helper).not.toMatch(/Object\.keys/);
    expect(classifyPanelThrow(new TypeError("a.stages.find is not a function")).kind).toBe(
      "invalid_row_shape",
    );
  });

  it("deliberate throw still trips the Agents boundary", () => {
    function Boom(): never {
      throw new Error("Element type is invalid: expected a string or a class/function but got: undefined.");
    }
    expect(() => renderToStaticMarkup(<Boom />)).toThrow(/Element type is invalid/);
    const error = new Error(
      "Element type is invalid: expected a string or a class/function but got: undefined.",
    );
    (error as Error & { digest?: string }).digest = "stay-draft-digest";
    const state = AdminPanelErrorBoundary.getDerivedStateFromError(error);
    expect(state.hasError).toBe(true);
    expect(state.errorId).toBe("stay-draft-digest");
    expect(state.message).toBe("failed to load");
    expect(classifyPanelThrow(error).kind).toBe("invalid_element");
    const client = read("src/app/(app)/admin/jeffery/JefferyClient.tsx");
    expect(client).toMatch(/<AdminPanel name="Agents">/);
  });

  it("17 registry icons render under production NODE_ENV", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      for (const row of registry) {
        const Icon = resolveAgentIcon(row.icon_name);
        const html = renderToStaticMarkup(createElement(Icon, { strokeWidth: 1.5 }));
        expect(html.includes("<svg") || html.length > 0).toBe(true);
      }
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it("deep link no longer calls useSearchParams on Agents first paint", () => {
    const hook = read("src/hooks/useAgentDeepLink.ts");
    expect(hook).toContain('from "next/navigation"');
    expect(hook).not.toMatch(/useSearchParams,/);
    expect(hook).not.toMatch(/useSearchParams\s*\(/);
    expect(hook).toContain("window.location.search");
  });
});
