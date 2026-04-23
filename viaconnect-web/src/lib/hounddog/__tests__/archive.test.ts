import { describe, it, expect } from "vitest";
import { archiveSignal, verifyBundle } from "../archive";
import type { SocialSignal, EvidenceBundle, EvidenceArtifact } from "../bridge-types";

function fakeSignal(): SocialSignal {
  return {
    id: "sig-1",
    collectorId: "instagram",
    url: "https://instagram.com/p/abc",
    capturedAt: new Date().toISOString(),
    author: { handle: "@test", externalId: "e1", matchedPractitionerId: null, practitionerMatchConfidence: null },
    content: { mediaHashes: {}, fingerprint: "abcdef0123456789" },
    productMatches: [],
    contentQualityScore: 1,
    overallConfidence: 0,
  };
}

describe("archiveSignal", () => {
  it("writes one stub artifact and a verifiable manifest", async () => {
    const bundles: EvidenceBundle[] = [];
    const artifacts: EvidenceArtifact[] = [];
    const bundle = await archiveSignal(fakeSignal(), {
      persistBundle: async (b) => { bundles.push(b); },
      persistArtifact: async (_bid, a) => { artifacts.push(a); },
    });
    expect(bundles.length).toBe(1);
    expect(artifacts.length).toBe(1);
    expect(artifacts[0].kind).toBe("stub");
    expect(verifyBundle(bundle)).toBe(true);
  });

  it("detects tampered artifact via verifyBundle", async () => {
    const bundle = await archiveSignal(fakeSignal(), {
      persistBundle: async () => {},
      persistArtifact: async () => {},
    });
    bundle.artifacts[0] = { ...bundle.artifacts[0], sha256: "tampered" };
    expect(verifyBundle(bundle)).toBe(false);
  });

  it("sets a 7-year retention", async () => {
    const bundle = await archiveSignal(fakeSignal(), {
      persistBundle: async () => {},
      persistArtifact: async () => {},
    });
    const retention = new Date(bundle.retentionUntil);
    const now = new Date();
    const yearsOut = (retention.getTime() - now.getTime()) / (365 * 86_400_000);
    expect(yearsOut).toBeGreaterThan(6.9);
    expect(yearsOut).toBeLessThan(7.1);
  });
});
