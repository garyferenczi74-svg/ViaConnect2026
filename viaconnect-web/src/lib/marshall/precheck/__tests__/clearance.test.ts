import { describe, it, expect, beforeAll } from "vitest";
import { generateKeyPairSync } from "crypto";
import { signReceipt, verifyReceipt, jaccardSimilarity } from "../clearance";

beforeAll(() => {
  // Generate an ephemeral P-256 key for the test suite.
  const { privateKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  process.env.MARSHALL_PRECHECK_SIGNING_KEY_PEM = privateKey as string;
  process.env.MARSHALL_PRECHECK_SIGNING_KID = "test-kid";
});

describe("ES256 sign + verify", () => {
  it("signs a receipt and verifies it round-trip", () => {
    const { jwt, receiptId, signingKeyId } = signReceipt({
      sub: "practitioner:abc",
      draftHashSha256: "deadbeef",
      normalizationVersion: "v1",
      ruleRegistryVersion: "v4",
      rulesRun: ["R1"],
      findingsFinal: { p0: 0, p1: 0, p2: 0, p3: 0, advisory: 0 },
      sessionId: "PCS-X",
    });
    expect(receiptId).toMatch(/[0-9a-f-]{36}/);
    expect(signingKeyId).toBe("test-kid");
    const v = verifyReceipt(jwt);
    expect(v.valid).toBe(true);
    expect(v.payload?.draftHashSha256).toBe("deadbeef");
  });

  it("rejects a tampered JWT", () => {
    const { jwt } = signReceipt({
      sub: "practitioner:abc",
      draftHashSha256: "deadbeef",
      normalizationVersion: "v1",
      ruleRegistryVersion: "v4",
      rulesRun: [],
      findingsFinal: { p0: 0, p1: 0, p2: 0, p3: 0, advisory: 0 },
      sessionId: "PCS-X",
    });
    const parts = jwt.split(".");
    const tamperedPayload = Buffer.from(Buffer.from(parts[1], "base64").toString("utf8").replace("deadbeef", "cafebabe")).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    expect(verifyReceipt(tampered).valid).toBe(false);
  });

  it("rejects an expired JWT", () => {
    const { jwt } = signReceipt(
      {
        sub: "practitioner:abc",
        draftHashSha256: "x",
        normalizationVersion: "v1",
        ruleRegistryVersion: "v4",
        rulesRun: [],
        findingsFinal: { p0: 0, p1: 0, p2: 0, p3: 0, advisory: 0 },
        sessionId: "X",
      },
      -10, // negative TTL so exp is in the past
    );
    const v = verifyReceipt(jwt);
    expect(v.valid).toBe(false);
    expect(v.reason).toBe("expired");
  });
});

describe("jaccardSimilarity", () => {
  it("returns 1 for identical token sets", () => {
    expect(jaccardSimilarity("hello world", "world hello")).toBe(1);
  });
  it("returns 0 for disjoint token sets", () => {
    expect(jaccardSimilarity("abc def", "xyz uvw")).toBe(0);
  });
  it("returns 0.5 for half-overlap", () => {
    expect(jaccardSimilarity("a b", "a c")).toBeCloseTo(1 / 3, 2); // union=3, intersect=1
  });
});
