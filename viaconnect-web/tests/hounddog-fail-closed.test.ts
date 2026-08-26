// Brief 38: /admin/hounddog fail-closed. Overview and header must not
// paint staged fixtures (847 / +12K / 2.1M / 6.8% / 24.7% / 3 AGENTS RUNNING).

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { HOUNDDOG_EMPTY_COPY } from "@/lib/hounddog/honesty";

const REPO = path.resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(path.join(REPO, rel), "utf8");
}

const OVERVIEW = "src/components/hounddog/tabs/OverviewTab.tsx";
const HEADER = "src/components/hounddog/HounddogCommandCenter.tsx";
const CONSTANTS = "src/lib/hounddog/constants.ts";
const PAGE = "src/app/(app)/admin/hounddog/page.tsx";

const OTHER_TABS = [
  "src/components/hounddog/tabs/ContentTab.tsx",
  "src/components/hounddog/tabs/CreateTab.tsx",
  "src/components/hounddog/tabs/AutoScriptTab.tsx",
  "src/components/hounddog/tabs/ResearchTab.tsx",
] as const;

const FORBIDDEN = [
  "847",
  "+12K",
  "2.1M",
  "6.8%",
  "24.7%",
  "3 AGENTS RUNNING",
  "AI replaced my team",
  "Morning Routine",
] as const;

describe("Hounddog Overview and header contain no staged fixtures", () => {
  it("Overview has none of the FAIL tokens and paints the empty copy", () => {
    const src = read(OVERVIEW);
    for (const token of FORBIDDEN) {
      expect(src, `Overview still contains ${token}`).not.toContain(token);
    }
    expect(src).toContain("EmptyState");
    expect(read("src/components/hounddog/shared/EmptyState.tsx")).toContain(
      "HOUNDDOG_EMPTY_COPY",
    );
    expect(src).toContain("loadHounddogLiveAccounts");
    expect(src).toContain("loadHounddogLiveJobs");
    expect(src).toContain("hasLiveSocialLastSync");
    expect(src).not.toMatch(/value=\{847\}|AI Tasks Completed|Posts in Queue|Avg Engagement/);
    expect(src).not.toMatch(/TOP_POSTS|ALERTS|PLATFORMS/);
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

describe("Hounddog tabs fail closed after fixture arrays are emptied", () => {
  it.each(OTHER_TABS)("%s does not leak 2.1M / 847 / demo agent copy", (rel) => {
    const src = read(rel);
    for (const token of FORBIDDEN) {
      expect(src, `${rel} still contains ${token}`).not.toContain(token);
    }
    expect(src).toMatch(/EmptyState|HOUNDDOG_EMPTY_COPY/);
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
    expect(read("src/lib/hounddog/honesty.ts")).toContain("Do not invent Connected");
  });
});
