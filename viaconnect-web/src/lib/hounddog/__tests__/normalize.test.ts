import { describe, it, expect } from "vitest";
import { fingerprintText, computeOverallConfidence, normalize } from "../normalize";
import type { RawSocialSignal } from "../bridge-types";

describe("fingerprintText", () => {
  it("is stable for identical input", () => {
    expect(fingerprintText("Hello world")).toBe(fingerprintText("Hello world"));
  });
  it("ignores case and punctuation", () => {
    expect(fingerprintText("Hello, world!")).toBe(fingerprintText("hello world"));
  });
  it("differentiates different content", () => {
    expect(fingerprintText("FarmCeutica MTHFR")).not.toBe(fingerprintText("FarmCeutica COMT"));
  });
  it("produces a 16-char hex string", () => {
    const fp = fingerprintText("anything goes here");
    expect(fp).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("computeOverallConfidence", () => {
  it("takes the floor of the three components", () => {
    expect(computeOverallConfidence({ practitionerMatch: 0.9, topProductMatch: 0.6, contentQuality: 0.8 })).toBeCloseTo(0.6, 5);
  });
  it("treats null practitioner match as 0", () => {
    expect(computeOverallConfidence({ practitionerMatch: null, topProductMatch: 0.9, contentQuality: 1 })).toBe(0);
  });
  it("clamps to [0,1]", () => {
    expect(computeOverallConfidence({ practitionerMatch: 1.5, topProductMatch: 1.2, contentQuality: 1 })).toBe(1);
    expect(computeOverallConfidence({ practitionerMatch: -1, topProductMatch: 0.5, contentQuality: 0.5 })).toBe(0);
  });
});

describe("normalize", () => {
  const raw: RawSocialSignal = {
    collectorId: "instagram",
    providerId: "meta-graph",
    externalId: "x1",
    url: "https://instagram.com/p/x1",
    authorHandle: "@verified",
    authorExternalId: "ext-1",
    contentType: "text",
    text: "Love the FarmCeutica methylation stack, 30 caps a day supported me for 3 months",
    publishedAt: "2026-04-20T00:00:00.000Z",
    capturedAt: "2026-04-22T00:00:00.000Z",
    rawPayload: {},
  };

  it("attaches product matches", async () => {
    const out = await normalize(raw, {
      lookupPractitionerByHandle: async () => ({ practitionerId: "p1", method: "self_registered", confidence: 0.9 }),
      matchSkus: async () => [{ sku: "FARM-METH-30", confidence: 0.9, method: "lexical" }],
    });
    expect(out.productMatches[0].sku).toBe("FARM-METH-30");
  });

  it("records unmatched practitioner as null", async () => {
    const out = await normalize(raw, {
      lookupPractitionerByHandle: async () => null,
      matchSkus: async () => [],
    });
    expect(out.author.matchedPractitionerId).toBeNull();
    expect(out.overallConfidence).toBe(0);
  });

  it("passes through fingerprint", async () => {
    const out = await normalize(raw, {
      lookupPractitionerByHandle: async () => null,
      matchSkus: async () => [],
    });
    expect(out.content.fingerprint).toMatch(/^[0-9a-f]{16}$/);
  });
});
