import { describe, expect, it } from "vitest";
import {
  formatConsentVersion,
  formatRequiredConsentPhrase,
  sanitizeConsentCopy,
} from "../consentCopy";

describe("consent copy", () => {
  it("formats a real version with v prefix on the required side", () => {
    expect(formatRequiredConsentPhrase("2.0")).toBe("v2.0");
    expect(formatConsentVersion("1.0")).toBe("1.0");
  });

  it("missing requiredVersion is none, never vundefined", () => {
    expect(formatRequiredConsentPhrase(undefined)).toBe("none");
    expect(formatRequiredConsentPhrase(null)).toBe("none");
    expect(formatRequiredConsentPhrase("")).toBe("none");
    expect(formatRequiredConsentPhrase("undefined")).toBe("none");
    expect(formatConsentVersion(undefined)).toBe("none");
    expect(formatRequiredConsentPhrase(undefined)).not.toContain("undefined");
  });

  it("rewrites stored vundefined for display", () => {
    const walk =
      "Finding: GeneX360 report attempt without valid vundefined consent (have: none).";
    expect(sanitizeConsentCopy(walk)).toBe(
      "Finding: GeneX360 report attempt without valid none consent (have: none).",
    );
    expect(sanitizeConsentCopy(walk)).not.toContain("vundefined");
  });
});
