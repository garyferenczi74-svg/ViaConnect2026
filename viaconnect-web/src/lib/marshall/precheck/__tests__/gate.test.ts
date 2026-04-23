import { describe, it, expect } from "vitest";
import { canClear, PRECHECK_GATES, summarizeFindings } from "../evaluate";
import type { PrecheckFindingDto } from "../types";

function f(sev: "P0" | "P1" | "P2" | "P3" | "ADVISORY", confidence: number, kind: PrecheckFindingDto["remediationKind"] = "pending"): PrecheckFindingDto {
  return {
    findingId: "fid",
    ruleId: "MARSHALL.TEST",
    severity: sev,
    surface: "precheck_draft",
    source: "runtime",
    location: {},
    excerpt: "",
    message: "",
    citation: "",
    remediation: { kind: "suggested", summary: "" },
    createdAt: new Date().toISOString(),
    confidence,
    round: 1,
    remediationKind: kind,
  };
}

describe("canClear", () => {
  it("P0 at any confidence blocks clearance", () => {
    expect(canClear([f("P0", 0.1)])).toBe(false);
    expect(canClear([f("P0", 0.99)])).toBe(false);
  });
  it("P1 at any confidence blocks clearance", () => {
    expect(canClear([f("P1", 0.3)])).toBe(false);
  });
  it("Unremediated high-confidence P2 blocks clearance", () => {
    expect(canClear([f("P2", PRECHECK_GATES.HARD_BLOCK)])).toBe(false);
  });
  it("User-accepted P2 does not block clearance", () => {
    expect(canClear([f("P2", 0.95, "user_accepted")])).toBe(true);
  });
  it("Low-confidence P2 does not block clearance", () => {
    expect(canClear([f("P2", 0.5)])).toBe(true);
  });
  it("P3 + ADVISORY never block clearance", () => {
    expect(canClear([f("P3", 0.99), f("ADVISORY", 0.99)])).toBe(true);
  });
  it("empty findings clears", () => {
    expect(canClear([])).toBe(true);
  });
});

describe("summarizeFindings", () => {
  it("counts by severity", () => {
    const s = summarizeFindings([f("P0", 0.9), f("P2", 0.8), f("P2", 0.7), f("ADVISORY", 0.9)]);
    expect(s).toEqual({ p0: 1, p1: 0, p2: 2, p3: 0, advisory: 1 });
  });
});
