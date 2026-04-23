import { describe, it, expect } from "vitest";
import {
  NO_SEMAGLUTIDE,
  RETATRUTIDE_INJECTABLE_ONLY,
  NO_RETATRUTIDE_STACKING,
  PEPTIDE_AGE_GATE,
  PEPTIDE_PRACTITIONER_GATE,
} from "../rules/peptide";

describe("MARSHALL.PEPTIDE.NO_SEMAGLUTIDE", () => {
  it("P0 on exact token", async () => {
    const findings = await NO_SEMAGLUTIDE.evaluate("Consider semaglutide for GLP-1 support.");
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe("P0");
  });
  it("P0 on mixed case", async () => {
    const findings = await NO_SEMAGLUTIDE.evaluate("SemaGlutide is mentioned here");
    expect(findings.length).toBe(1);
  });
  it("no hit on unrelated GLP-1 text", async () => {
    const findings = await NO_SEMAGLUTIDE.evaluate("GLP-1 agonists as a class are interesting.");
    expect(findings.length).toBe(0);
  });
  it("no hit on word-boundary near-miss", async () => {
    const findings = await NO_SEMAGLUTIDE.evaluate("semagglutinin protein in research");
    expect(findings.length).toBe(0);
  });
});

describe("MARSHALL.PEPTIDE.RETATRUTIDE_INJECTABLE_ONLY", () => {
  it("blocks RET-LIP-30ML", async () => {
    const findings = await RETATRUTIDE_INJECTABLE_ONLY.evaluate({ id: "RET-LIP-30ML", name: "Retatrutide Liposomal" });
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe("P0");
  });
  it("allows RET-INJ-30ML", async () => {
    const findings = await RETATRUTIDE_INJECTABLE_ONLY.evaluate({ id: "RET-INJ-30ML", name: "Retatrutide Injection" });
    expect(findings.length).toBe(0);
  });
  it("ignores non-retatrutide SKUs", async () => {
    const findings = await RETATRUTIDE_INJECTABLE_ONLY.evaluate({ id: "BPC-INJ-10ML", name: "BPC-157 Injection" });
    expect(findings.length).toBe(0);
  });
});

describe("MARSHALL.PEPTIDE.NO_RETATRUTIDE_STACKING", () => {
  it("blocks Retatrutide with other peptide", async () => {
    const findings = await NO_RETATRUTIDE_STACKING.evaluate([
      { sku: "RET-INJ-30ML", category: "peptide" },
      { sku: "BPC-INJ-10ML", category: "peptide" },
    ]);
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe("P0");
  });
  it("allows Retatrutide alone", async () => {
    const findings = await NO_RETATRUTIDE_STACKING.evaluate([{ sku: "RET-INJ-30ML", category: "peptide" }]);
    expect(findings.length).toBe(0);
  });
  it("allows multiple non-retatrutide peptides", async () => {
    const findings = await NO_RETATRUTIDE_STACKING.evaluate([
      { sku: "BPC-INJ-10ML", category: "peptide" },
      { sku: "TB-INJ-10ML", category: "peptide" },
    ]);
    expect(findings.length).toBe(0);
  });
});

describe("MARSHALL.PEPTIDE.PEPTIDE_AGE_GATE", () => {
  it("blocks peptide for user age 17", async () => {
    const findings = await PEPTIDE_AGE_GATE.evaluate({
      cart: [{ sku: "BPC-INJ-10ML", category: "peptide" }],
      userAge: 17,
    });
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe("P0");
  });
  it("allows 18+ for normal peptide", async () => {
    const findings = await PEPTIDE_AGE_GATE.evaluate({
      cart: [{ sku: "BPC-INJ-10ML", category: "peptide" }],
      userAge: 18,
    });
    expect(findings.length).toBe(0);
  });
  it("blocks cognitive stim at 20 (needs 21)", async () => {
    const findings = await PEPTIDE_AGE_GATE.evaluate({
      cart: [{ sku: "SEM-INJ-10ML", category: "peptide", name: "Semax" }],
      userAge: 20,
    });
    expect(findings.length).toBe(1);
  });
});

describe("MARSHALL.PEPTIDE.PEPTIDE_PRACTITIONER_GATE", () => {
  it("blocks retatrutide without practitioner link", async () => {
    const findings = await PEPTIDE_PRACTITIONER_GATE.evaluate({
      cart: [{ sku: "RET-INJ-30ML", category: "peptide", name: "retatrutide" }],
      hasActivePractitionerLink: false,
    });
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe("P1");
  });
  it("allows with active link", async () => {
    const findings = await PEPTIDE_PRACTITIONER_GATE.evaluate({
      cart: [{ sku: "RET-INJ-30ML", category: "peptide", name: "retatrutide" }],
      hasActivePractitionerLink: true,
    });
    expect(findings.length).toBe(0);
  });
  it("ignores non-gated peptides", async () => {
    const findings = await PEPTIDE_PRACTITIONER_GATE.evaluate({
      cart: [{ sku: "GLY-ORL-60CAP", category: "peptide", name: "Glycine" }],
      hasActivePractitionerLink: false,
    });
    expect(findings.length).toBe(0);
  });
});
