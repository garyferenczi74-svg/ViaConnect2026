import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  AGENTS,
  ALERTS,
  PLATFORMS,
  TOP_POSTS,
} from "@/lib/hounddog/constants";
import {
  HOUNDDOG_CONTENT_EMPTY_COPY,
  HOUNDDOG_EMPTY_COPY,
  STAGED_HOUNDDOG_MARKERS,
  hasLiveSocialLastSync,
  liveAgentJobs,
  loadHounddogLiveAccounts,
  loadHounddogLiveJobs,
} from "@/lib/hounddog/honesty";

const REPO = path.resolve(__dirname, "../../../..");

function read(rel: string): string {
  return readFileSync(path.join(REPO, rel), "utf8");
}

describe("Hounddog live loaders stay empty until a real last-sync exists", () => {
  it("does not invent social last-sync or Connected", () => {
    expect(loadHounddogLiveAccounts()).toEqual([]);
    expect(hasLiveSocialLastSync(loadHounddogLiveAccounts())).toBe(false);
    expect(hasLiveSocialLastSync([])).toBe(false);
    expect(hasLiveSocialLastSync([{ platform: "tiktok", lastSyncAt: null }])).toBe(
      false,
    );
    expect(hasLiveSocialLastSync([{ platform: "tiktok", lastSyncAt: "   " }])).toBe(
      false,
    );
  });

  it("gates social paint on a real last-sync stamp only", () => {
    expect(
      hasLiveSocialLastSync([
        { platform: "youtube", lastSyncAt: "2026-08-26T00:00:00.000Z" },
      ]),
    ).toBe(true);
  });

  it("does not invent live agent jobs", () => {
    expect(loadHounddogLiveJobs()).toEqual([]);
    expect(liveAgentJobs(loadHounddogLiveJobs())).toEqual([]);
    expect(
      liveAgentJobs([
        { id: "", agentName: "Scriptwriter", status: "live", task: "x" },
        { id: "j1", agentName: "Editor", status: "idle", task: "" },
      ]),
    ).toEqual([]);
  });

  it("counts only real live job rows for the header badge", () => {
    const live = liveAgentJobs([
      { id: "j1", agentName: "Scriptwriter", status: "live", task: "Drafting" },
      { id: "j2", agentName: "Analyzer", status: "idle", task: "" },
    ]);
    expect(live).toHaveLength(1);
    expect(live[0]?.id).toBe("j1");
  });
});

describe("Hounddog empty copy is Board-Metrics honest", () => {
  it("uses the locked empty sentence and no staged markers", () => {
    expect(HOUNDDOG_EMPTY_COPY).toBe(
      "No connected social accounts. Hounddog stays empty until a live platform is wired.",
    );
    for (const marker of STAGED_HOUNDDOG_MARKERS) {
      expect(HOUNDDOG_EMPTY_COPY).not.toContain(marker);
    }
    expect(HOUNDDOG_EMPTY_COPY).not.toMatch(/last-sync|last sync/i);
    expect(HOUNDDOG_EMPTY_COPY).not.toMatch(/status:\s*['"]connected['"]/i);
  });

  it("Content empty list is No scripts yet, not the Overview banner", () => {
    expect(HOUNDDOG_CONTENT_EMPTY_COPY).toBe("No scripts yet.");
    expect(HOUNDDOG_CONTENT_EMPTY_COPY).not.toBe(HOUNDDOG_EMPTY_COPY);
    for (const marker of STAGED_HOUNDDOG_MARKERS) {
      expect(HOUNDDOG_CONTENT_EMPTY_COPY).not.toContain(marker);
    }
  });
});

describe("fixture arrays are not populated demo data", () => {
  it("exports AGENTS / PLATFORMS / TOP_POSTS / ALERTS as empty", () => {
    expect(AGENTS).toEqual([]);
    expect(PLATFORMS).toEqual([]);
    expect(TOP_POSTS).toEqual([]);
    expect(ALERTS).toEqual([]);
  });

  it("constants source no longer ships demo agent or social fixtures", () => {
    const src = read("src/lib/hounddog/constants.ts");
    expect(src).not.toContain("AI replaced my team");
    expect(src).not.toContain("Morning Routine");
    expect(src).not.toContain("2.1M");
    expect(src).not.toContain("24.7");
    expect(src).not.toContain("+12K");
    expect(src).not.toContain("6.8%");
  });
});
