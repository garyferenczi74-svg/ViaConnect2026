/**
 * Prompt 221 Phase 2 C1: gemini label gate heuristics (no live API).
 */

import { describe, expect, it } from "vitest";
import { pageLooksLikeHasLabelFacts } from "../geminiLabelExtract";

describe("pageLooksLikeHasLabelFacts", () => {
  it("detects supplement facts header", () => {
    expect(
      pageLooksLikeHasLabelFacts(
        "Product\nSupplement Facts\nServing Size 1 capsule\nVitamin C 500 mg\n"
      )
    ).toBe(true);
  });

  it("detects multiple dose tokens without header", () => {
    expect(
      pageLooksLikeHasLabelFacts(
        "Magnesium 200 mg Zinc 15 mg Copper 1 mg and more minerals listed for adults"
      )
    ).toBe(true);
  });

  it("rejects thin marketing text", () => {
    expect(
      pageLooksLikeHasLabelFacts("Shop our bestsellers and free shipping today.")
    ).toBe(false);
  });
});
