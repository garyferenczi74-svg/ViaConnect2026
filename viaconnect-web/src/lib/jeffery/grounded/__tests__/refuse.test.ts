import { describe, expect, it } from "vitest";
import { FAQ, VIA_CURA_DRAFT_BANNER } from "../copy";
import {
  assembleFourPartAnswer,
  assembleProtocolListingText,
  assembleSafetyRefuseText,
  assembleToolRefuseText,
  assertNoPrescribedWording,
  detectSafetyRefuse,
  explanationForToolFailure,
  killSwitchFaqExplanation,
} from "../refuse";

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

  it("refuses Semaglutide / GLP-1 recommendation asks", () => {
    expect(detectSafetyRefuse("Should I take semaglutide?")).toBe("semaglutide");
    const text = assembleSafetyRefuseText({ role: "consumer", kind: "semaglutide" });
    expect(text).toContain(FAQ.semaglutide);
    expect(text).not.toMatch(/retatrutide.*stack/i);
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
    expect(VIA_CURA_DRAFT_BANNER).toBe("DRAFT — human send required");
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
  });
});
