import { describe, it, expect } from "vitest";
import { CAN_SPAM_UNSUB, TCPA_SMS_CONSENT, MARKETING_CONSENT_LEDGER } from "../rules/comms";

describe("MARSHALL.COMMS.CAN_SPAM_UNSUB", () => {
  it("P0 missing unsub link", async () => {
    const hits = await CAN_SPAM_UNSUB.evaluate({
      subject: "Spring sale", body: "Shop now", hasUnsubLink: false, hasPhysicalAddress: true,
    });
    expect(hits.some((h) => /unsubscribe/.test(h.message))).toBe(true);
  });
  it("P0 missing address", async () => {
    const hits = await CAN_SPAM_UNSUB.evaluate({
      subject: "Spring sale", body: "Shop now", hasUnsubLink: true, hasPhysicalAddress: false,
    });
    expect(hits.some((h) => /address/.test(h.message))).toBe(true);
  });
  it("passes when both present", async () => {
    const hits = await CAN_SPAM_UNSUB.evaluate({
      subject: "Spring sale", body: "Shop now", hasUnsubLink: true, hasPhysicalAddress: true,
    });
    expect(hits.length).toBe(0);
  });
});

describe("MARSHALL.COMMS.TCPA_SMS_CONSENT", () => {
  it("blocks without opt-in", async () => {
    const hits = await TCPA_SMS_CONSENT.evaluate({
      userId: "u1", hasOptIn: false, doubleOptInRequired: false, doubleOptInConfirmed: false,
    });
    expect(hits[0].severity).toBe("P0");
  });
  it("blocks EU single opt-in", async () => {
    const hits = await TCPA_SMS_CONSENT.evaluate({
      userId: "u1", hasOptIn: true, doubleOptInRequired: true, doubleOptInConfirmed: false,
    });
    expect(hits[0].severity).toBe("P0");
  });
  it("passes US single opt-in", async () => {
    const hits = await TCPA_SMS_CONSENT.evaluate({
      userId: "u1", hasOptIn: true, doubleOptInRequired: false, doubleOptInConfirmed: false,
    });
    expect(hits.length).toBe(0);
  });
});

describe("MARSHALL.COMMS.MARKETING_CONSENT_LEDGER", () => {
  it("flags stale consent check", async () => {
    const hits = await MARKETING_CONSENT_LEDGER.evaluate({
      userId: "u1", campaign: "c1", consentAtSendTime: false,
    });
    expect(hits[0].severity).toBe("P1");
  });
  it("passes fresh consent", async () => {
    const hits = await MARKETING_CONSENT_LEDGER.evaluate({
      userId: "u1", campaign: "c1", consentAtSendTime: true,
    });
    expect(hits.length).toBe(0);
  });
});
