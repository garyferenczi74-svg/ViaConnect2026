import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  REQUIRED_HEADSUP_SECTIONS,
  assertHeadsupReport,
} from "../headsupReport";

const REPORT = resolve(
  __dirname,
  "../../../../docs/superpowers/reports/2026-08-18-prompt-222-headsup-teardown.md"
);

describe("prompt222 report", () => {
  it("lists the required sections", () => {
    expect(REQUIRED_HEADSUP_SECTIONS).toHaveLength(17);
  });

  it("report file satisfies the validator", () => {
    const md = readFileSync(REPORT, "utf8");
    const result = assertHeadsupReport(md);
    expect(result.missing).toEqual([]);
    expect(result.dashHits).toBe(0);
    expect(result.citationCount).toBeGreaterThanOrEqual(15);
    expect(result.ok).toBe(true);
    expect(md).toMatch(/INTERNAL STRATEGY/);
    expect(md).toMatch(/needs_human/);
    expect(md).toMatch(/\$250/);
    expect(md).toMatch(/Halo/);
    expect(md).toMatch(/1upHealth/);
    expect(md).toMatch(/GENEX360/);
    expect(md).toMatch(/Helix/);
  });
});
