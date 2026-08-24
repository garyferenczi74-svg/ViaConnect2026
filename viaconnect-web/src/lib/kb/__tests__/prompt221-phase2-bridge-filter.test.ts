/**
 * Prompt 221 Phase 2: clinical bridge must not accept competitive lanes.
 */

import { describe, expect, it } from "vitest";
import { isHostAllowlisted, PHASE2_COMPETITIVE_SEED_DOMAINS } from "../competitiveAllowlist";

describe("221 phase2 clinical vs competitive host filter", () => {
  it("flags brand hosts as competitive (clinical bridge must skip)", () => {
    const allow = [...PHASE2_COMPETITIVE_SEED_DOMAINS];
    expect(isHostAllowlisted("www.thorne.com", allow)).toBe(true);
    expect(isHostAllowlisted("quicksilverscientific.com", allow)).toBe(true);
    expect(isHostAllowlisted("23andme.com", allow)).toBe(true);
    expect(isHostAllowlisted("pubmed.ncbi.nlm.nih.gov", allow)).toBe(false);
  });
});
