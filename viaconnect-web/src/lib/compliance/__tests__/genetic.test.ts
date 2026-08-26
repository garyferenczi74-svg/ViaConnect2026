import { describe, it, expect } from "vitest";
import { GENEX360_CONSENT, BAA_REQUIRED_VENDORS, MINOR_GENETIC_LOCK } from "../rules/genetic";

describe("MARSHALL.GENETIC.GENEX360_CONSENT", () => {
  it("blocks when no consent", async () => {
    const hits = await GENEX360_CONSENT.evaluate({
      userId: "u1", hasConsent: false, requiredVersion: "2.0",
    });
    expect(hits.length).toBe(1);
    expect(hits[0].severity).toBe("P0");
    expect(hits[0].message).toContain("v2.0");
    expect(hits[0].message).toContain("have: none");
    expect(hits[0].message).not.toContain("vundefined");
  });
  it("blocks on version mismatch", async () => {
    const hits = await GENEX360_CONSENT.evaluate({
      userId: "u1", hasConsent: true, consentVersion: "1.0", requiredVersion: "2.0",
    });
    expect(hits.length).toBe(1);
    expect(hits[0].message).toContain("v2.0");
    expect(hits[0].message).toContain("have: 1.0");
    expect(hits[0].message).not.toContain("vundefined");
  });
  it("allows on exact version match", async () => {
    const hits = await GENEX360_CONSENT.evaluate({
      userId: "u1", hasConsent: true, consentVersion: "2.0", requiredVersion: "2.0",
    });
    expect(hits.length).toBe(0);
  });
  it("missing requiredVersion never prints vundefined (uses none)", async () => {
    const hits = await GENEX360_CONSENT.evaluate({
      userId: "u1", hasConsent: false,
    });
    expect(hits.length).toBe(1);
    expect(hits[0].severity).toBe("P0");
    expect(hits[0].message).toBe(
      "Finding: GeneX360 report attempt without valid none consent (have: none).",
    );
    expect(hits[0].message).not.toContain("vundefined");
    expect(hits[0].message).not.toContain("undefined");
  });
});

describe("MARSHALL.GENETIC.BAA_REQUIRED_VENDORS", () => {
  it("P0 when no BAA", async () => {
    const hits = await BAA_REQUIRED_VENDORS.evaluate({ vendorName: "Acme", hasBaa: false });
    expect(hits[0].severity).toBe("P0");
  });
  it("P0 when BAA expired", async () => {
    const past = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const hits = await BAA_REQUIRED_VENDORS.evaluate({ vendorName: "Acme", hasBaa: true, baaExpiresOn: past });
    expect(hits[0].severity).toBe("P0");
  });
  it("P2 advisory when BAA expires within 60 days", async () => {
    const soon = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const hits = await BAA_REQUIRED_VENDORS.evaluate({ vendorName: "Acme", hasBaa: true, baaExpiresOn: soon });
    expect(hits[0].severity).toBe("P2");
  });
  it("no finding when BAA comfortably valid", async () => {
    const far = new Date(Date.now() + 365 * 86_400_000).toISOString();
    const hits = await BAA_REQUIRED_VENDORS.evaluate({ vendorName: "Acme", hasBaa: true, baaExpiresOn: far });
    expect(hits.length).toBe(0);
  });
});

describe("MARSHALL.GENETIC.MINOR_GENETIC_LOCK", () => {
  it("blocks under-13 entirely", async () => {
    const hits = await MINOR_GENETIC_LOCK.evaluate({ userAge: 10 });
    expect(hits[0].severity).toBe("P0");
  });
  it("requires guardian consent for 13-17", async () => {
    const hits = await MINOR_GENETIC_LOCK.evaluate({ userAge: 15, hasGuardianConsent: false });
    expect(hits[0].severity).toBe("P0");
  });
  it("allows 15 with guardian consent", async () => {
    const hits = await MINOR_GENETIC_LOCK.evaluate({ userAge: 15, hasGuardianConsent: true });
    expect(hits.length).toBe(0);
  });
  it("allows 18+", async () => {
    const hits = await MINOR_GENETIC_LOCK.evaluate({ userAge: 19 });
    expect(hits.length).toBe(0);
  });
});
