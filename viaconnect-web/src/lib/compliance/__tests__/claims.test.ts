import { describe, it, expect } from "vitest";
import { DISEASE_CLAIM, DSHEA_DISCLAIMER_MISSING, UNSUBSTANTIATED_EFFICACY, FORBIDDEN_PHRASE_SCAN } from "../rules/claims";

describe("MARSHALL.CLAIMS.DISEASE_CLAIM", () => {
  it("flags cures diabetes", async () => {
    const hits = await DISEASE_CLAIM.evaluate("This supplement cures diabetes");
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });
  it("flags treats anxiety disorder", async () => {
    const hits = await DISEASE_CLAIM.evaluate("proven to treat anxiety disorder");
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });
  it("passes structure/function phrasing", async () => {
    const hits = await DISEASE_CLAIM.evaluate("supports healthy glucose metabolism");
    expect(hits.length).toBe(0);
  });
});

describe("MARSHALL.CLAIMS.DSHEA_DISCLAIMER_MISSING", () => {
  it("flags content without disclaimer", async () => {
    const hits = await DSHEA_DISCLAIMER_MISSING.evaluate("Order our peptide protocol today.");
    expect(hits.length).toBe(1);
  });
  it("passes with disclaimer", async () => {
    const hits = await DSHEA_DISCLAIMER_MISSING.evaluate(
      "Order today. These statements have not been evaluated by the FDA. This product is not intended to diagnose treat cure or prevent any disease."
    );
    expect(hits.length).toBe(0);
  });
});

describe("MARSHALL.CLAIMS.UNSUBSTANTIATED_EFFICACY", () => {
  it("flags specific % claim without citation", async () => {
    const hits = await UNSUBSTANTIATED_EFFICACY.evaluate({
      text: "reduces inflammation by 73%",
      citations: [],
    });
    expect(hits.length).toBe(1);
  });
  it("passes when citations exist", async () => {
    const hits = await UNSUBSTANTIATED_EFFICACY.evaluate({
      text: "reduces inflammation by 73%",
      citations: ["doi:10.1234/x"],
    });
    expect(hits.length).toBe(0);
  });
  it("ignores qualitative language", async () => {
    const hits = await UNSUBSTANTIATED_EFFICACY.evaluate({
      text: "supports inflammation balance",
    });
    expect(hits.length).toBe(0);
  });
});

describe("MARSHALL.CLAIMS.FORBIDDEN_PHRASE", () => {
  it("flags FDA approved", async () => {
    const hits = await FORBIDDEN_PHRASE_SCAN.evaluate("Our FDA approved formula");
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });
  it("flags clinically proven", async () => {
    const hits = await FORBIDDEN_PHRASE_SCAN.evaluate("clinically proven results");
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });
  it("passes neutral copy", async () => {
    const hits = await FORBIDDEN_PHRASE_SCAN.evaluate("researched ingredients for daily support");
    expect(hits.length).toBe(0);
  });
});
