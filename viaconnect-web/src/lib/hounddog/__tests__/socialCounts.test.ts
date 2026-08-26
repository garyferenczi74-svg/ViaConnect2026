import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  HOUNDDOG_EMPTY_METRIC,
  HOUNDDOG_NO_SCRAPE_COPY,
} from "@/lib/hounddog/honesty";
import {
  bindOverviewKpis,
  bindSocialTableCells,
  canWriteAnalyticsRollup,
  canWritePerformanceSnapshot,
  countUrlOnlyDigestRows,
  findCountForPlatform,
  formatSocialCount,
  hasRealSocialCount,
  isRealSocialCount,
  isUrlOnlyDigestRow,
  lastSyncFromDigestRows,
  loadHounddogSocialCounts,
  selectRealSocialCounts,
  socialCountFromUrlRowCount,
  type HounddogSocialCountRow,
} from "@/lib/hounddog/socialCounts";

const REPO = path.resolve(__dirname, "../../../..");

function read(rel: string): string {
  return readFileSync(path.join(REPO, rel), "utf8");
}

function countRow(
  partial: Partial<HounddogSocialCountRow> & Pick<HounddogSocialCountRow, "platform">,
): HounddogSocialCountRow {
  return {
    views: null,
    likes: null,
    reach: null,
    saves: null,
    engRate: null,
    recordedAt: null,
    postUrl: null,
    ...partial,
  };
}

describe("real social counts only", () => {
  it("treats 0 / null / NaN as missing, not a scrape", () => {
    expect(isRealSocialCount(null)).toBe(false);
    expect(isRealSocialCount(undefined)).toBe(false);
    expect(isRealSocialCount(0)).toBe(false);
    expect(isRealSocialCount(Number.NaN)).toBe(false);
    expect(isRealSocialCount(142)).toBe(true);
    expect(formatSocialCount(0)).toBe(HOUNDDOG_EMPTY_METRIC);
    expect(formatSocialCount(142)).toBe("142");
  });

  it("promotes a row only when views, likes, or reach is real", () => {
    expect(hasRealSocialCount(countRow({ platform: "tiktok", views: 0, likes: 0, reach: 0 }))).toBe(
      false,
    );
    expect(hasRealSocialCount(countRow({ platform: "tiktok", views: 88 }))).toBe(true);
    expect(hasRealSocialCount(countRow({ platform: "youtube", likes: 12 }))).toBe(true);
    expect(hasRealSocialCount(countRow({ platform: "instagram", reach: 400 }))).toBe(true);
  });

  it("does not treat Sherlock URL / title / score rows as social counts", () => {
    const urlOnly = {
      platform: "youtube",
      views: 0,
      likes: 0,
      reach: 0,
      postUrl: "https://www.youtube.com/watch?v=digest",
      title: "Research Hub digest title",
      score: 0.91,
    };
    expect(isUrlOnlyDigestRow(urlOnly)).toBe(true);
    expect(hasRealSocialCount(urlOnly)).toBe(false);
    expect(canWritePerformanceSnapshot(urlOnly)).toBe(false);
  });

  it("never invents a count from URL-row cardinality (the old 129)", () => {
    const digest = Array.from({ length: 129 }, (_, i) => ({
      platform: "youtube",
      views: 0,
      likes: 0,
      reach: 0,
      postUrl: `https://example.com/${i}`,
      title: `Digest ${i}`,
      score: 0.5,
    }));
    expect(countUrlOnlyDigestRows(digest)).toBe(129);
    expect(selectRealSocialCounts(digest.map((row) => countRow(row)))).toEqual([]);
    expect(socialCountFromUrlRowCount(digest.length)).toBe(HOUNDDOG_EMPTY_METRIC);
    const kpis = bindOverviewKpis(digest.map((row) => countRow(row)));
    expect(kpis.aiTasks).toBe(HOUNDDOG_EMPTY_METRIC);
    expect(kpis.postsInQueue).toBe(HOUNDDOG_EMPTY_METRIC);
    expect(kpis.avgEngagement).toBe(HOUNDDOG_EMPTY_METRIC);
    expect(kpis.hint).toBe(HOUNDDOG_NO_SCRAPE_COPY);
  });
});

describe("Overview binder", () => {
  it("keeps -- / No scrape yet when the live loader is empty", () => {
    expect(loadHounddogSocialCounts()).toEqual([]);
    const kpis = bindOverviewKpis(loadHounddogSocialCounts());
    expect(kpis.aiTasks).toBe("--");
    expect(kpis.postsInQueue).toBe("--");
    expect(kpis.avgEngagement).toBe("--");
    expect(kpis.hint).toBe(HOUNDDOG_NO_SCRAPE_COPY);
  });

  it("does not invent AI Tasks or Queue from a real reach scrape", () => {
    const kpis = bindOverviewKpis([
      countRow({ platform: "tiktok", reach: 400, engRate: 5 }),
    ]);
    expect(kpis.aiTasks).toBe(HOUNDDOG_EMPTY_METRIC);
    expect(kpis.postsInQueue).toBe(HOUNDDOG_EMPTY_METRIC);
    expect(kpis.avgEngagement).toBe("5%");
  });

  it("last-sync without counts still paints -- for numbers", () => {
    const kpis = bindOverviewKpis([], [
      { platform: "youtube", lastSyncAt: "2026-08-26T00:00:00.000Z" },
    ]);
    expect(kpis.aiTasks).toBe(HOUNDDOG_EMPTY_METRIC);
    expect(kpis.avgEngagement).toBe(HOUNDDOG_EMPTY_METRIC);
    expect(kpis.hint).toBe(HOUNDDOG_NO_SCRAPE_COPY);
  });

  it("binds social-table reach / views only from a real count row", () => {
    const empty = bindSocialTableCells(undefined);
    expect(empty.day30).toBe(HOUNDDOG_NO_SCRAPE_COPY);
    expect(empty.reach).toBe(HOUNDDOG_EMPTY_METRIC);
    expect(empty.posts).toBe(HOUNDDOG_EMPTY_METRIC);

    const bound = bindSocialTableCells(
      countRow({ platform: "YouTube", views: 300, reach: 900, engRate: 4, saves: 11 }),
    );
    expect(bound.day30).toBe("300");
    expect(bound.reach).toBe("900");
    expect(bound.eng).toBe("4%");
    expect(bound.saves).toBe("11");
    expect(bound.posts).toBe(HOUNDDOG_EMPTY_METRIC);
    expect(bound.growth).toBe(HOUNDDOG_EMPTY_METRIC);
  });

  it("matches platform chrome without inventing a connected account", () => {
    const rows = [countRow({ platform: "youtube", reach: 50 })];
    expect(findCountForPlatform(rows, "YouTube")?.reach).toBe(50);
    expect(findCountForPlatform(rows, "TikTok")).toBeUndefined();
  });

  it("does not take last-sync from Research Hub digest fetch times", () => {
    expect(
      lastSyncFromDigestRows([
        {
          title: "Digest title",
          url: "https://example.com/a",
          platform: "youtube",
          score: 0.8,
          fetchedAt: "2026-08-25T12:00:00.000Z",
        },
      ]),
    ).toBeNull();
  });
});

describe("write guards stay social-count only", () => {
  it("allows a views/likes/reach snapshot and rejects digest fields", () => {
    expect(canWritePerformanceSnapshot({ views: 10, likes: 0, reach: 0 })).toBe(true);
    expect(canWritePerformanceSnapshot({ views: 0, likes: 0, reach: 0 })).toBe(false);
    expect(canWritePerformanceSnapshot({ views: 10, title: "Digest" })).toBe(false);
    expect(canWriteAnalyticsRollup({ total_reach: 200 })).toBe(true);
    expect(canWriteAnalyticsRollup({ total_reach: 0 })).toBe(false);
    expect(canWriteAnalyticsRollup({ total_reach: 200, title: "nope" })).toBe(false);
  });
});

describe("Overview / persist sources honor the contract", () => {
  it("Overview does not call getHounddogAnalyticsSummary or query rollup / hub", () => {
    const src = read("src/components/hounddog/tabs/OverviewTab.tsx");
    expect(src).toContain("bindOverviewKpis");
    expect(src).toContain("bindSocialTableCells");
    expect(src).toContain("loadHounddogSocialCounts");
    expect(src).not.toContain("getHounddogAnalyticsSummary");
    expect(src).not.toContain("hounddog_analytics_rollup");
    expect(src).not.toContain("research_hub");
    expect(src).not.toContain("lastSyncFromDigestRows");
  });

  it("recordPerformance refuses a write that is not a social count", () => {
    const src = read("src/lib/hounddog/analytics.ts");
    expect(src).toContain("canWritePerformanceSnapshot");
    expect(src).toContain("canWriteAnalyticsRollup");
    expect(src).not.toMatch(/title:\s*script\.title/);
  });
});
