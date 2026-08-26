import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import HounddogCommandCenter from "@/components/hounddog/HounddogCommandCenter";
import OverviewTab from "@/components/hounddog/tabs/OverviewTab";
import ContentTab from "@/components/hounddog/tabs/ContentTab";
import CreateTab from "@/components/hounddog/tabs/CreateTab";
import AutoScriptTab from "@/components/hounddog/tabs/AutoScriptTab";
import ResearchTab from "@/components/hounddog/tabs/ResearchTab";
import {
  HOUNDDOG_CONTENT_EMPTY_COPY,
  HOUNDDOG_EMPTY_COPY,
  HOUNDDOG_EMPTY_METRIC,
  HOUNDDOG_NO_SCRAPE_COPY,
} from "@/lib/hounddog/honesty";
import { HOUNDDOG_RESEARCH_EMPTY_COPY } from "@/lib/hounddog/researchFindings";
import type { HounddogSocialCountRow } from "@/lib/hounddog/socialCounts";

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

describe("Hounddog command center paints honest empty, not fixtures", () => {
  it("header omits N AGENTS RUNNING when no live job rows exist", () => {
    const html = renderToStaticMarkup(<HounddogCommandCenter />);
    expect(html).toContain("HOUNDDOG");
    expect(html).toContain("AI COMMAND CENTER");
    expect(html).not.toContain(HOUNDDOG_EMPTY_COPY);
    expect(html).not.toContain("AGENTS RUNNING");
    for (const token of FORBIDDEN) {
      expect(html, `header paint still contains ${token}`).not.toContain(token);
    }
  });

  it("Overview paints original chrome with -- / No scrape yet, not fixtures", () => {
    const html = renderToStaticMarkup(<OverviewTab />);
    expect(html).not.toContain(HOUNDDOG_EMPTY_COPY);
    expect(html).toContain("AI Tasks Completed");
    expect(html).toContain("Posts in Queue");
    expect(html).toContain("Avg Engagement");
    expect(html).toContain("EXPORT");
    expect(html).toContain("REPORT");
    expect(html).toContain("Scriptwriter");
    expect(html).toContain("Editor");
    expect(html).toContain("Scheduler");
    expect(html).toContain("Analyzer");
    expect(html).toContain("Social Performance");
    expect(html).toContain("Platform");
    expect(html).toContain("30 Day");
    expect(html).toContain("Top Performing Posts");
    expect(html).toContain(HOUNDDOG_EMPTY_METRIC);
    expect(html).toContain(HOUNDDOG_NO_SCRAPE_COPY);
    expect(html).not.toContain("4 LIVE");
    expect(html).not.toContain("2 OFFLINE");
    for (const token of FORBIDDEN) {
      expect(html, `Overview paint still contains ${token}`).not.toContain(token);
    }
  });

  it("Overview keeps No scrape yet on KPI/table only, not agent/insight/header chrome", () => {
    const html = renderToStaticMarkup(<OverviewTab />);
    const kpiStart = html.indexOf("AI Tasks Completed");
    const agentsStart = html.indexOf("AI Agents");
    const socialStart = html.indexOf("Social Performance");
    const topStart = html.indexOf("Top Performing Posts");
    expect(kpiStart).toBeGreaterThan(-1);
    expect(agentsStart).toBeGreaterThan(kpiStart);
    expect(socialStart).toBeGreaterThan(agentsStart);
    expect(topStart).toBeGreaterThan(socialStart);

    const insightHtml = html.slice(0, kpiStart);
    const kpiHtml = html.slice(kpiStart, agentsStart);
    const agentsHtml = html.slice(agentsStart, socialStart);
    const socialHtml = html.slice(socialStart, topStart);
    const topHtml = html.slice(topStart);

    expect(insightHtml).not.toContain(HOUNDDOG_NO_SCRAPE_COPY);
    expect(kpiHtml).toContain(HOUNDDOG_NO_SCRAPE_COPY);
    expect(kpiHtml).toContain(HOUNDDOG_EMPTY_METRIC);
    expect(agentsHtml).not.toContain(HOUNDDOG_NO_SCRAPE_COPY);
    expect(agentsHtml).toContain("Idle");
    expect(agentsHtml).toContain("IDLE");
    expect(agentsHtml).not.toContain("4 LIVE");
    expect(socialHtml).toContain(HOUNDDOG_NO_SCRAPE_COPY);
    expect(topHtml).not.toContain(HOUNDDOG_NO_SCRAPE_COPY);
    expect(topHtml).toContain(HOUNDDOG_EMPTY_METRIC);

    const phraseCount = html.split(HOUNDDOG_NO_SCRAPE_COPY).length - 1;
    // 3 KPI hints + 6 social-table day30 cells. Not banners / agents / top posts.
    expect(phraseCount).toBe(9);
    expect(html).not.toContain(HOUNDDOG_EMPTY_COPY);
  });

  it("Overview promotes a tile only from a real views/likes/reach row", () => {
    const real: HounddogSocialCountRow = {
      platform: "tiktok",
      views: 142,
      likes: 9,
      reach: 400,
      saves: 3,
      engRate: 5,
      recordedAt: "2026-08-26T00:00:00.000Z",
      postUrl: null,
    };
    const html = renderToStaticMarkup(<OverviewTab socialCounts={[real]} />);
    expect(html).toContain("142");
    expect(html).toContain("400");
    expect(html).toContain("5%");
    expect(html).not.toContain("847");
    expect(html).not.toContain("2.1M");
  });

  it("Overview does not bind URL-only digest rows or invent 129 as a count", () => {
    const urlOnly: HounddogSocialCountRow = {
      platform: "youtube",
      views: 0,
      likes: 0,
      reach: 0,
      saves: 0,
      engRate: 0,
      recordedAt: null,
      postUrl: "https://www.youtube.com/watch?v=digest",
    };
    const html = renderToStaticMarkup(
      <OverviewTab socialCounts={Array.from({ length: 129 }, () => urlOnly)} />,
    );
    expect(html).toContain(HOUNDDOG_EMPTY_METRIC);
    expect(html).toContain(HOUNDDOG_NO_SCRAPE_COPY);
    expect(html).not.toContain("129");
    expect(html).not.toContain("https://www.youtube.com/watch?v=digest");
    expect(html).not.toContain("Research Hub digest");
  });
});

describe("Hounddog tool tabs paint usable controls, not the 38 banner", () => {
  it("Create keeps Idea-to-Pipeline and Generate & Push without the empty banner", () => {
    const html = renderToStaticMarkup(<CreateTab />);
    expect(html).toContain("IDEA TO PIPELINE");
    expect(html).toContain("Generate &amp; Push to Pipeline");
    expect(html).toContain("TikTok");
    expect(html).not.toContain(HOUNDDOG_EMPTY_COPY);
    for (const token of FORBIDDEN) {
      expect(html, `Create still contains ${token}`).not.toContain(token);
    }
  });

  it("Auto-Script keeps Niche / platform / count and Generate Scripts", () => {
    const html = renderToStaticMarkup(<AutoScriptTab />);
    expect(html).toContain("Niche");
    expect(html).toContain("Generate Scripts");
    expect(html).toContain("TikTok");
    expect(html).not.toContain(HOUNDDOG_EMPTY_COPY);
    for (const token of FORBIDDEN) {
      expect(html, `Auto-Script still contains ${token}`).not.toContain(token);
    }
  });

  it("Content scheduled empty list is No scripts yet, not the 38 banner", () => {
    const html = renderToStaticMarkup(<ContentTab />);
    expect(html).toContain("Scheduled");
    expect(html).toContain("Scripts");
    expect(html).toContain("Editor");
    expect(html).toContain(HOUNDDOG_CONTENT_EMPTY_COPY);
    expect(html).not.toContain(HOUNDDOG_EMPTY_COPY);
    expect(html).not.toContain("Write only after a live platform is wired.");
    for (const token of FORBIDDEN) {
      expect(html, `Content still contains ${token}`).not.toContain(token);
    }
  });

  it("Content editor is usable without a live platform", () => {
    const html = renderToStaticMarkup(<ContentTab initialSubTab="editor" />);
    expect(html).toContain("Write a script.");
    expect(html).toContain("Send to Pipeline");
    expect(html).toContain("Duplicate");
    expect(html).not.toContain(HOUNDDOG_EMPTY_COPY);
    expect(html).not.toContain("Write only after a live platform is wired.");
  });

  it("Content scripts empty list is No scripts yet", () => {
    const html = renderToStaticMarkup(<ContentTab initialSubTab="scripts" />);
    expect(html).toContain(HOUNDDOG_CONTENT_EMPTY_COPY);
    expect(html).not.toContain(HOUNDDOG_EMPTY_COPY);
  });

  it("Research keeps the competitor analyzer without the empty banner", () => {
    const html = renderToStaticMarkup(<ResearchTab />);
    expect(html).toContain("Competitor Analyzer");
    expect(html).toContain("Analyze");
    expect(html).toContain("Research findings");
    expect(html).toContain(HOUNDDOG_RESEARCH_EMPTY_COPY);
    expect(html.indexOf("Competitor Analyzer")).toBeLessThan(html.indexOf("Research findings"));
    expect(html).not.toContain(HOUNDDOG_EMPTY_COPY);
    for (const token of FORBIDDEN) {
      expect(html, `Research still contains ${token}`).not.toContain(token);
    }
  });

  it("Sherlock findings list on Research only, never Content or Overview KPI", () => {
    const finding = {
      title: "Allowlist digest title",
      url: "https://example.com/sherlock",
      platform: "youtube",
      score: 0.77,
      fetchedAt: "2026-08-25T12:00:00.000Z",
      digestLine: "Why a methylation hook lands on YouTube",
      conversion: 18,
    };
    const research = renderToStaticMarkup(<ResearchTab findings={[finding]} />);
    expect(research).toContain("Research findings");
    expect(research).toContain("Allowlist digest title");
    expect(research).toContain("https://example.com/sherlock");
    expect(research).toContain("Why a methylation hook lands on YouTube");
    expect(research).toContain("18");
    expect(research).not.toContain(HOUNDDOG_RESEARCH_EMPTY_COPY);
    expect(renderToStaticMarkup(<ContentTab />)).not.toContain("Allowlist digest title");
    expect(renderToStaticMarkup(<OverviewTab />)).not.toContain("Allowlist digest title");
    expect(renderToStaticMarkup(<OverviewTab />)).not.toContain("https://example.com/sherlock");
  });

  it("omits conversion unless the injected finding has a real count > 0", () => {
    const html = renderToStaticMarkup(
      <ResearchTab
        findings={[
          {
            title: "Allowlist digest title",
            url: "https://example.com/sherlock",
            platform: "youtube",
            score: 59,
            fetchedAt: "2026-08-26T12:00:00.000Z",
          },
        ]}
      />,
    );
    expect(html).toContain("Allowlist digest title");
    expect(html).not.toContain("conversion");
    expect(html).not.toContain(HOUNDDOG_EMPTY_METRIC);
  });
});

