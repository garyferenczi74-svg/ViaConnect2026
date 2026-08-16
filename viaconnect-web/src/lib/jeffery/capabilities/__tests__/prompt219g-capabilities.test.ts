/**
 * Prompt 219G: capability registry unit tests.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  CAPABILITY_IDS,
  CORE_SEVEN_AGENTS,
  CAPABILITY_DEFINITIONS,
  isConsumerPublishAllowed,
} from "../types";
import { listStaticMatrix } from "../grants";
import {
  resetCapabilityBudgetsForTests,
  tryReserveFirecrawl,
  tryReserveGrokTokens,
  snapshotBudgets,
} from "../budgets";
import { markMarshallApproved } from "../modules/grok";
import type { CapabilityResult } from "../types";

const root = join(process.cwd());

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkTs(p, acc);
    else if (name.endsWith(".ts") || name.endsWith(".tsx")) acc.push(p);
  }
  return acc;
}

describe("Prompt 219G matrix and definitions", () => {
  it("core seven granted across all six capabilities in static matrix", () => {
    const matrix = listStaticMatrix();
    expect(CORE_SEVEN_AGENTS).toHaveLength(7);
    expect(CAPABILITY_IDS).toHaveLength(6);
    for (const agent of CORE_SEVEN_AGENTS) {
      for (const cap of CAPABILITY_IDS) {
        expect(
          matrix.some((m) => m.agent_id === agent && m.capability_id === cap && m.granted)
        ).toBe(true);
      }
    }
  });

  it("external research capabilities require Marshall gate", () => {
    expect(CAPABILITY_DEFINITIONS.firecrawl.requiresMarshallGate).toBe(true);
    expect(CAPABILITY_DEFINITIONS.pubmed.requiresMarshallGate).toBe(true);
    expect(CAPABILITY_DEFINITIONS.grok_research.requiresMarshallGate).toBe(true);
    expect(CAPABILITY_DEFINITIONS.research_hub.requiresMarshallGate).toBe(false);
  });

  it("Grok-derived material is not consumer-publishable until Marshall approves", () => {
    const base: CapabilityResult = {
      ok: true,
      usage: {
        agent: "sherlock",
        capability: "grok_research",
        queryShape: "test",
        credits: 0,
        tokens: 10,
        outcome: "ok",
        durationMs: 1,
      },
      marshallGateRequired: true,
      marshallApproved: false,
    };
    expect(isConsumerPublishAllowed(base)).toBe(false);
    const approved = markMarshallApproved(base);
    expect(isConsumerPublishAllowed(approved)).toBe(true);
  });
});

describe("Prompt 219G shared budgets", () => {
  beforeEach(() => {
    resetCapabilityBudgetsForTests();
  });

  it("logs per-agent firecrawl spend and shared ceiling halts cleanly", () => {
    // defaultBudget: maxPages 25, maxCredits 200. Page ceiling hits first.
    const first = tryReserveFirecrawl("hounddog", 1, 1);
    expect(first.allowed).toBe(true);
    const second = tryReserveFirecrawl("sherlock", 1, 1);
    expect(second.allowed).toBe(true);

    // Drain remaining shared page budget (23 left after 2)
    for (let i = 0; i < 23; i++) {
      const r = tryReserveFirecrawl(i % 2 === 0 ? "hounddog" : "sherlock", 1, 1);
      expect(r.allowed).toBe(true);
    }
    const blocked = tryReserveFirecrawl("hounddog", 1, 1);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe("budget_exhausted");

    const snap = snapshotBudgets();
    const hd = snap.firecrawlByAgent.find((a) => a.agent === "hounddog");
    const sh = snap.firecrawlByAgent.find((a) => a.agent === "sherlock");
    expect((hd?.credits ?? 0) + (sh?.credits ?? 0)).toBe(25);
    expect(hd?.credits).toBeGreaterThan(0);
    expect(sh?.credits).toBeGreaterThan(0);
    expect(snap.firecrawl.hitBudget).toBe(true);
  });

  it("halts Grok when daily token budget exhausted", () => {
    // Reserve large chunks until soft-cap / ceiling
    let last = tryReserveGrokTokens("sherlock", 50_000);
    expect(last.allowed).toBe(true);
    last = tryReserveGrokTokens("sherlock", 50_000);
    expect(last.allowed).toBe(true);
    // 50% soft of 200k = 100k; next should soft-cap
    last = tryReserveGrokTokens("sherlock", 1);
    expect(last.allowed).toBe(false);
  });
});

describe("Prompt 219G source shape", () => {
  it("migration seeds agent_capabilities for core seven", () => {
    const sql = read(
      "supabase/migrations/20260815200000_prompt_219g_agent_capabilities.sql"
    );
    expect(sql).toMatch(/agent_capabilities/);
    expect(sql).toMatch(/jeffery/);
    expect(sql).toMatch(/hounddog/);
    expect(sql).toMatch(/grok_research/);
    expect(sql).toMatch(/ON CONFLICT/);
  });

  it("registry is the single invoke entrypoint", () => {
    const src = read("src/lib/jeffery/capabilities/registry.ts");
    expect(src).toMatch(/export async function invokeCapability/);
    expect(src).toMatch(/runCoreSevenCapabilityDemos/);
  });

  it("admin Jeffery client hosts Capabilities tab", () => {
    const src = read("src/app/(app)/admin/jeffery/JefferyClient.tsx");
    expect(src).toMatch(/CapabilityUsagePanel/);
    expect(src).toMatch(/Capabilities/);
  });

  it("no duplicate Firecrawl REST base in agent folders outside shared client", () => {
    const agentDirs = [
      "src/lib/elysium",
      "src/lib/thanos",
      "src/lib/sherlock",
      "src/lib/gordon",
      "src/lib/hannah",
    ];
    for (const dir of agentDirs) {
      const full = join(root, dir);
      let files: string[] = [];
      try {
        files = walkTs(full);
      } catch {
        continue;
      }
      for (const f of files) {
        const text = readFileSync(f, "utf8");
        expect(text).not.toMatch(/api\.firecrawl\.dev/);
        expect(text).not.toMatch(/api\.x\.ai/);
      }
    }
    // Shared implementation lives in hounddog firecrawl client + capability modules
    const client = read("src/lib/hounddog/firecrawl/client.ts");
    expect(client).toMatch(/api\.firecrawl\.dev/);
    const grok = read("src/lib/jeffery/capabilities/modules/grok.ts");
    expect(grok).toMatch(/api\.x\.ai/);
  });
});
