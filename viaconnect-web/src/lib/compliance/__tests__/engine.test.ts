import { describe, it, expect } from "vitest";
import { RuleEngine } from "../engine/RuleEngine";
import { allRules } from "../rules";

describe("RuleEngine", () => {
  it("tree-shakes rules by surface", () => {
    const engine = RuleEngine.fromRules(allRules);
    const aiRules = engine.rulesForSurface("ai_output");
    expect(aiRules.length).toBeGreaterThan(0);
    for (const r of aiRules) expect(r.surfaces).toContain("ai_output");
  });

  it("evaluate returns findings on semaglutide in content_cms", async () => {
    const engine = RuleEngine.fromRules(allRules);
    const res = await engine.evaluate({
      surface: "content_cms",
      source: "runtime",
      content: "Recommend semaglutide for weight management",
    });
    const hits = res.findings.filter((f) => f.ruleId === "MARSHALL.PEPTIDE.NO_SEMAGLUTIDE");
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(res.highestSeverity).toBe("P0");
  });

  it("evaluate returns no findings for clean content", async () => {
    const engine = RuleEngine.fromRules(allRules);
    const res = await engine.evaluate({
      surface: "content_cms",
      source: "runtime",
      content: "Bio Optimization tracking helps consumers stay on protocol. These statements have not been evaluated by the FDA.",
    });
    expect(res.findings.length).toBe(0);
  });

  it("setEnabled toggles rule participation", async () => {
    const engine = RuleEngine.fromRules(allRules);
    engine.setEnabled("MARSHALL.PEPTIDE.NO_SEMAGLUTIDE", false);
    const res = await engine.evaluate({
      surface: "content_cms",
      source: "runtime",
      content: "semaglutide mentioned",
    });
    const hits = res.findings.filter((f) => f.ruleId === "MARSHALL.PEPTIDE.NO_SEMAGLUTIDE");
    expect(hits.length).toBe(0);
  });

  it("fail-safes on rule evaluator exception", async () => {
    const engine = RuleEngine.fromRules([
      {
        id: "TEST.BROKEN",
        pillar: "BRAND",
        severity: "P1",
        surfaces: ["content_cms"],
        citation: "test",
        description: "broken",
        evaluate: () => { throw new Error("intentional"); },
        lastReviewed: "2026-04-23",
      },
    ]);
    const res = await engine.evaluate({
      surface: "content_cms",
      source: "runtime",
      content: "x",
    });
    const advisory = res.findings.find((f) => f.ruleId === "TEST.BROKEN");
    expect(advisory?.severity).toBe("ADVISORY");
  });
});
