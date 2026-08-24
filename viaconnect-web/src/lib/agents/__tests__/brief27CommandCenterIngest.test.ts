/**
 * Brief 27: wire real Command Center ingest.
 * 17 ACC seats only. No advisors. No Gordon. No invented tasks.
 * Picasso/Conan get an idle ops row. Real brief/PR/turn increments 24h/activity.
 * Run now / Pause honest if no runner.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AGENT_IDS, resolveAgentId } from "../types";
import { AGENT_REGISTRY, isKnownAgentId, orderedRegistry } from "../registry";
import { deriveStatus } from "../status";
import {
  AGENT_TRIGGER_CATALOG,
  ACC_OWNED_CADENCE_JOB,
  GROK_ONLY_IDLE_SEATS,
  agentHasOwnedCadenceJob,
  agentHasRunner,
} from "../runners";
import {
  applyCommandCenterIngest,
  buildAccOpsInsert,
  countSeatActivity24h,
  countSeatTasks24h,
  emptyCommandCenterStore,
  ensureAllAccOpsRows,
  ensureStoreOpsRow,
  githubPrToIngestInput,
  makeIdleOpsRow,
  resolveSeatFromWorkText,
} from "../command-center-ingest";
import { AGENT_PANELS } from "@/components/admin/jeffery/agents/panels";

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

describe("Brief 27 Command Center ingest", () => {
  it("keeps exactly the 17 ACC seats and no advisors or Gordon", () => {
    expect(AGENT_IDS).toEqual([...GROK_17]);
    expect(orderedRegistry().map((r) => r.agent_id)).toEqual([...GROK_17]);
    expect(isKnownAgentId("gordon")).toBe(false);
    expect(isKnownAgentId("security_advisor")).toBe(false);
    expect(isKnownAgentId("performance_advisor")).toBe(false);
    expect(resolveAgentId("gordon")).toBeNull();
    expect(resolveAgentId("security_advisor")).toBeNull();
    expect(Object.keys(AGENT_PANELS)).toHaveLength(17);
    expect(AGENT_PANELS.gordon).toBeUndefined();
  });

  it("gives Picasso and Conan an idle ops row without inventing Healthy or tasks", () => {
    let store = emptyCommandCenterStore();
    store = ensureStoreOpsRow(store, "picasso");
    store = ensureStoreOpsRow(store, "conan");
    expect(store.opsRows.picasso).toEqual(makeIdleOpsRow("picasso"));
    expect(store.opsRows.conan).toEqual(makeIdleOpsRow("conan"));
    expect(store.opsRows.picasso?.health_status).toBe("unknown");
    expect(store.opsRows.picasso?.last_heartbeat_at).toBeNull();
    expect(store.tasks).toHaveLength(0);
    expect(store.events).toHaveLength(0);
    expect(deriveStatus(null)).toBe("idle");
    expect(
      deriveStatus({
        agent_id: "picasso",
        status: "idle",
        last_heartbeat: "",
        health_score: 0,
        error_count_24h: 0,
        metadata: {},
      }),
    ).toBe("idle");
  });

  it("ensures all 17 ACC seats as idle ops rows and never advisors", () => {
    const store = ensureAllAccOpsRows(emptyCommandCenterStore());
    expect(Object.keys(store.opsRows)).toHaveLength(17);
    for (const id of AGENT_IDS) {
      expect(store.opsRows[id]?.health_status).toBe("unknown");
      expect(store.opsRows[id]?.last_heartbeat_at).toBeNull();
    }
    expect(store.opsRows["gordon" as never]).toBeUndefined();
    const insert = buildAccOpsInsert("picasso");
    expect(insert.health_status).toBe("unknown");
    expect(insert.last_heartbeat_at).toBeNull();
    expect(insert.agent_name).toBe("picasso");
  });

  it("does not invent a task until a real brief, PR, or turn is applied", () => {
    const store = ensureAllAccOpsRows(emptyCommandCenterStore());
    expect(store.tasks).toHaveLength(0);
    expect(countSeatTasks24h(store, "picasso")).toBe(0);
    expect(countSeatActivity24h(store, "conan")).toBe(0);
  });

  it("a real brief/PR/turn increments that seat 24h activity and task count", () => {
    const now = "2026-08-24T18:00:00.000Z";
    const nowMs = Date.parse(now);
    let store = ensureAllAccOpsRows(emptyCommandCenterStore());

    const brief = applyCommandCenterIngest(
      store,
      {
        agentRaw: "picasso",
        kind: "brief",
        phase: "complete",
        message: "Brief 27 wire ingest",
        title: "Brief 27",
        correlationKey: "brief:27",
      },
      now,
    );
    expect(brief.accepted).toBe(true);
    expect(brief.agentId).toBe("picasso");
    expect(brief.wroteEvent).toBe(true);
    expect(brief.wroteTask).toBe(true);
    store = brief.store;
    expect(countSeatActivity24h(store, "picasso", nowMs)).toBe(1);
    expect(countSeatTasks24h(store, "picasso", nowMs)).toBe(1);
    expect(countSeatActivity24h(store, "conan", nowMs)).toBe(0);

    const pr = applyCommandCenterIngest(
      store,
      {
        agentRaw: "conan",
        kind: "pr",
        phase: "complete",
        message: "PR #70 review notes",
        title: "PR #70",
        correlationKey: "pr:70",
      },
      now,
    );
    store = pr.store;
    expect(countSeatActivity24h(store, "conan", nowMs)).toBe(1);
    expect(countSeatTasks24h(store, "conan", nowMs)).toBe(1);

    const turn = applyCommandCenterIngest(
      store,
      {
        agentRaw: "michelangelo",
        kind: "turn",
        phase: "complete",
        message: "OBRA pipeline complete",
        correlationKey: "turn:obra-1",
      },
      now,
    );
    store = turn.store;
    expect(countSeatActivity24h(store, "michelangelo", nowMs)).toBe(1);
    expect(countSeatTasks24h(store, "michelangelo", nowMs)).toBe(1);
  });

  it("rejects Gordon, advisors, and duplicate correlation keys", () => {
    const store = emptyCommandCenterStore();
    expect(
      applyCommandCenterIngest(store, {
        agentRaw: "gordon",
        kind: "turn",
        phase: "complete",
        message: "nope",
      }).accepted,
    ).toBe(false);
    expect(
      applyCommandCenterIngest(store, {
        agentRaw: "security_advisor",
        kind: "turn",
        phase: "complete",
        message: "nope",
      }).accepted,
    ).toBe(false);

    const first = applyCommandCenterIngest(store, {
      agentRaw: "jeffery",
      kind: "turn",
      phase: "complete",
      message: "ops.tick",
      correlationKey: "jeffery-msg:1",
    });
    const dup = applyCommandCenterIngest(first.store, {
      agentRaw: "jeffery",
      kind: "turn",
      phase: "complete",
      message: "ops.tick again",
      correlationKey: "jeffery-msg:1",
    });
    expect(dup.reason).toBe("duplicate");
    expect(dup.wroteEvent).toBe(false);
    expect(dup.wroteTask).toBe(false);
    expect(dup.store.tasks).toHaveLength(1);
  });

  it("attributes PR/brief text only from explicit seat labels, not free-text Picasso mentions", () => {
    expect(resolveSeatFromWorkText("Picasso is NOT launching.")).toBeNull();
    expect(resolveSeatFromWorkText("agent: picasso\nBrief 27")).toBe("picasso");
    expect(resolveSeatFromWorkText("cursor/conan-notes-c85e")).toBe("conan");
    expect(resolveSeatFromWorkText("seat: gordon")).toBeNull();
    expect(
      githubPrToIngestInput({
        number: 70,
        title: "feat(admin): Brief 27",
        body: "Picasso mentioned in prose only.",
      }),
    ).toBeNull();
    expect(
      githubPrToIngestInput({
        number: 71,
        title: "feat(admin): notes",
        body: "agent: michelangelo",
        head: { ref: "cursor/obra-c85e" },
      })?.agentRaw,
    ).toBe("michelangelo");
  });

  it("Run now / Pause are honest when a seat has no runner", () => {
    for (const id of GROK_ONLY_IDLE_SEATS) {
      expect(AGENT_TRIGGER_CATALOG[id]).toHaveLength(0);
      expect(agentHasRunner(id)).toBe(false);
      expect(agentHasOwnedCadenceJob(id)).toBe(false);
      expect(ACC_OWNED_CADENCE_JOB[id]).toBeUndefined();
    }
    expect(agentHasOwnedCadenceJob("michelangelo")).toBe(false);
    expect(agentHasRunner("michelangelo")).toBe(true);
    expect(agentHasOwnedCadenceJob("jeffery")).toBe(true);

    const header = read("src/components/admin/jeffery/agents/AgentHeader.tsx");
    expect(header).toContain("hasOwnedCadenceJob");
    expect(header).toContain("No runner for this seat");
    expect(header).toContain("No runner to pause");
    expect(header).not.toMatch(/tokens24h\s*=\s*[1-9]/);

    const runNow = read("src/app/api/admin/agents/[id]/run-now/route.ts");
    expect(runNow).toContain("ACC_OWNED_CADENCE_JOB");
    expect(runNow).toContain("no_runner");
    expect(runNow).not.toMatch(/michelangelo:\s*"product\.freshness"/);
    expect(runNow).not.toMatch(/arnold:\s*"digest\.rollup"/);
    expect(runNow).not.toMatch(/lex:\s*"marshall\.gate"/);
  });

  it("does not fake Healthy via roster presence pulses", () => {
    const tick = read("src/lib/jeffery/ops/tick.ts");
    expect(tick).not.toMatch(/ops\.roster_presence/);
    expect(tick).toContain("pollGithubPrsForCommandCenter");
    expect(tick).toContain("Idle is honest");
  });

  it("idle chrome uses last-sync-state and does not invent tokens", () => {
    const idle = read("src/components/admin/jeffery/agents/panels/IdleRosterPanel.tsx");
    expect(idle).toContain('@/lib/body-tracker/last-sync-state');
    expect(idle).toContain("Ops row present. Idle — no current work.");
    expect(idle).not.toContain("No Command Center ops row");
    expect(idle).not.toMatch(/tokens24h\s*=\s*[1-9]/);
    expect(idle).not.toMatch(/Vitality/);
    expect(idle).not.toMatch(/[Ss]emaglutide/);
    const registry = read("src/lib/agents/registry.ts");
    expect(registry).not.toMatch(/No Command Center ops row yet/);
  });

  it("hooks Jeffery and Michelangelo turns into ingest", () => {
    const bus = read("src/lib/jeffery/message-bus.ts");
    expect(bus).toContain("persistCommandCenterIngest");
    expect(bus).toContain('kind: "turn"');
    const pipe = read("src/lib/agents/michelangelo/pipeline.ts");
    expect(pipe).toContain("persistCommandCenterIngest");
    expect(pipe).toContain('agentRaw: "michelangelo"');
  });

  it("admin ingest route is fail-closed and ACC-only", () => {
    const route = read("src/app/api/admin/agents/ingest/route.ts");
    expect(route).toContain('role !== "admin"');
    expect(route).toContain("persistCommandCenterIngest");
    expect(route).toContain("unknown_or_non_acc_seat");
    expect(route).not.toMatch(/gordon/);
    expect(route).not.toMatch(/security_advisor/);
  });

  it("does not merge ACC and ultrathink rosters", () => {
    const types = read("src/lib/agents/types.ts");
    expect(types).toContain("Jeffery-approved lock");
    expect(types).not.toMatch(/export const AGENT_IDS[\s\S]*gordon/);
    const drift = read("src/lib/agents/registryDrift.ts");
    expect(drift).toMatch(/not authorized/i);
  });
});
