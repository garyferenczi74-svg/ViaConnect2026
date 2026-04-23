import { describe, it, expect } from "vitest";
import { DSAR_SLA, SENSITIVE_DATA_OPT_IN, COOKIE_CONSENT_JURISDICTIONAL } from "../rules/privacy";

describe("MARSHALL.PRIVACY.DSAR_SLA", () => {
  it("P0 when GDPR request is 35 days old", async () => {
    const openedAt = new Date(Date.now() - 35 * 86_400_000).toISOString();
    const hits = await DSAR_SLA.evaluate({ requestId: "d1", jurisdiction: "gdpr", openedAt });
    expect(hits[0].severity).toBe("P0");
  });
  it("P1 when GDPR approaching deadline", async () => {
    const openedAt = new Date(Date.now() - 29 * 86_400_000).toISOString();
    const hits = await DSAR_SLA.evaluate({ requestId: "d1", jurisdiction: "gdpr", openedAt });
    expect(hits[0].severity).toBe("P1");
  });
  it("no finding for completed request", async () => {
    const hits = await DSAR_SLA.evaluate({
      requestId: "d1", jurisdiction: "gdpr",
      openedAt: new Date(Date.now() - 10 * 86_400_000).toISOString(),
      completedAt: new Date().toISOString(),
    });
    expect(hits.length).toBe(0);
  });
});

describe("MARSHALL.PRIVACY.SENSITIVE_DATA_OPT_IN", () => {
  it("P0 when processing genetic without opt-in", async () => {
    const hits = await SENSITIVE_DATA_OPT_IN.evaluate({
      userId: "u1", dataType: "genetic", hasExplicitOptIn: false,
    });
    expect(hits[0].severity).toBe("P0");
  });
  it("allows with opt-in", async () => {
    const hits = await SENSITIVE_DATA_OPT_IN.evaluate({
      userId: "u1", dataType: "genetic", hasExplicitOptIn: true,
    });
    expect(hits.length).toBe(0);
  });
});

describe("MARSHALL.PRIVACY.COOKIE_CONSENT_JURISDICTIONAL", () => {
  it("flags wrong banner for DE", async () => {
    const hits = await COOKIE_CONSENT_JURISDICTIONAL.evaluate({
      userCountry: "DE", bannerVariant: "ccpa_opt_out",
    });
    expect(hits.length).toBe(1);
  });
  it("passes correct GDPR banner for FR", async () => {
    const hits = await COOKIE_CONSENT_JURISDICTIONAL.evaluate({
      userCountry: "FR", bannerVariant: "gdpr_strict",
    });
    expect(hits.length).toBe(0);
  });
  it("passes US with ccpa banner", async () => {
    const hits = await COOKIE_CONSENT_JURISDICTIONAL.evaluate({
      userCountry: "US", bannerVariant: "ccpa_opt_out",
    });
    expect(hits.length).toBe(0);
  });
});
