// Prompt 191 (2026-06-12): unit tests for the My Genetics hub SAMPLE variant
// data. These import the module and assert on real values rather than running
// a regex over the source, so the shape and ordering contracts the later UI
// tasks depend on are locked in.

import { describe, it, expect } from "vitest";

import {
  GENETIC_TESTS,
  countsForTest,
  totalSampleVariantCount,
  getTestById,
  type VariantImpact,
} from "../geneticsVariantSamples";

const EXPECTED_IDS = [
  "genexm",
  "nutrigendx",
  "hormoneiq",
  "epigenhq",
  "peptideiq",
  "cannabisiq",
] as const;

const EXPECTED_LABELS = [
  "GeneXM",
  "NutrigenDX",
  "HormoneIQ",
  "EpigenHQ",
  "PeptideIQ",
  "CannabisIQ",
] as const;

const ALLOWED_IMPACTS: VariantImpact[] = ["High", "Moderate", "Low"];

describe("GENETIC_TESTS", () => {
  it("has exactly six tests in the ratified id order", () => {
    expect(GENETIC_TESTS).toHaveLength(6);
    expect(GENETIC_TESTS.map((test) => test.id)).toEqual([...EXPECTED_IDS]);
  });

  it("uses the exact pill labels in order", () => {
    expect(GENETIC_TESTS.map((test) => test.label)).toEqual([...EXPECTED_LABELS]);
  });

  it("flags every test as sample data and carries 6 to 9 variants", () => {
    for (const test of GENETIC_TESTS) {
      expect(test.isSample).toBe(true);
      expect(test.variants.length).toBeGreaterThanOrEqual(6);
      expect(test.variants.length).toBeLessThanOrEqual(9);
    }
  });

  it("only uses High, Moderate, or Low for every variant impact", () => {
    for (const test of GENETIC_TESTS) {
      for (const variant of test.variants) {
        expect(ALLOWED_IMPACTS).toContain(variant.impact);
      }
    }
  });
});

describe("countsForTest", () => {
  it("returns all === high + moderate + low for each test", () => {
    for (const test of GENETIC_TESTS) {
      const counts = countsForTest(test);
      expect(counts.all).toBe(counts.high + counts.moderate + counts.low);
      expect(counts.all).toBe(test.variants.length);
    }
  });
});

describe("totalSampleVariantCount", () => {
  it("equals the sum of all test variant lengths", () => {
    const expected = GENETIC_TESTS.reduce(
      (sum, test) => sum + test.variants.length,
      0,
    );
    expect(totalSampleVariantCount()).toBe(expected);
  });
});

describe("getTestById", () => {
  it("returns the NutrigenDX test for nutrigendx", () => {
    const test = getTestById("nutrigendx");
    expect(test).toBeDefined();
    expect(test?.id).toBe("nutrigendx");
    expect(test?.label).toBe("NutrigenDX");
  });

  it("returns undefined for an unknown id", () => {
    expect(getTestById("nope")).toBeUndefined();
  });
});
