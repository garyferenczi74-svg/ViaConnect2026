import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  HOUNDDOG_RESEARCH_EMPTY_COPY,
  HOUNDDOG_RESEARCH_MIN_SCORE,
  HOUNDDOG_RESEARCH_TOPIC_KEY,
  appendResearchDay,
  canWriteResearchFinding,
  extractConversion,
  extractDigestLine,
  extractRawPayloadPlatform,
  isHounddogHookPayload,
  isHounddogPipelinePayload,
  isHounddogScriptPayload,
  isRealConversion,
  loadHounddogResearchFindings,
  mapStagingItemToResearchFinding,
  queryHounddogResearchFindings,
  type HounddogResearchFinding,
  type HounddogResearchStagingRow,
  type ResearchStagingQueryClient,
} from "@/lib/hounddog/researchFindings";
import {
  HOUNDDOG_EMPTY_METRIC,
  HOUNDDOG_NO_SCRAPE_COPY,
} from "@/lib/hounddog/honesty";
import { bindOverviewKpis, loadHounddogSocialCounts } from "@/lib/hounddog/socialCounts";

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
  digestLine: "Why a methylation hook lands on YouTube",
};

function stagingRow(
  partial: Partial<HounddogResearchStagingRow> & {
    raw_payload?: HounddogResearchStagingRow["raw_payload"];
  } = {},
): HounddogResearchStagingRow {
  return {
    title: "Allowlist digest title",
    source_url: "https://example.com/sherlock",
    retrieved_at: "2026-08-26T12:00:00.000Z",
    relevance_score: 59,
    topic_key: HOUNDDOG_RESEARCH_TOPIC_KEY,
    raw_payload: {
      platform: "youtube",
      digest: "Why a methylation hook lands on YouTube",
      score: 59,
    },
    ...partial,
  };
}

describe("Sherlock findings stay off Content / pipeline / KPI", () => {
  it("defaults to Research Hub (empty Hounddog list)", () => {
    expect(loadHounddogResearchFindings()).toEqual([]);
    expect(loadHounddogResearchFindings([])).toEqual([]);
    expect(loadHounddogResearchFindings(null)).toEqual([]);
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

describe("Brief 55 land contract", () => {
  it("empty copy is exactly No scrape rows today.", () => {
    expect(HOUNDDOG_RESEARCH_EMPTY_COPY).toBe("No scrape rows today.");
  });

  it("feed is under Analyzer and always present", () => {
    const research = read("src/components/hounddog/tabs/ResearchTab.tsx");
    expect(research.indexOf("Competitor Analyzer")).toBeLessThan(
      research.indexOf("Research findings"),
    );
    expect(research).toContain("HOUNDDOG_RESEARCH_EMPTY_COPY");
    expect(research).not.toMatch(/researchFindings\.length > 0 &&/);
    expect(research).toContain("researchFindings.length === 0");
  });

  it("append-by-day does not replace yesterday", () => {
    const yesterday: HounddogResearchFinding = {
      title: "Yesterday AG1 hook",
      url: "https://example.com/ag1",
      platform: "tiktok",
      score: 61,
      fetchedAt: "2026-08-25T18:00:00.000Z",
      digestLine: "Yesterday digest",
    };
    const todaySameUrl: HounddogResearchFinding = {
      title: "Today AG1 hook",
      url: "https://example.com/ag1",
      platform: "tiktok",
      score: 70,
      fetchedAt: "2026-08-26T09:00:00.000Z",
      digestLine: "Today digest",
    };
    const appended = appendResearchDay([yesterday], [todaySameUrl]);
    expect(appended).toHaveLength(2);
    expect(appended[0]?.title).toBe("Yesterday AG1 hook");
    expect(appended[1]?.title).toBe("Today AG1 hook");

    const deduped = appendResearchDay([yesterday], [yesterday]);
    expect(deduped).toHaveLength(1);
  });

  it("conversion omitted unless real count > 0", () => {
    expect(isRealConversion(0)).toBe(false);
    expect(isRealConversion(null)).toBe(false);
    expect(isRealConversion(Number.NaN)).toBe(false);
    expect(isRealConversion(12)).toBe(true);
    expect(extractConversion(stagingRow())).toBeUndefined();
    expect(
      extractConversion(
        stagingRow({ raw_payload: { platform: "youtube", digest: "line", conversion: 0 } }),
      ),
    ).toBeUndefined();
    expect(
      extractConversion(
        stagingRow({ raw_payload: { platform: "youtube", digest: "line", engagement: 18 } }),
      ),
    ).toBe(18);

    const mappedZero = mapStagingItemToResearchFinding(
      stagingRow({ raw_payload: { platform: "youtube", digest: "line", conversion: 0 } }),
    );
    expect(mappedZero).not.toBeNull();
    expect(mappedZero).not.toHaveProperty("conversion");

    expect(
      canWriteResearchFinding({
        title: "Ritual magnesium hook",
        conversion: 0,
      }),
    ).toBe(false);
    expect(
      canWriteResearchFinding({
        title: "Ritual magnesium hook",
      }),
    ).toBe(true);
    expect(
      appendResearchDay([], [{ title: "Ritual magnesium hook", conversion: 44 }])[0],
    ).toMatchObject({ conversion: 44 });
    expect(
      appendResearchDay([], [{ title: "Ritual magnesium hook" }])[0],
    ).not.toHaveProperty("conversion");
  });

  it("GLP-1 / Semaglutide write is rejected", () => {
    expect(
      canWriteResearchFinding({ title: "Semaglutide vs AG1" }),
    ).toBe(false);
    expect(
      canWriteResearchFinding({
        title: "Metabolic peptide clip",
        digestLine: "GLP-1 adjacency",
      }),
    ).toBe(false);
    expect(canWriteResearchFinding({ title: "Ozempic ad teardown" })).toBe(false);
    expect(canWriteResearchFinding({ title: "AG1 morning stack" })).toBe(true);
    expect(
      mapStagingItemToResearchFinding(
        stagingRow({ title: "Wegovy competitor teardown" }),
      ),
    ).toBeNull();
  });

  it("canWriteResearchFinding never targets performance / rollup", () => {
    expect(
      canWriteResearchFinding({
        title: "AG1 hook",
        targetTable: "hounddog_performance",
      }),
    ).toBe(false);
    expect(
      canWriteResearchFinding({
        title: "AG1 hook",
        table: "hounddog_analytics_rollup",
      }),
    ).toBe(false);
    expect(
      canWriteResearchFinding({
        title: "AG1 hook",
        views: 100,
        likes: 4,
        reach: 200,
      }),
    ).toBe(false);

    const src = read("src/lib/hounddog/researchFindings.ts");
    expect(src).not.toMatch(/from\(['"]hounddog_performance['"]\)/);
    expect(src).not.toMatch(/from\(['"]hounddog_analytics_rollup['"]\)/);
    expect(src).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
  });

  it("Overview / socialCounts still -- / No scrape yet; no getHounddogAnalyticsSummary", () => {
    expect(loadHounddogSocialCounts()).toEqual([]);
    const kpis = bindOverviewKpis(loadHounddogSocialCounts());
    expect(kpis.aiTasks).toBe(HOUNDDOG_EMPTY_METRIC);
    expect(kpis.postsInQueue).toBe(HOUNDDOG_EMPTY_METRIC);
    expect(kpis.avgEngagement).toBe(HOUNDDOG_EMPTY_METRIC);
    expect(kpis.hint).toBe(HOUNDDOG_NO_SCRAPE_COPY);

    const overview = read("src/components/hounddog/tabs/OverviewTab.tsx");
    const social = read("src/lib/hounddog/socialCounts.ts");
    expect(overview).not.toContain("getHounddogAnalyticsSummary");
    expect(overview).not.toContain("loadHounddogResearchFindings");
    expect(social).not.toContain("getHounddogAnalyticsSummary");
    expect(social).toContain("HOUNDDOG_EMPTY_METRIC");
    expect(social).toContain("HOUNDDOG_NO_SCRAPE_COPY");
  });

  it("Content / pipeline still must not load findings", () => {
    const content = read("src/components/hounddog/tabs/ContentTab.tsx");
    const create = read("src/components/hounddog/tabs/CreateTab.tsx");
    const auto = read("src/components/hounddog/tabs/AutoScriptTab.tsx");
    const analytics = read("src/lib/hounddog/analytics.ts");
    expect(content).not.toContain("queryHounddogResearchFindings");
    expect(content).not.toContain("loadHounddogResearchFindings");
    expect(create).not.toContain("loadHounddogResearchFindings");
    expect(auto).not.toContain("loadHounddogResearchFindings");
    expect(analytics).not.toContain("hounddog_research");
  });
});

describe("Jeffery field map from hounddog_staging_items", () => {
  it("maps title / source_url / raw_payload.platform / relevance_score / retrieved_at", () => {
    const mapped = mapStagingItemToResearchFinding(stagingRow());
    expect(mapped).toEqual({
      title: "Allowlist digest title",
      url: "https://example.com/sherlock",
      platform: "youtube",
      score: 59,
      fetchedAt: "2026-08-26T12:00:00.000Z",
      digestLine: "Why a methylation hook lands on YouTube",
    });
    expect(extractRawPayloadPlatform({ platform: "instagram" })).toBe("instagram");
    expect(extractRawPayloadPlatform({})).toBeNull();
  });

  it("digestLine comes from a real digest/why field and is omitted when missing", () => {
    expect(extractDigestLine(stagingRow())).toBe(
      "Why a methylation hook lands on YouTube",
    );
    expect(
      extractDigestLine(stagingRow({ raw_payload: { platform: "youtube" } })),
    ).toBeUndefined();
    const noDigest = mapStagingItemToResearchFinding(
      stagingRow({ raw_payload: { platform: "tiktok" } }),
    );
    expect(noDigest).not.toBeNull();
    expect(noDigest).not.toHaveProperty("digestLine");
    const src = read("src/lib/hounddog/researchFindings.ts");
    expect(src).not.toMatch(/digestLine:\s*row\.summary/);
    expect(src).not.toMatch(/digestLine:\s*row\.title/);
  });

  it("filters topic_key=hounddog_research and score ≥50", () => {
    expect(
      loadHounddogResearchFindings([
        stagingRow({ topic_key: "peptide-education" }),
        stagingRow({ relevance_score: 49, source_url: "https://example.com/low" }),
        stagingRow({ relevance_score: "77", source_url: "https://example.com/ok" }),
      ]),
    ).toEqual([
      expect.objectContaining({
        url: "https://example.com/ok",
        score: 77,
      }),
    ]);
    expect(HOUNDDOG_RESEARCH_TOPIC_KEY).toBe("hounddog_research");
    expect(HOUNDDOG_RESEARCH_MIN_SCORE).toBe(50);
  });

  it("query binds staging topic_key and does not seed titles", async () => {
    const calls: { table?: string; eq?: [string, string]; gte?: [string, number] } = {};
    const client: ResearchStagingQueryClient = {
      from(table) {
        calls.table = table;
        return {
          select() {
            return {
              eq(column, value) {
                calls.eq = [column, value];
                return {
                  gte(column2, value2) {
                    calls.gte = [column2, value2];
                    return Promise.resolve({ data: [stagingRow()], error: null });
                  },
                };
              },
            };
          },
        };
      },
    };

    const findings = await queryHounddogResearchFindings(client);
    expect(calls.table).toBe("hounddog_staging_items");
    expect(calls.eq).toEqual(["topic_key", "hounddog_research"]);
    expect(calls.gte).toEqual(["relevance_score", 50]);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.url).toBe("https://example.com/sherlock");

    const emptyClient: ResearchStagingQueryClient = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  gte() {
                    return Promise.resolve({ data: [], error: null });
                  },
                };
              },
            };
          },
        };
      },
    };
    expect(await queryHounddogResearchFindings(emptyClient)).toEqual([]);

    const lib = read("src/lib/hounddog/researchFindings.ts");
    const research = read("src/components/hounddog/tabs/ResearchTab.tsx");
    const constants = read("src/lib/hounddog/constants.ts");
    expect(lib).toContain("source_url");
    expect(lib).toContain("relevance_score");
    expect(lib).toContain("retrieved_at");
    expect(lib).toContain("raw_payload");
    expect(lib).toContain("hounddog_research");
    expect(research).not.toContain("Allowlist digest title");
    expect(constants).not.toContain("hounddog_research");
    expect(constants).toMatch(/export const COMPETITORS: CompetitorDef\[\] = \[\]/);
    expect(constants).toMatch(/export const TOP_HOOKS: TopHook\[\] = \[\]/);
  });

  it("page binds the query after the admin gate and does not write performance", () => {
    const page = read("src/app/(app)/admin/hounddog/page.tsx");
    expect(page).toContain("queryHounddogResearchFindings");
    expect(page).toContain("researchFindings");
    expect(page).not.toContain("getHounddogAnalyticsSummary");
    expect(page).not.toMatch(/from\(['"]hounddog_performance['"]\)/);
    expect(page).not.toMatch(/from\(['"]hounddog_analytics_rollup['"]\)/);
  });
});
