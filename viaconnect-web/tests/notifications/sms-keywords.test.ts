// Prompt #112 — SMS keyword handling (TCPA compliance).

import { describe, it, expect } from "vitest";
import {
  isStopKeyword, isHelpKeyword,
  SMS_TCPA_COMPLIANT_OPT_IN_COPY, SMS_HELP_AUTO_RESPONSE, SMS_OPT_OUT_CONFIRMATION, SMS_OPT_IN_CONFIRMATION,
  SMS_STOP_KEYWORDS, SMS_HELP_KEYWORDS,
} from "@/lib/notifications/adapters/sms";

describe("SMS STOP keyword", () => {
  it("recognises canonical STOP variants regardless of case and whitespace", () => {
    for (const k of ["STOP", "stop", " stop ", "Stop", "CANCEL", "unsubscribe", "END", "quit"]) {
      expect(isStopKeyword(k)).toBe(true);
    }
  });
  it("includes the 5 TCPA-required STOP synonyms", () => {
    for (const k of ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]) {
      expect(SMS_STOP_KEYWORDS).toContain(k);
    }
  });
  it("does not collide with opt-in reply YES", () => {
    expect(isStopKeyword("YES")).toBe(false);
    expect(isStopKeyword("yes")).toBe(false);
  });
});

describe("SMS HELP keyword", () => {
  it("recognises HELP + INFO", () => {
    expect(isHelpKeyword("HELP")).toBe(true);
    expect(isHelpKeyword("help")).toBe(true);
    expect(isHelpKeyword("INFO")).toBe(true);
  });
  it("does not match other text", () => {
    expect(isHelpKeyword("What is this")).toBe(false);
  });
});

describe("TCPA-compliant SMS copy", () => {
  it("opt-in message contains required elements", () => {
    expect(SMS_TCPA_COMPLIANT_OPT_IN_COPY).toContain("ViaConnect");
    expect(SMS_TCPA_COMPLIANT_OPT_IN_COPY).toMatch(/msg.*data rates/i);
    expect(SMS_TCPA_COMPLIANT_OPT_IN_COPY).toContain("STOP");
    expect(SMS_TCPA_COMPLIANT_OPT_IN_COPY).toContain("HELP");
    expect(SMS_TCPA_COMPLIANT_OPT_IN_COPY).toContain("YES");
  });
  it("opt-out confirmation mentions STOP was processed", () => {
    expect(SMS_OPT_OUT_CONFIRMATION).toContain("opted out");
  });
  it("opt-in confirmation tells user how to opt out", () => {
    expect(SMS_OPT_IN_CONFIRMATION).toContain("STOP");
  });
  it("help auto-response includes support contact", () => {
    expect(SMS_HELP_AUTO_RESPONSE).toContain("support");
  });
});
