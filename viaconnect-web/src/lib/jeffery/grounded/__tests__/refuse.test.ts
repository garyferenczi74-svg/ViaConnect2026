import { describe, expect, it } from "vitest";
import { FAQ, FAQ_KILL_SWITCH_LINES, VIA_CURA_DRAFT_BANNER } from "../copy";
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
});
