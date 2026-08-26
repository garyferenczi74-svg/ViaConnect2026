import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import HounddogCommandCenter from "@/components/hounddog/HounddogCommandCenter";
import OverviewTab from "@/components/hounddog/tabs/OverviewTab";
import { HOUNDDOG_EMPTY_COPY } from "@/lib/hounddog/honesty";

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

describe("Hounddog command center paints honest empty, not fixtures", () => {
  it("header omits N AGENTS RUNNING when no live job rows exist", () => {
    const html = renderToStaticMarkup(<HounddogCommandCenter />);
    expect(html).toContain("HOUNDDOG");
    expect(html).toContain("AI COMMAND CENTER");
    expect(html).toContain(HOUNDDOG_EMPTY_COPY);
    expect(html).not.toContain("AGENTS RUNNING");
    for (const token of FORBIDDEN) {
      expect(html, `header paint still contains ${token}`).not.toContain(token);
    }
  });

  it("Overview paints the locked empty copy and no KPI tiles", () => {
    const html = renderToStaticMarkup(<OverviewTab />);
    expect(html).toContain(HOUNDDOG_EMPTY_COPY);
    expect(html).not.toContain("AI Tasks Completed");
    expect(html).not.toContain("Posts in Queue");
    expect(html).not.toContain("Avg Engagement");
    expect(html).not.toContain("YouTube");
    for (const token of FORBIDDEN) {
      expect(html, `Overview paint still contains ${token}`).not.toContain(token);
    }
  });
});
