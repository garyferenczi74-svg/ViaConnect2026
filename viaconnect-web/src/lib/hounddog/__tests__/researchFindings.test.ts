import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  isHounddogHookPayload,
  isHounddogPipelinePayload,
  isHounddogScriptPayload,
  loadHounddogResearchFindings,
  type HounddogResearchFinding,
} from "@/lib/hounddog/researchFindings";

const REPO = path.resolve(__dirname, "../../../..");

function read(rel: string): string {
  return readFileSync(path.join(REPO, rel), "utf8");
}

const SAMPLE: HounddogResearchFinding = {
  title: "Allowlist digest title",
  url: "https://example.com/sherlock",
  platform: "youtube",
  score: 0.77,
  fetchedAt: "2026-08-25T12:00:00.000Z",
};

describe("Sherlock findings stay off Content / pipeline / KPI", () => {
  it("defaults to Research Hub (empty Hounddog list)", () => {
    expect(loadHounddogResearchFindings()).toEqual([]);
  });

  it("a hub digest is not a script, hook, or pipeline item", () => {
    expect(isHounddogScriptPayload(SAMPLE)).toBe(false);
    expect(isHounddogPipelinePayload(SAMPLE)).toBe(false);
    expect(isHounddogHookPayload(SAMPLE)).toBe(false);
  });

  it("Research tab can list findings; Content / Overview / analytics do not insert them", () => {
    const research = read("src/components/hounddog/tabs/ResearchTab.tsx");
    const content = read("src/components/hounddog/tabs/ContentTab.tsx");
    const overview = read("src/components/hounddog/tabs/OverviewTab.tsx");
    const analytics = read("src/lib/hounddog/analytics.ts");

    expect(research).toContain("loadHounddogResearchFindings");
    expect(research).toContain("Research findings");
    expect(content).not.toContain("loadHounddogResearchFindings");
    expect(content).not.toContain("HounddogResearchFinding");
    expect(overview).not.toContain("loadHounddogResearchFindings");
    expect(overview).not.toContain("fetchedAt");
    expect(analytics).not.toMatch(/finding/);
    expect(analytics).not.toContain("loadHounddogResearchFindings");
  });
});
