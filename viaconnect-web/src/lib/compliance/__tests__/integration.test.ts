import { describe, it, expect } from "vitest";
import { RuleEngine } from "../engine/RuleEngine";
import { AutoRemediator } from "../engine/AutoRemediator";
import { allRules } from "../rules";

describe("Full cart flow: Retatrutide stacking block", () => {
  it("blocks when cart contains Retatrutide + another peptide", async () => {
    const engine = RuleEngine.fromRules(allRules);
    const res = await engine.evaluate({
      surface: "checkout",
      source: "runtime",
      cart: [
        { sku: "RET-INJ-30ML", category: "peptide" },
        { sku: "BPC-INJ-10ML", category: "peptide" },
      ],
    });
    const hit = res.findings.find((f) => f.ruleId === "MARSHALL.PEPTIDE.NO_RETATRUTIDE_STACKING");
    expect(hit?.severity).toBe("P0");
  });
});

describe("Full AI output flow: Semaglutide attempt", () => {
  it("produces P0 finding with Semaglutide in AI output", async () => {
    const engine = RuleEngine.fromRules(allRules);
    const res = await engine.evaluate({
      surface: "ai_output",
      source: "runtime",
      aiOutput: { agent: "jeffery", text: "Consider semaglutide for GLP-1 support." },
      content: "Consider semaglutide for GLP-1 support.",
    });
    expect(res.highestSeverity).toBe("P0");
    const sem = res.findings.find((f) => f.ruleId === "MARSHALL.PEPTIDE.NO_SEMAGLUTIDE");
    expect(sem).toBeTruthy();
  });
});

describe("AutoRemediator applies to auto-fix rules only", () => {
  it("strips emoji but leaves P0 findings untouched", async () => {
    const engine = RuleEngine.fromRules(allRules);
    const input = "Bio Optimization looks good \u{1F389} but semaglutide is forbidden.";
    const scan = await engine.evaluate({
      surface: "ai_output",
      source: "runtime",
      aiOutput: { agent: "test", text: input },
      content: input,
    });
    const remediator = new AutoRemediator((id) => engine.getRule(id));
    const result = await remediator.apply(input, scan.findings);
    expect(result.remediated).not.toMatch(/\u{1F389}/u);
    // P0 rules are never auto-applied; should remain in skipped
    expect(result.skipped.some((f) => f.severity === "P0")).toBe(true);
  });
});

describe("Bioavailability normalization", () => {
  it("auto-remediates 5-27x to 10-27x", async () => {
    const engine = RuleEngine.fromRules(allRules);
    const input = "5-27x more bioavailable formulation";
    const scan = await engine.evaluate({
      surface: "content_cms",
      source: "runtime",
      content: input,
    });
    const remediator = new AutoRemediator((id) => engine.getRule(id));
    const result = await remediator.apply(input, scan.findings);
    expect(result.remediated).toMatch(/10-27/);
  });
});
