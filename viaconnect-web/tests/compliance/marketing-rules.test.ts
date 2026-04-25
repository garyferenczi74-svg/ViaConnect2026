import { describe, it, expect } from "vitest";
import {
  NAMED_PERSON_CONNECTION,
  TIME_CLAIM_SUBSTANTIATION,
  SCIENTIFIC_GROUNDING,
  OUTCOME_GUARANTEE,
  COMPLIANCE_NAMING,
  ENDORSER_CONSENT_REQUIRED,
  REGULATORY_FRAMEWORK_NAMING,
  COMPOSITE_DISCLOSURE,
  INTERVENTION_SPECIFICITY,
  marketingRules,
  type MarketingCopyInput,
} from "@/lib/compliance/rules/marketing";

describe("MARSHALL.MARKETING.NAMED_PERSON_CONNECTION", () => {
  it("flags 'Dr. Fadi Dagher' without consent on file", async () => {
    const findings = await NAMED_PERSON_CONNECTION.evaluate("Reviewed by Dr. Fadi Dagher.");
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe("P1");
  });
  it("clears 'Dr. Fadi Dagher' when consent on file", async () => {
    const input: MarketingCopyInput = {
      text: "Reviewed by Dr. Fadi Dagher.",
      clinicianConsentOnFile: true,
    };
    const findings = await NAMED_PERSON_CONNECTION.evaluate(input);
    expect(findings.length).toBe(0);
  });
  it("does not flag generic 'a doctor'", async () => {
    const findings = await NAMED_PERSON_CONNECTION.evaluate("Reviewed by a doctor.");
    expect(findings.length).toBe(0);
  });
});

describe("MARSHALL.MARKETING.TIME_CLAIM_SUBSTANTIATION", () => {
  it("flags 'in 12 minutes'", async () => {
    const findings = await TIME_CLAIM_SUBSTANTIATION.evaluate("Your assessment in 12 minutes.");
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe("P1");
  });
  it("flags 'about 12 minutes'", async () => {
    const findings = await TIME_CLAIM_SUBSTANTIATION.evaluate("Takes about 12 minutes.");
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
  it("clears when substantiation file on record", async () => {
    const input: MarketingCopyInput = {
      text: "Your assessment in 12 minutes.",
      timeSubstantiationOnFile: true,
    };
    const findings = await TIME_CLAIM_SUBSTANTIATION.evaluate(input);
    expect(findings.length).toBe(0);
  });
  it("does not flag prose without numeric minutes", async () => {
    const findings = await TIME_CLAIM_SUBSTANTIATION.evaluate("Quick to complete.");
    expect(findings.length).toBe(0);
  });
});

describe("MARSHALL.MARKETING.SCIENTIFIC_GROUNDING", () => {
  it("flags 'grounded in published research'", async () => {
    const findings = await SCIENTIFIC_GROUNDING.evaluate("Every recommendation is grounded in published research.");
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe("P2");
  });
  it("flags 'backed by studies'", async () => {
    const findings = await SCIENTIFIC_GROUNDING.evaluate("Backed by studies and decades of literature.");
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
  it("clears when scientific substantiation on file", async () => {
    const input: MarketingCopyInput = {
      text: "Grounded in published research.",
      scientificSubstantiationOnFile: true,
    };
    const findings = await SCIENTIFIC_GROUNDING.evaluate(input);
    expect(findings.length).toBe(0);
  });
});

describe("MARSHALL.MARKETING.OUTCOME_GUARANTEE", () => {
  it("flags 'guarantee'", async () => {
    const findings = await OUTCOME_GUARANTEE.evaluate("We guarantee results.");
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].severity).toBe("P0");
  });
  it("flags 'you will sleep'", async () => {
    const findings = await OUTCOME_GUARANTEE.evaluate("You will sleep deeper within 30 days.");
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
  it("flags 'miracle'", async () => {
    const findings = await OUTCOME_GUARANTEE.evaluate("This is a miracle protocol.");
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
  it("flags 'breakthrough'", async () => {
    const findings = await OUTCOME_GUARANTEE.evaluate("A breakthrough in wellness.");
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
  it("clears 'designed to support'", async () => {
    const findings = await OUTCOME_GUARANTEE.evaluate("Designed to support better sleep.");
    expect(findings.length).toBe(0);
  });
});

describe("MARSHALL.MARKETING.COMPLIANCE_NAMING", () => {
  it("flags Marshall name without architectural anchor", async () => {
    const findings = await COMPLIANCE_NAMING.evaluate("We use the Marshall compliance system.");
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe("P2");
  });
  it("clears when architectural commitment is referenced", async () => {
    const findings = await COMPLIANCE_NAMING.evaluate(
      "The Marshall compliance system reflects our architectural commitment to FTC and DSHEA discipline.",
    );
    expect(findings.length).toBe(0);
  });
  it("does not flag absent compliance-system reference", async () => {
    const findings = await COMPLIANCE_NAMING.evaluate("We honor FTC standards.");
    expect(findings.length).toBe(0);
  });
});

describe("MARSHALL.MARKETING.ENDORSER_CONSENT_REQUIRED", () => {
  it("flags testimonial without consent metadata", async () => {
    const input: MarketingCopyInput = {
      text: "This protocol changed my life.",
      contentKind: "testimonial",
    };
    const findings = await ENDORSER_CONSENT_REQUIRED.evaluate(input);
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe("P0");
  });
  it("flags consent on file but missing material-connection disclosure", async () => {
    const input: MarketingCopyInput = {
      text: "Best protocol ever.",
      contentKind: "testimonial",
      endorserConsentMeta: { consentKeyResolved: true, materialConnectionDisclosed: false },
    };
    const findings = await ENDORSER_CONSENT_REQUIRED.evaluate(input);
    expect(findings.length).toBe(1);
  });
  it("clears when consent + material connection disclosed", async () => {
    const input: MarketingCopyInput = {
      text: "Best protocol ever.",
      contentKind: "testimonial",
      endorserConsentMeta: { consentKeyResolved: true, materialConnectionDisclosed: true },
    };
    const findings = await ENDORSER_CONSENT_REQUIRED.evaluate(input);
    expect(findings.length).toBe(0);
  });
  it("skips when content is not a testimonial", async () => {
    const input: MarketingCopyInput = {
      text: "Hero variant copy.",
      contentKind: "hero_variant",
    };
    const findings = await ENDORSER_CONSENT_REQUIRED.evaluate(input);
    expect(findings.length).toBe(0);
  });
});

describe("MARSHALL.MARKETING.REGULATORY_FRAMEWORK_NAMING", () => {
  it("flags 'FDA approved'", async () => {
    const findings = await REGULATORY_FRAMEWORK_NAMING.evaluate("FDA approved supplement.");
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].severity).toBe("P1");
  });
  it("flags 'clinically proven'", async () => {
    const findings = await REGULATORY_FRAMEWORK_NAMING.evaluate("Our formula is clinically proven.");
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
  it("flags 'doctor-recommended'", async () => {
    const findings = await REGULATORY_FRAMEWORK_NAMING.evaluate("Doctor-recommended formula.");
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
  it("clears 'medically directed'", async () => {
    const findings = await REGULATORY_FRAMEWORK_NAMING.evaluate("Medically directed by Dr. Fadi.");
    expect(findings.length).toBe(0);
  });
});

describe("MARSHALL.MARKETING.COMPOSITE_DISCLOSURE", () => {
  it("flags missing metadata", async () => {
    const input: MarketingCopyInput = { text: "Sarah is a composite.", contentKind: "case_study" };
    const findings = await COMPOSITE_DISCLOSURE.evaluate(input);
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe("P0");
  });
  it("flags missing opening disclosure", async () => {
    const input: MarketingCopyInput = {
      text: "Sarah is a composite.",
      contentKind: "case_study",
      compositeDisclosureMeta: { hasOpeningDisclosure: false, hasClosingDisclosure: true, rendersAsFootnote: false },
    };
    const findings = await COMPOSITE_DISCLOSURE.evaluate(input);
    expect(findings.length).toBe(1);
  });
  it("flags missing closing disclosure", async () => {
    const input: MarketingCopyInput = {
      text: "Sarah is a composite.",
      contentKind: "case_study",
      compositeDisclosureMeta: { hasOpeningDisclosure: true, hasClosingDisclosure: false, rendersAsFootnote: false },
    };
    const findings = await COMPOSITE_DISCLOSURE.evaluate(input);
    expect(findings.length).toBe(1);
  });
  it("flags footnote rendering", async () => {
    const input: MarketingCopyInput = {
      text: "Sarah is a composite.",
      contentKind: "case_study",
      compositeDisclosureMeta: { hasOpeningDisclosure: true, hasClosingDisclosure: true, rendersAsFootnote: true },
    };
    const findings = await COMPOSITE_DISCLOSURE.evaluate(input);
    expect(findings.length).toBe(1);
  });
  it("clears with full in-element opening + closing disclosure", async () => {
    const input: MarketingCopyInput = {
      text: "Sarah is a composite.",
      contentKind: "case_study",
      compositeDisclosureMeta: { hasOpeningDisclosure: true, hasClosingDisclosure: true, rendersAsFootnote: false },
    };
    const findings = await COMPOSITE_DISCLOSURE.evaluate(input);
    expect(findings.length).toBe(0);
  });
  it("skips when content is not a case study", async () => {
    const input: MarketingCopyInput = { text: "Trust band copy.", contentKind: "trust_band" };
    const findings = await COMPOSITE_DISCLOSURE.evaluate(input);
    expect(findings.length).toBe(0);
  });
});

describe("MARSHALL.MARKETING.INTERVENTION_SPECIFICITY", () => {
  const ks: MarketingCopyInput["contentKind"] = "case_study";

  it("flags BPC-157 in case study", async () => {
    const findings = await INTERVENTION_SPECIFICITY.evaluate({ text: "Sarah's protocol included BPC-157.", contentKind: ks });
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].severity).toBe("P0");
  });
  it("flags Retatrutide in case study", async () => {
    const findings = await INTERVENTION_SPECIFICITY.evaluate({ text: "Stacked with Retatrutide.", contentKind: ks });
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
  it("flags GHK-Cu in case study", async () => {
    const findings = await INTERVENTION_SPECIFICITY.evaluate({ text: "Topical GHK-Cu applied nightly.", contentKind: ks });
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
  it("flags numeric dose '800mcg' in case study", async () => {
    const findings = await INTERVENTION_SPECIFICITY.evaluate({ text: "She took 800mcg of methylfolate.", contentKind: ks });
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
  it("flags 'twice daily' frequency", async () => {
    const findings = await INTERVENTION_SPECIFICITY.evaluate({ text: "Once daily for 30 days.", contentKind: ks });
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
  it("flags 'sublingual' route", async () => {
    const findings = await INTERVENTION_SPECIFICITY.evaluate({ text: "Take it sublingual under the tongue.", contentKind: ks });
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
  it("flags SKU code 'BPC-INJ-005'", async () => {
    const findings = await INTERVENTION_SPECIFICITY.evaluate({ text: "Order BPC-INJ-005 from the catalog.", contentKind: ks });
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
  it("clears category-level language", async () => {
    const findings = await INTERVENTION_SPECIFICITY.evaluate({
      text: "Methylation-pathway support and sleep architecture optimization were identified.",
      contentKind: ks,
    });
    expect(findings.length).toBe(0);
  });
  it("skips non-case-study content (hero variant)", async () => {
    const findings = await INTERVENTION_SPECIFICITY.evaluate({ text: "BPC-157 is in our catalog.", contentKind: "hero_variant" });
    expect(findings.length).toBe(0);
  });
});

describe("marketingRules aggregate", () => {
  it("exports exactly 9 rules", () => {
    expect(marketingRules.length).toBe(9);
  });
  it("every rule pillar is MARKETING", () => {
    for (const r of marketingRules) {
      expect(r.pillar).toBe("MARKETING");
    }
  });
  it("every rule includes 'marketing_copy' in surfaces", () => {
    for (const r of marketingRules) {
      expect(r.surfaces).toContain("marketing_copy");
    }
  });
  it("every rule has a lastReviewed date", () => {
    for (const r of marketingRules) {
      expect(r.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
