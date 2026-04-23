// Prompt #112 — PHI redactor invariants. Bright-line: any match drops.

import { describe, it, expect } from "vitest";
import * as phiRedactorModule from "@/lib/notifications/phi-redactor";
import { MEDICATION_WATCHLIST, GENE_SYMBOL_WATCHLIST } from "@/lib/notifications/phi-redactor";

// Replicate the core-regex list locally to test without DB.
const PHI_REGEXES: Array<{ rule: string; re: RegExp }> = [
  { rule: "unrendered_template_variable", re: /\{[a-zA-Z_][a-zA-Z0-9_]*\}/ },
  { rule: "email_address", re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { rule: "phone_number", re: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/ },
  { rule: "dob_like_date", re: /\b(?:0?[1-9]|1[0-2])[\/\-\.](?:0?[1-9]|[12]\d|3[01])[\/\-\.](?:19|20)\d{2}\b/ },
  { rule: "icd10_code", re: /\b[A-TV-Z]\d{2}(?:\.\d{1,4})?\b/ },
  { rule: "lab_value", re: /\b\d+(?:\.\d+)?\s?(?:mg|mcg|IU|mmol|ng|pg|U\/L|mg\/dL|nmol|pmol)\b/i },
  { rule: "rsid", re: /\brs\d{3,}\b/i },
  { rule: "zygosity", re: /\b(?:homozygous|heterozygous|wildtype|[ACTG]\/[ACTG])\b/i },
];

function matchesAny(body: string): string | null {
  for (const { rule, re } of PHI_REGEXES) if (re.test(body)) return rule;
  return null;
}

describe("PHI regex: unrendered template variables", () => {
  it("catches {ref} when renderer fails to substitute", () => {
    expect(matchesAny("Hello {patient_first_name}")).toBe("unrendered_template_variable");
  });
  it("does not trip on literal text without curly-brace interpolation", () => {
    expect(matchesAny("A patient of yours completed their assessment.")).toBeNull();
  });
});

describe("PHI regex: identifiers", () => {
  it("catches email addresses", () => {
    expect(matchesAny("Contact: jsmith@example.com")).toBe("email_address");
  });
  it("catches US phone numbers", () => {
    expect(matchesAny("Call (415) 555-0132")).toBe("phone_number");
  });
  it("catches DOB-format dates", () => {
    expect(matchesAny("DOB: 06/15/1982")).toBe("dob_like_date");
  });
});

describe("PHI regex: clinical", () => {
  it("catches ICD-10 codes", () => {
    expect(matchesAny("Diagnosis E11.9 noted")).toBe("icd10_code");
  });
  it("catches lab values with units", () => {
    expect(matchesAny("Result: 250 mg/dL")).toBe("lab_value");
  });
  it("catches rsIDs", () => {
    expect(matchesAny("Variant rs1801133 detected")).toBe("rsid");
  });
  it("catches zygosity notation", () => {
    expect(matchesAny("Patient is homozygous")).toBe("zygosity");
  });
  it("catches genotype notation", () => {
    expect(matchesAny("Allele C/T")).toBe("zygosity");
  });
});

describe("PHI: medication watchlist is non-empty and reasonable", () => {
  it("contains at least 50 medications", () => {
    expect(MEDICATION_WATCHLIST.length).toBeGreaterThanOrEqual(50);
  });
  it("contains the prompt's bright-line exclusions", () => {
    const lc = MEDICATION_WATCHLIST.map((m) => m.toLowerCase());
    expect(lc).toContain("semaglutide");
    expect(lc).toContain("retatrutide");
  });
});

describe("PHI: gene symbol watchlist", () => {
  it("contains the methylation-core genes", () => {
    for (const g of ["MTHFR","COMT","CYP2D6","VDR","APOE"]) {
      expect(GENE_SYMBOL_WATCHLIST).toContain(g);
    }
  });
});

describe("PHI rule: the bright-line, NOT a fallback", () => {
  it("never returns a 'redacted body' path: a match means drop", () => {
    // Doc check: the phi-redactor module exports only validateExternalBody + recordPhiRedactionFailure.
    // There MUST be no exportable "buildRedactedFallback" function by design.
    const exportedNames = Object.keys(phiRedactorModule);
    expect(exportedNames).not.toContain("buildRedactedFallback");
    expect(exportedNames).not.toContain("getRedactedVersion");
    expect(exportedNames).toContain("validateExternalBody");
    expect(exportedNames).toContain("recordPhiRedactionFailure");
  });
});
