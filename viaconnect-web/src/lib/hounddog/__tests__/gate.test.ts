import { describe, it, expect } from "vitest";
import { gateFindings } from "../gate";

const sev = (s: "P0" | "P1" | "P2" | "P3" | "ADVISORY") => ({ ruleId: `TEST.${s}`, severity: s as never });

describe("Confidence gate matrix", () => {
  it("P2 + 0.90 auto_open", () => {
    expect(gateFindings([sev("P2")], 0.90)).toBe("auto_open");
  });
  it("P1 + 0.90 queue_steve", () => {
    expect(gateFindings([sev("P1")], 0.90)).toBe("queue_steve");
  });
  it("P0 + 0.99 queue_steve (never auto)", () => {
    expect(gateFindings([sev("P0")], 0.99)).toBe("queue_steve");
  });
  it("P2 + 0.70 queue_review", () => {
    expect(gateFindings([sev("P2")], 0.70)).toBe("queue_review");
  });
  it("P1 + 0.75 queue_review", () => {
    expect(gateFindings([sev("P1")], 0.75)).toBe("queue_review");
  });
  it("any + 0.50 below_threshold", () => {
    expect(gateFindings([sev("P0")], 0.50)).toBe("below_threshold");
    expect(gateFindings([sev("P2")], 0.50)).toBe("below_threshold");
  });
  it("empty findings below_threshold", () => {
    expect(gateFindings([], 0.99)).toBe("below_threshold");
  });
  it("mixed severities use worst", () => {
    expect(gateFindings([sev("P2"), sev("P1")], 0.90)).toBe("queue_steve");
  });
  it("ADVISORY + 0.90 auto_open", () => {
    expect(gateFindings([sev("ADVISORY")], 0.90)).toBe("auto_open");
  });
  it("P3 + 0.85 auto_open at exactly floor", () => {
    expect(gateFindings([sev("P3")], 0.85)).toBe("auto_open");
  });
});
