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
    expect(html).not.toContain(HOUNDDOG_EMPTY_COPY);
    for (const token of FORBIDDEN) {
      expect(html, `Research still contains ${token}`).not.toContain(token);
    }
  });
});

