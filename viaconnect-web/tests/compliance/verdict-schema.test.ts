// Prompt #113 — Kelsey verdict schema validation tests.

import { describe, it, expect } from "vitest";
import { validateKelseyResponse, extractJson } from "@/lib/compliance/kelsey/verdict-schema";

describe("validateKelseyResponse", () => {
  it("accepts a well-formed APPROVED verdict", () => {
    const r = validateKelseyResponse({
      verdict: "APPROVED",
      rationale: "This is a structure/function claim aligned with DSHEA guidance.",
      rule_references: ["21 CFR 101.93(g)"],
      confidence: 0.9,
      citations: [{ title: "Monograph X", loe: "A" }],
    });
    expect(r).not.toBeNull();
    expect(r!.verdict).toBe("APPROVED");
    expect(r!.citations[0].loe).toBe("A");
  });
  it("rejects an unknown verdict", () => {
    const r = validateKelseyResponse({ verdict: "MAYBE", rationale: "x".repeat(20) });
    expect(r).toBeNull();
  });
  it("normalizes case of verdict", () => {
    const r = validateKelseyResponse({ verdict: "blocked", rationale: "This is a disease claim." });
    expect(r?.verdict).toBe("BLOCKED");
  });
  it("rejects short rationales", () => {
    const r = validateKelseyResponse({ verdict: "BLOCKED", rationale: "no" });
    expect(r).toBeNull();
  });
  it("clamps invalid confidence to default 0.5", () => {
    const r = validateKelseyResponse({ verdict: "APPROVED", rationale: "x".repeat(20), confidence: 99 });
    expect(r?.confidence).toBe(0.5);
  });
  it("ignores invalid LoE grades", () => {
    const r = validateKelseyResponse({
      verdict: "APPROVED", rationale: "x".repeat(20),
      citations: [{ title: "X", loe: "Z" }],
    });
    expect(r?.citations[0].loe).toBeUndefined();
  });
});

describe("extractJson", () => {
  it("extracts JSON from pre/post text", () => {
    const raw = "Here is my verdict:\n{\"verdict\":\"APPROVED\"}\nThanks.";
    const j = extractJson(raw);
    expect(j).toBe("{\"verdict\":\"APPROVED\"}");
  });
  it("returns null when no JSON object present", () => {
    expect(extractJson("no json here")).toBeNull();
  });
});
