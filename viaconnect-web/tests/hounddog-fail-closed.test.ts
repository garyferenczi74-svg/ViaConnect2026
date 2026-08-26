// Brief 38: /admin/hounddog fail-closed. Do not paint staged fixtures
// (847 / +12K / 2.1M / 6.8% / 24.7% / 3 AGENTS RUNNING).
// Brief 53: Overview is original chrome with honest empties (-- / No scrape yet),
// not a wiped EmptyState page. Create / Auto-Script / Content / Research must
// NOT contain EmptyState / HOUNDDOG_EMPTY_COPY. Content empty = No scripts yet.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  HOUNDDOG_CONTENT_EMPTY_COPY,
  HOUNDDOG_EMPTY_COPY,
} from "@/lib/hounddog/honesty";

const REPO = path.resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(path.join(REPO, rel), "utf8");
}

const OVERVIEW = "src/components/hounddog/tabs/OverviewTab.tsx";
const HEADER = "src/components/hounddog/HounddogCommandCenter.tsx";
const CONSTANTS = "src/lib/hounddog/constants.ts";
const PAGE = "src/app/(app)/admin/hounddog/page.tsx";
const CONTENT = "src/components/hounddog/tabs/ContentTab.tsx";
const CREATE = "src/components/hounddog/tabs/CreateTab.tsx";
const AUTO_SCRIPT = "src/components/hounddog/tabs/AutoScriptTab.tsx";
const RESEARCH = "src/components/hounddog/tabs/ResearchTab.tsx";
const HONESTY = "src/lib/hounddog/honesty.ts";

const OTHER_TABS = [CONTENT, CREATE, AUTO_SCRIPT, RESEARCH] as const;

const FORBIDDEN = [
  "847",
  "+12K",
  "+1.2K",
  "2.1M",
  "847K",
  "6.8%",
  "24.7%",
  "3 AGENTS RUNNING",
  "AI replaced my team",
  "Morning Routine",
  "I tested 29 peptides",
  "My GoHighLevel automation that saves 10 hrs/week",
  "Brand deals are dying",
] as const;

describe("Hounddog Overview and header contain no staged fixtures", () => {
  it("Overview restores original chrome with honest empties, not a wiped banner", () => {
    const src = read(OVERVIEW);
    for (const token of FORBIDDEN) {
      expect(src, `Overview still contains ${token}`).not.toContain(token);
    }
    expect(src).not.toContain("EmptyState");
    expect(src).not.toContain("HOUNDDOG_EMPTY_COPY");
    expect(src).not.toContain("getHounddogAnalyticsSummary");
    expect(src).not.toMatch(/value=\{847\}|value=\{62\}/);
    expect(src).toContain("AI Tasks Completed");
    expect(src).toContain("Posts in Queue");
    expect(src).toContain("Avg Engagement");
    expect(src).toContain("EXPORT");
    expect(src).toContain("REPORT");
    expect(src).toContain("Scriptwriter");
    expect(src).toContain("Editor");
    expect(src).toContain("Scheduler");
    expect(src).toContain("Analyzer");
    expect(src).toContain("Social Performance");
    expect(src).toContain("Top Performing Posts");
    expect(src).toContain("HOUNDDOG_EMPTY_METRIC");
    expect(src).toContain("HOUNDDOG_NO_SCRAPE_COPY");
    expect(src).toContain("loadHounddogLiveJobs");
    expect(src).toContain("liveAgentJobs");
    expect(src).not.toMatch(/from ['"]@\/lib\/hounddog\/constants['"].*ALERTS|AGENTS|PLATFORMS|TOP_POSTS/);
  });

  it("command center header omits a fixture AGENTS RUNNING badge", () => {
    const src = read(HEADER);
    for (const token of FORBIDDEN) {
      expect(src, `header still contains ${token}`).not.toContain(token);
    }
    expect(src).toContain("liveAgentJobs");
    expect(src).toContain("loadHounddogLiveJobs");
    expect(src).toMatch(/liveCount > 0/);
    expect(src).not.toContain("AGENTS.filter");
    expect(src).not.toContain("setInterval");
  });

  it("page still gates admin and still renders HounddogCommandCenter", () => {
    const src = read(PAGE);
    expect(src).toContain("HounddogCommandCenter");
    expect(src).toContain("gary@farmceuticawellness.com");
    expect(src).toContain("redirect('/dashboard')");
    expect(src).not.toContain("847");
    expect(src).not.toContain("2.1M");
  });
});

describe("Hounddog tool tabs stay usable without the 38 page-killing banner", () => {
  it.each(OTHER_TABS)("%s does not leak fixtures or paint HOUNDDOG_EMPTY_COPY", (rel) => {
    const src = read(rel);
    for (const token of FORBIDDEN) {
      expect(src, `${rel} still contains ${token}`).not.toContain(token);
    }
    expect(src).not.toContain("HOUNDDOG_EMPTY_COPY");
    expect(src).not.toMatch(/from ['"]\.\.\/shared\/EmptyState['"]/);
  });

  it("Content empty list copy is No scripts yet, not the 38 banner", () => {
    const src = read(CONTENT);
    expect(src).toContain("HOUNDDOG_CONTENT_EMPTY_COPY");
    expect(src).toContain("Write a script.");
    expect(src).toContain("Send to Pipeline");
    expect(src).not.toContain("Write only after a live platform is wired.");
    expect(HOUNDDOG_CONTENT_EMPTY_COPY).toBe("No scripts yet.");
  });

  it("Create keeps Idea-to-Pipeline and Generate & Push", () => {
    const src = read(CREATE);
    expect(src).toContain("IDEA TO PIPELINE");
    expect(src).toContain("Generate &amp; Push to Pipeline");
    expect(src).toContain("TikTok");
  });

  it("Auto-Script keeps Niche / platform / count and Generate Scripts", () => {
    const src = read(AUTO_SCRIPT);
    expect(src).toContain("placeholder=\"Niche\"");
    expect(src).toContain("Generate Scripts");
    expect(src).toContain("COUNT_OPTIONS");
    expect(src).toContain("TikTok");
  });

  it("Research keeps the competitor analyzer form", () => {
    const src = read(RESEARCH);
    expect(src).toContain("Competitor Analyzer");
    expect(src).toContain("Analyze");
  });

  it("constants do not export populated demo arrays", () => {
    const src = read(CONSTANTS);
    expect(src).toMatch(/export const AGENTS: AgentDef\[\] = \[\]/);
    expect(src).toMatch(/export const PLATFORMS: PlatformDef\[\] = \[\]/);
    expect(src).toMatch(/export const TOP_POSTS: TopPostDef\[\] = \[\]/);
    expect(src).toMatch(/export const ALERTS: AlertDef\[\] = \[\]/);
    expect(src).not.toContain("YouTube");
    expect(src).not.toContain("24.7");
  });

  it("empty copy is the locked Board-Metrics sentence", () => {
    expect(HOUNDDOG_EMPTY_COPY).toBe(
      "No connected social accounts. Hounddog stays empty until a live platform is wired.",
    );
  });

  it("does not invent last-sync or toast Connected", () => {
    const joined = [OVERVIEW, HEADER, ...OTHER_TABS].map(read).join("\n");
    expect(joined).not.toMatch(/toast\(|sonner|react-hot-toast/);
    expect(joined).not.toMatch(/Last sync|lastSyncAt:\s*['"]20/);
    expect(joined).not.toMatch(/status:\s*['"]connected['"]/);
    expect(read(HONESTY)).toContain("Do not invent Connected");
    expect(read(HONESTY)).toContain("return []");
  });
});
