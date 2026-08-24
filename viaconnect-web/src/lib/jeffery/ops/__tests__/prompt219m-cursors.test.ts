/**
 * Prompt 219M: cursor advance rules and PubMed mindate.
 */
import { describe, it, expect } from "vitest";
import {
  pubmedMindateFromCursor,
  cursorFreshnessStatus,
  todayUtcDate,
} from "@/lib/jeffery/ops/discoveryCursors";

describe("219M discovery cursors", () => {
  it("pubmed mindate is day after cursor date in NCBI format", () => {
    expect(pubmedMindateFromCursor("2026-08-15")).toBe("2026/08/16");
  });

  it("todayUtcDate is ISO date", () => {
    expect(todayUtcDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("freshness: ok within period, warning before 2x, breach after 2x", () => {
    // expected 360 minutes; 2x = 720 minutes
    const recent = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1h
    expect(cursorFreshnessStatus(recent, 360)).toBe("ok");
    const mid = new Date(Date.now() - 500 * 60 * 1000).toISOString(); // 500m
    expect(cursorFreshnessStatus(mid, 360)).toBe("warning");
    const veryOld = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(); // 30h
    expect(cursorFreshnessStatus(veryOld, 360)).toBe("breach");
    expect(cursorFreshnessStatus(null, 360)).toBe("unknown");
  });
});
