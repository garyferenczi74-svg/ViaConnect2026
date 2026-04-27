import { describe, it, expect } from "vitest";
import {
  DISCLOSURE_MISSING_FTC,
  DISEASE_CLAIM_EXTERNAL,
  BRAND_MISUSE_EXTERNAL,
  MAP_VIOLATION_EXTERNAL,
  UNAUTHORIZED_RESELLER,
  COUNTERFEIT_SUSPECTED,
  TESTIMONIAL_UNSUBSTANTIATED_EXT,
  PEPTIDE_AGE_TARGET_EXT,
  RETATRUTIDE_STACKING_EXT,
  PRACTITIONER_SCOPE_OVERREACH,
  COORDINATED_BEHAVIOR,
  DMCA_TRADEMARK_MISUSE,
  type SocialSignalLike,
} from "../rules/social";

function mkSignal(overrides: Partial<SocialSignalLike> = {}): SocialSignalLike {
  return {
    url: "https://example.com/post/1",
    content: { textDerived: "sample text", fingerprint: "abc" },
    author: {
      handle: "@test",
      externalId: "ext-1",
      matchedPractitionerId: "pract-1",
      practitionerMatchConfidence: 0.9,
    },
    productMatches: [{ sku: "FARM-METH-30", confidence: 0.9, method: "lexical" }],
    ...overrides,
  };
}

describe("MARSHALL.SOCIAL.DISCLOSURE_MISSING_FTC", () => {
  it("fires on attributable practitioner promoting product without #ad", async () => {
    const s = mkSignal({ content: { textDerived: "Love my FarmCeutica methylation stack, you should try it!" } });
    const hits = await DISCLOSURE_MISSING_FTC.evaluate(s);
    expect(hits.length).toBe(1);
    expect(hits[0].severity).toBe("P2");
  });
  it("does not fire when #ad present", async () => {
    const s = mkSignal({ content: { textDerived: "Love this stack #ad" } });
    expect((await DISCLOSURE_MISSING_FTC.evaluate(s)).length).toBe(0);
  });
  it("does not fire for unmatched author", async () => {
    const s = mkSignal({ author: { handle: "@rand", matchedPractitionerId: null, practitionerMatchConfidence: null } });
    expect((await DISCLOSURE_MISSING_FTC.evaluate(s)).length).toBe(0);
  });
  it("does not fire without product match", async () => {
    const s = mkSignal({ productMatches: [] });
    expect((await DISCLOSURE_MISSING_FTC.evaluate(s)).length).toBe(0);
  });
  it("does not fire on low-confidence attribution", async () => {
    const s = mkSignal({ author: { ...mkSignal().author, practitionerMatchConfidence: 0.5 } });
    expect((await DISCLOSURE_MISSING_FTC.evaluate(s)).length).toBe(0);
  });
});

describe("MARSHALL.SOCIAL.DISEASE_CLAIM_EXTERNAL", () => {
  it("fires on 'cures diabetes' by matched practitioner", async () => {
    const s = mkSignal({ content: { textDerived: "FarmCeutica cures diabetes in my patients" } });
    const hits = await DISEASE_CLAIM_EXTERNAL.evaluate(s);
    expect(hits.length).toBe(1);
    expect(hits[0].severity).toBe("P0");
  });
  it("passes structure/function wording", async () => {
    const s = mkSignal({ content: { textDerived: "Supports healthy glucose metabolism" } });
    expect((await DISEASE_CLAIM_EXTERNAL.evaluate(s)).length).toBe(0);
  });
  it("does not fire on unmatched author", async () => {
    const s = mkSignal({ author: { handle: "@r", matchedPractitionerId: null, practitionerMatchConfidence: null }, content: { textDerived: "cures diabetes" } });
    expect((await DISEASE_CLAIM_EXTERNAL.evaluate(s)).length).toBe(0);
  });
});

describe("MARSHALL.SOCIAL.BRAND_MISUSE_EXTERNAL", () => {
  it("flags 'Vitality Score'", async () => {
    const s = mkSignal({ content: { textDerived: "Track your Vitality Score with us" } });
    expect((await BRAND_MISUSE_EXTERNAL.evaluate(s)).length).toBeGreaterThanOrEqual(1);
  });
  it("flags '5-27x bioavailable'", async () => {
    const s = mkSignal({ content: { textDerived: "Up to 5-27x bioavailable formulation" } });
    expect((await BRAND_MISUSE_EXTERNAL.evaluate(s)).length).toBeGreaterThanOrEqual(1);
  });
  it("passes canonical 10-28x", async () => {
    const s = mkSignal({ content: { textDerived: "10-28x bioavailability confirmed" } });
    expect((await BRAND_MISUSE_EXTERNAL.evaluate(s)).length).toBe(0);
  });
});

describe("MARSHALL.SOCIAL.MAP_VIOLATION_EXTERNAL", () => {
  it("fires on listing below MAP floor with matched product", async () => {
    const s = mkSignal({
      pricing: { extracted: 39.99, currency: "USD", mapFloor: 59.99, underMapBy: 33 },
    });
    expect((await MAP_VIOLATION_EXTERNAL.evaluate(s))[0].severity).toBe("P1");
  });
  it("passes at or above MAP floor", async () => {
    const s = mkSignal({
      pricing: { extracted: 59.99, currency: "USD", mapFloor: 59.99 },
    });
    expect((await MAP_VIOLATION_EXTERNAL.evaluate(s)).length).toBe(0);
  });
});

describe("MARSHALL.SOCIAL.UNAUTHORIZED_RESELLER", () => {
  it("fires on amazon listing by non-practitioner with product match", async () => {
    const s = mkSignal({
      collectorId: "amazon",
      author: { handle: "amz-seller", matchedPractitionerId: null, practitionerMatchConfidence: null },
    });
    expect((await UNAUTHORIZED_RESELLER.evaluate(s))[0].severity).toBe("P1");
  });
  it("does not fire for matched practitioner (different lane)", async () => {
    const s = mkSignal({ collectorId: "amazon" });
    expect((await UNAUTHORIZED_RESELLER.evaluate(s)).length).toBe(0);
  });
  it("does not fire on non-marketplace collectors", async () => {
    const s = mkSignal({
      collectorId: "instagram",
      author: { handle: "x", matchedPractitionerId: null, practitionerMatchConfidence: null },
    });
    expect((await UNAUTHORIZED_RESELLER.evaluate(s)).length).toBe(0);
  });
});

describe("MARSHALL.SOCIAL.COUNTERFEIT_SUSPECTED", () => {
  it("fires when listing 60% below MAP on marketplace", async () => {
    const s = mkSignal({
      collectorId: "amazon",
      author: { handle: "x", matchedPractitionerId: null, practitionerMatchConfidence: null },
      pricing: { extracted: 20, currency: "USD", mapFloor: 60 },
    });
    expect((await COUNTERFEIT_SUSPECTED.evaluate(s))[0].severity).toBe("P0");
  });
  it("does not fire at 30% below MAP", async () => {
    const s = mkSignal({
      collectorId: "amazon",
      author: { handle: "x", matchedPractitionerId: null, practitionerMatchConfidence: null },
      pricing: { extracted: 42, currency: "USD", mapFloor: 60 },
    });
    expect((await COUNTERFEIT_SUSPECTED.evaluate(s)).length).toBe(0);
  });
});

describe("MARSHALL.SOCIAL.TESTIMONIAL_UNSUBSTANTIATED_EXT", () => {
  it("fires on numeric outcome without qualifier", async () => {
    const s = mkSignal({ content: { textDerived: "I lost 30 pounds in 60 days on this protocol" } });
    expect((await TESTIMONIAL_UNSUBSTANTIATED_EXT.evaluate(s))[0].severity).toBe("P2");
  });
  it("passes with 'results may vary' qualifier", async () => {
    const s = mkSignal({ content: { textDerived: "I lost 30 pounds. Individual results may vary." } });
    expect((await TESTIMONIAL_UNSUBSTANTIATED_EXT.evaluate(s)).length).toBe(0);
  });
});

describe("MARSHALL.SOCIAL.PEPTIDE_AGE_TARGET_EXT", () => {
  it("fires when audience >25% under 18 with peptide SKU", async () => {
    const s = mkSignal({
      productMatches: [{ sku: "RET-INJ-30ML", confidence: 0.95, method: "lexical" }],
      audienceSignals: { audienceUnder18Pct: 0.4 },
    });
    expect((await PEPTIDE_AGE_TARGET_EXT.evaluate(s))[0].severity).toBe("P0");
  });
  it("passes adult audience", async () => {
    const s = mkSignal({
      productMatches: [{ sku: "RET-INJ-30ML", confidence: 0.95, method: "lexical" }],
      audienceSignals: { audienceUnder18Pct: 0.05 },
    });
    expect((await PEPTIDE_AGE_TARGET_EXT.evaluate(s)).length).toBe(0);
  });
});

describe("MARSHALL.SOCIAL.RETATRUTIDE_STACKING_EXT", () => {
  it("fires when text mentions retatrutide + another peptide", async () => {
    const s = mkSignal({ content: { textDerived: "Stack retatrutide with BPC-157 for best results" } });
    expect((await RETATRUTIDE_STACKING_EXT.evaluate(s))[0].severity).toBe("P0");
  });
  it("passes retatrutide mention alone", async () => {
    const s = mkSignal({ content: { textDerived: "Retatrutide monotherapy guidance" } });
    expect((await RETATRUTIDE_STACKING_EXT.evaluate(s)).length).toBe(0);
  });
});

describe("MARSHALL.SOCIAL.PRACTITIONER_SCOPE_OVERREACH", () => {
  it("flags protocol-level guidance from attributable practitioner", async () => {
    const s = mkSignal({ content: { textDerived: "I prescribe 500mcg twice weekly for this protocol" } });
    expect((await PRACTITIONER_SCOPE_OVERREACH.evaluate(s))[0].severity).toBe("P1");
  });
  it("passes non-prescription educational content", async () => {
    const s = mkSignal({ content: { textDerived: "Here is how methylation works broadly" } });
    expect((await PRACTITIONER_SCOPE_OVERREACH.evaluate(s)).length).toBe(0);
  });
});

describe("MARSHALL.SOCIAL.COORDINATED_BEHAVIOR", () => {
  it("fires when same content on >=3 platforms by same author", async () => {
    const s = mkSignal({
      fingerprintNetwork: { sameAuthorPlatforms: ["instagram", "tiktok", "x"], matchedPractitionersLast72h: 1 },
    });
    expect((await COORDINATED_BEHAVIOR.evaluate(s))[0].severity).toBe("P1");
  });
  it("fires when >=3 practitioners post same content in 72h", async () => {
    const s = mkSignal({
      fingerprintNetwork: { sameAuthorPlatforms: ["instagram"], matchedPractitionersLast72h: 4 },
    });
    expect((await COORDINATED_BEHAVIOR.evaluate(s)).length).toBe(1);
  });
  it("does not fire at lower thresholds", async () => {
    const s = mkSignal({
      fingerprintNetwork: { sameAuthorPlatforms: ["instagram", "tiktok"], matchedPractitionersLast72h: 1 },
    });
    expect((await COORDINATED_BEHAVIOR.evaluate(s)).length).toBe(0);
  });
});

describe("MARSHALL.SOCIAL.DMCA_TRADEMARK_MISUSE", () => {
  it("fires on non-practitioner commercial use of FarmCeutica brand", async () => {
    const s = mkSignal({
      author: { handle: "@rand", matchedPractitionerId: null, practitionerMatchConfidence: null },
      content: { textDerived: "Shop FarmCeutica clones 50% off today!" },
    });
    expect((await DMCA_TRADEMARK_MISUSE.evaluate(s))[0].severity).toBe("P2");
  });
  it("does not fire on non-commercial mention", async () => {
    const s = mkSignal({
      author: { handle: "@rand", matchedPractitionerId: null, practitionerMatchConfidence: null },
      content: { textDerived: "I wrote about FarmCeutica in my newsletter last week" },
    });
    expect((await DMCA_TRADEMARK_MISUSE.evaluate(s)).length).toBe(0);
  });
  it("does not fire on matched practitioner (different lane)", async () => {
    const s = mkSignal({ content: { textDerived: "Shop my FarmCeutica affiliate link" } });
    expect((await DMCA_TRADEMARK_MISUSE.evaluate(s)).length).toBe(0);
  });
});
