import { describe, expect, it } from "vitest";
import { FAQ, FAQ_KILL_SWITCH_LINES, VIA_CURA_DRAFT_BANNER } from "../copy";
import {
  assembleFourPartAnswer,
  assembleInteractionsListingText,
  assembleProtocolListingText,
  assembleSafetyRefuseText,
  assembleSnpListingText,
  assembleToolRefuseText,
  assertNoPrescribedWording,
  detectSafetyRefuse,
  explanationForToolFailure,
  INTERACTIONS_LISTING_EXPLANATION,
  joinAssembledListingBlocks,
  SNP_LISTING_EXPLANATION,
  killSwitchFaqExplanation,
} from "../refuse";
import type { CheckInteractionsData, LookupSnpData } from "../types";

describe("refuse helpers", () => {
  it("uses Lex FAQ strings and includes 988 US Suicide and Crisis Lifeline on SI", () => {
    expect(detectSafetyRefuse("I want to end my life")).toBe("emergency");
    const text = assembleSafetyRefuseText({ role: "consumer", kind: "emergency" });
    expect(text).toContain("988");
    expect(text).toContain("US Suicide and Crisis Lifeline");
    expect(text).toContain("educational purposes only");
    expect(text).toMatch(/1\. Short explanation/);
    expect(text).toMatch(/2\. What ViaConnect already listed/);
    expect(text).toMatch(/3\. Sources/);
    expect(text).toMatch(/4\. Next action \/ ask clinician/);
    expect(assertNoPrescribedWording(text)).toBe(true);
    expect(text.toLowerCase()).not.toContain("prescribed");
  });

  it("refuses Semaglutide / excluded GLP-1 adjacency, not broad educational GLP-1", () => {
    expect(detectSafetyRefuse("Should I take semaglutide?")).toBe("semaglutide");
    expect(detectSafetyRefuse("Is Wegovy in scope?")).toBe("semaglutide");
    expect(detectSafetyRefuse("excluded GLP-1 recommendations")).toBe("semaglutide");
    expect(detectSafetyRefuse("What is a GLP-1 and how does the pathway work?")).toBeNull();
    const text = assembleSafetyRefuseText({ role: "consumer", kind: "semaglutide" });
    expect(text).toContain(FAQ.semaglutide);
    expect(text).not.toMatch(/retatrutide.*stack/i);
    expect(text).not.toContain(VIA_CURA_DRAFT_BANNER);
  });

  it("joins the five Lex-cleared kill-switch FAQ lines for display", () => {
    expect(FAQ.killSwitchLines).toEqual(FAQ_KILL_SWITCH_LINES);
    expect(FAQ.killSwitchLines).toHaveLength(5);
    expect(FAQ.killSwitch).toBe(FAQ_KILL_SWITCH_LINES.join("\n"));
    expect(killSwitchFaqExplanation()).toBe(FAQ.killSwitch);
    expect(FAQ.killSwitch).toContain("temporarily unavailable");
    expect(FAQ.killSwitch).toContain("Do not change products or amounts");
    expect(FAQ.killSwitch).toContain("ViaConnect clinician or licensed healthcare provider");
    expect(FAQ.killSwitch).toContain("988 (US Suicide and Crisis Lifeline)");
    expect(FAQ.killSwitch).toContain("not a diagnosis or prescription");
  });

  it("builds a 4-part tool-fail refuse without prescribed wording", () => {
    const text = assembleToolRefuseText({
      role: "consumer",
      failedTools: ["lookup_peptide", "check_interactions"],
      error: {
        ok: false,
        code: "not_implemented",
        message: "stub",
        retryable: false,
      },
      requestId: "req-1",
    });
    expect(text).toContain(FAQ.toolFailed);
    expect(text).toContain("already on your protocol");
    expect(text).toContain("lookup_peptide");
    expect(text.toLowerCase()).not.toContain("prescribed");
    expect(explanationForToolFailure()).toBe(FAQ.toolFailed);
    expect(killSwitchFaqExplanation()).toBe(FAQ.killSwitch);
  });

  it("lists stored protocol items with already-on-your-protocol language", () => {
    const text = assembleProtocolListingText({
      role: "practitioner",
      protocolName: "AI-Generated Protocol",
      sourceRoute: "advisor.context / stored user_protocols",
      items: [
        {
          productName: "MTHFR+",
          dosage: "1 capsule",
          reason: "on file",
          bucket: "morning",
        },
      ],
    });
    expect(VIA_CURA_DRAFT_BANNER).toBe("DRAFT ONLY — human send required");
    expect(text.startsWith(VIA_CURA_DRAFT_BANNER)).toBe(true);
    expect(text).toContain("MTHFR+");
    expect(text.toLowerCase()).toContain("already on your protocol");
    expect(text).toContain("engine listing: 1 capsule");
    expect(text.toLowerCase()).not.toContain("prescribed");
  });

  it("rewrites accidental prescribed wording in the assembler", () => {
    const text = assembleFourPartAnswer({
      explanation: "This was prescribed yesterday.",
      alreadyListed: "Nothing on file for this yet.",
      sources: ["test"],
      nextAction: "Ask your clinician.",
    });
    expect(text.toLowerCase()).not.toContain("prescribed");
    expect(text).toContain("already listed");
    expect(text).not.toContain(VIA_CURA_DRAFT_BANNER);
  });

  it("restates check_interactions engine fields and omits empty optionals", () => {
    const data: CheckInteractionsData = {
      interactions: [
        {
          medication: "Warfarin",
          interactsWith: "NAD+",
          severity: "moderate",
          mechanism: "engine mechanism",
          clinicalEffect: "",
          mitigation: "   ",
        },
      ],
      summary: { major: 0, moderate: 1, minor: 0, synergistic: 0 },
      blockedProducts: ["St. John's Wort", "", "  "],
    };
    const text = assembleInteractionsListingText({
      role: "practitioner",
      data,
      sourceRoute: "POST /api/ai/check-interactions",
    });
    expect(INTERACTIONS_LISTING_EXPLANATION).toBe(
      "Here is what the ViaConnect interaction check listed."
    );
    expect(text.startsWith(VIA_CURA_DRAFT_BANNER)).toBe(true);
    expect(text).toContain(INTERACTIONS_LISTING_EXPLANATION);
    expect(text).toContain("medication: Warfarin");
    expect(text).toContain("interactsWith: NAD+");
    expect(text).toContain("severity: moderate");
    expect(text).toContain("mechanism: engine mechanism");
    expect(text).not.toMatch(/clinicalEffect:/);
    expect(text).not.toMatch(/mitigation:/);
    expect(text).toContain("summary: major 0, moderate 1, minor 0, synergistic 0");
    expect(text).toContain("blockedProducts:");
    expect(text).toContain("St. John's Wort");
    expect(text).toContain("POST /api/ai/check-interactions");
    expect(text).toContain("Open your protocol screen or ask your clinician");
    expect(text.toLowerCase()).not.toMatch(
      /safe to take|cleared|approved to combine|no interactions means safe|prescribe|prescribed|diagnos|treat|cure/
    );
    expect(assertNoPrescribedWording(text)).toBe(true);
  });

  it("joins protocol then interactions with the ViaCura banner once", () => {
    const protocol = assembleProtocolListingText({
      role: "naturopath",
      protocolName: "ViaConnect protocol on file",
      sourceRoute: "advisor.context / stored user_protocols",
      includeDisclaimer: false,
      items: [
        {
          productName: "MTHFR+",
          dosage: "1 capsule",
          reason: "on file",
          bucket: "morning",
        },
      ],
    });
    const interactions = assembleInteractionsListingText({
      role: "naturopath",
      sourceRoute: "POST /api/ai/check-interactions",
      data: {
        interactions: [],
        summary: { major: 0, moderate: 0, minor: 0, synergistic: 0 },
        blockedProducts: [],
      },
    });
    const joined = joinAssembledListingBlocks([protocol, interactions]);
    expect(joined.indexOf("I can only restate what ViaConnect already listed")).toBeLessThan(
      joined.indexOf(INTERACTIONS_LISTING_EXPLANATION)
    );
    expect(joined.split(VIA_CURA_DRAFT_BANNER).length - 1).toBe(1);
    expect(joined.startsWith(VIA_CURA_DRAFT_BANNER)).toBe(true);
  });

  it("prepends ViaCura draft banner on clinician refuse / static assemble", () => {
    const refuse = assembleToolRefuseText({
      role: "naturopath",
      failedTools: ["lookup_peptide"],
      requestId: "req-clin",
    });
    expect(refuse.startsWith(VIA_CURA_DRAFT_BANNER)).toBe(true);
    const safety = assembleSafetyRefuseText({ role: "practitioner", kind: "new_dose" });
    expect(safety.startsWith(VIA_CURA_DRAFT_BANNER)).toBe(true);
  });

  it("restates lookup_snp field labels and keeps UNKNOWN / null verbatim", () => {
    const data: LookupSnpData = {
      rsid: "rs1799853",
      gene: "CYP2C9",
      genotype: "UNKNOWN",
      panel_key: "genex_m",
      status: "pending",
      educational_summary: "",
      citations: [],
      loadStatus: "ok",
    };
    const text = assembleSnpListingText({
      role: "consumer",
      data,
      sourceRoute: "GET /api/genetics/variants",
    });
    expect(SNP_LISTING_EXPLANATION).toBe(
      "Here is what ViaConnect has on file for that genetic result."
    );
    expect(text).toContain(SNP_LISTING_EXPLANATION);
    expect(text).toContain("rsid: rs1799853");
    expect(text).toContain("gene: CYP2C9");
    expect(text).toContain("genotype: UNKNOWN");
    expect(text).toContain("status: pending");
    expect(text).not.toMatch(/educational_summary:/);
    expect(text.toLowerCase()).not.toMatch(
      /diagnos|safe to take|prescribe|prescribed|normal|negative|clear/
    );
    expect(assertNoPrescribedWording(text)).toBe(true);

    const nullText = assembleSnpListingText({
      role: "consumer",
      sourceRoute: "GET /api/genetics/variants",
      data: { ...data, genotype: null, gene: "APOE", rsid: "rs429358" },
    });
    expect(nullText).toContain("genotype: null");
    expect(nullText).toContain("gene: APOE");
  });

  it("uses FAQ.genotypeMissing when lookup_snp is not on file", () => {
    const text = assembleToolRefuseText({
      role: "consumer",
      failedTools: ["lookup_snp"],
      error: {
        ok: false,
        code: "not_found",
        message: "lookup_snp not_found",
        retryable: false,
      },
      requestId: "req-snp-miss",
    });
    expect(text).toContain(FAQ.genotypeMissing);
    expect(explanationForToolFailure({ ok: false, code: "not_found", message: "x", retryable: false }, [
      "lookup_snp",
    ])).toBe(FAQ.genotypeMissing);
  });

  it("joins protocol then interactions then snp with the ViaCura banner once", () => {
    const protocol = assembleProtocolListingText({
      role: "naturopath",
      protocolName: "ViaConnect protocol on file",
      sourceRoute: "advisor.context / stored user_protocols",
      includeDisclaimer: false,
      items: [
        {
          productName: "MTHFR+",
          dosage: "1 capsule",
          reason: "on file",
          bucket: "morning",
        },
      ],
    });
    const interactions = assembleInteractionsListingText({
      role: "naturopath",
      sourceRoute: "POST /api/ai/check-interactions",
      includeDisclaimer: false,
      data: {
        interactions: [],
        summary: { major: 0, moderate: 0, minor: 0, synergistic: 0 },
        blockedProducts: [],
      },
    });
    const snp = assembleSnpListingText({
      role: "naturopath",
      sourceRoute: "GET /api/genetics/variants",
      data: {
        rsid: "rs1801133",
        gene: "MTHFR",
        genotype: "CT",
        panel_key: "genex_m",
        educational_summary: "",
        citations: [],
      },
    });
    const joined = joinAssembledListingBlocks([protocol, interactions, snp]);
    expect(joined.indexOf("I can only restate what ViaConnect already listed")).toBeLessThan(
      joined.indexOf(INTERACTIONS_LISTING_EXPLANATION)
    );
    expect(joined.indexOf(INTERACTIONS_LISTING_EXPLANATION)).toBeLessThan(
      joined.indexOf(SNP_LISTING_EXPLANATION)
    );
    expect(joined.split(VIA_CURA_DRAFT_BANNER).length - 1).toBe(1);
  });
});
