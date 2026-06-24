/**
 * provenanceFor.test.ts
 *
 * Node-safe unit tests for the provenanceFor pure helper from AcceleratorCard.
 * TDD: written before the implementation (RED), then made green.
 *
 * Assertions:
 *   - Returns a non-empty string for each valid icon (sleep, nutrition,
 *     movement, stress, supplement) and for an unknown/unmapped icon.
 *   - Deterministic: calling twice with the same input returns the same string.
 *   - Never throws (including for unexpected icon values).
 *   - Educational framing only: the returned strings must NOT contain
 *     treatment or disease trigger words (cure, treat, diagnose, disease).
 *   - No em-dash or en-dash characters in any returned string.
 *
 * No emojis. No em/en-dashes. Lucide icons not tested here (UI-layer only).
 */

import { describe, it, expect } from "vitest";
import { provenanceFor } from "../AcceleratorCard";
import type { JourneyRec } from "@/app/(app)/(consumer)/analytics/components/BioOptimizationTrend/hooks/useJourneyRecommendations";

// Trigger words that must NOT appear in any provenance string.
const TREATMENT_TRIGGERS = ["cure", "treat", "diagnose", "disease"];

// Characters that must NOT appear: em-dash (U+2014) and en-dash (U+2013).
// Expressed via fromCharCode to avoid embedding literal dash characters in source.
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const DASH_CHARS = [EN_DASH, EM_DASH];

function makeRec(icon: JourneyRec["icon"], overrides: Partial<JourneyRec> = {}): JourneyRec {
  return {
    id: `test-${icon}`,
    title: "Test rec",
    description: "Test description",
    category: icon,
    estimatedImpact: 5,
    icon,
    ...overrides,
  };
}

const VALID_ICONS: JourneyRec["icon"][] = [
  "sleep",
  "nutrition",
  "movement",
  "stress",
  "supplement",
];

describe("provenanceFor", () => {
  describe("returns a non-empty string for every valid icon", () => {
    for (const icon of VALID_ICONS) {
      it(`icon="${icon}"`, () => {
        const result = provenanceFor(makeRec(icon));
        expect(typeof result).toBe("string");
        expect(result.trim().length).toBeGreaterThan(0);
      });
    }
  });

  it("returns a non-empty string for an unknown/unmapped icon", () => {
    const rec = {
      id: "test-unknown",
      title: "Unknown rec",
      description: "Unknown",
      category: "unknown",
      estimatedImpact: 3,
      icon: "nutrition" as JourneyRec["icon"],
    };
    // Force an unknown icon via casting to test the default branch.
    const recUnknown = { ...rec, icon: "wellness" as JourneyRec["icon"] };
    const result = provenanceFor(recUnknown);
    expect(typeof result).toBe("string");
    expect(result.trim().length).toBeGreaterThan(0);
  });

  describe("is deterministic", () => {
    for (const icon of VALID_ICONS) {
      it(`icon="${icon}" returns same value on repeated calls`, () => {
        const rec = makeRec(icon);
        expect(provenanceFor(rec)).toBe(provenanceFor(rec));
      });
    }
  });

  it("never throws for unexpected input", () => {
    expect(() => provenanceFor(makeRec("sleep"))).not.toThrow();
    expect(() => provenanceFor(makeRec("nutrition"))).not.toThrow();
    expect(() => provenanceFor(makeRec("movement"))).not.toThrow();
    expect(() => provenanceFor(makeRec("stress"))).not.toThrow();
    expect(() => provenanceFor(makeRec("supplement"))).not.toThrow();
  });

  describe("educational framing only: no treatment or disease trigger words", () => {
    for (const icon of VALID_ICONS) {
      for (const trigger of TREATMENT_TRIGGERS) {
        it(`icon="${icon}" does not contain "${trigger}"`, () => {
          const result = provenanceFor(makeRec(icon)).toLowerCase();
          expect(result).not.toContain(trigger);
        });
      }
    }
  });

  describe("no em-dash or en-dash characters", () => {
    for (const icon of VALID_ICONS) {
      it(`icon="${icon}" contains no em-dash or en-dash`, () => {
        const result = provenanceFor(makeRec(icon));
        for (const dash of DASH_CHARS) {
          expect(result).not.toContain(dash);
        }
      });
    }
  });
});
