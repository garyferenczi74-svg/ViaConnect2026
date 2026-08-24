/**
 * Prompt 221 Phase 2: competitive allowlist scope + seed domains.
 */

import { describe, expect, it } from "vitest";
import {
  assertAllowlistScope,
  isHostAllowlisted,
  PHASE2_COMPETITIVE_SEED_DOMAINS,
} from "../competitiveAllowlist";
import { charterBySlug } from "../collections";

describe("221 phase2 competitive allowlist", () => {
  it("seeds C1 brands and C4 genetic providers", () => {
    expect(PHASE2_COMPETITIVE_SEED_DOMAINS).toContain("thorne.com");
    expect(PHASE2_COMPETITIVE_SEED_DOMAINS).toContain(
      "quicksilverscientific.com"
    );
    expect(PHASE2_COMPETITIVE_SEED_DOMAINS).toContain("23andme.com");
    expect(PHASE2_COMPETITIVE_SEED_DOMAINS).toContain("invitae.com");
    expect(PHASE2_COMPETITIVE_SEED_DOMAINS).toContain("codeage.com");
    expect(PHASE2_COMPETITIVE_SEED_DOMAINS).toContain("metagenics.com");
    expect(PHASE2_COMPETITIVE_SEED_DOMAINS).toContain("organika.com");
    expect(PHASE2_COMPETITIVE_SEED_DOMAINS).toContain("aor.ca");
    expect(PHASE2_COMPETITIVE_SEED_DOMAINS).toContain("cymbiotika.ca");
    expect(PHASE2_COMPETITIVE_SEED_DOMAINS).toContain("canprev.com");
    expect(PHASE2_COMPETITIVE_SEED_DOMAINS).toContain("pureforyou.com");
    expect(PHASE2_COMPETITIVE_SEED_DOMAINS.length).toBeGreaterThanOrEqual(40);
  });

  it("matches host and subdomains against allowlist", () => {
    const allow = [...PHASE2_COMPETITIVE_SEED_DOMAINS];
    expect(isHostAllowlisted("www.thorne.com", allow)).toBe(true);
    expect(isHostAllowlisted("shop.thorne.com", allow)).toBe(true);
    expect(isHostAllowlisted("evil-thorne.com", allow)).toBe(false);
    expect(isHostAllowlisted("random-competitor.example", allow)).toBe(false);
  });

  it("assertAllowlistScope fails closed outside list", () => {
    const allow = ["thorne.com"];
    expect(
      assertAllowlistScope("https://www.thorne.com/products/x", allow).ok
    ).toBe(true);
    expect(
      assertAllowlistScope("https://not-approved.example/p", allow).ok
    ).toBe(false);
  });

  it("charters mark C1 and C4 as seeding phase 2", () => {
    expect(charterBySlug("competitive_supplements")?.seedingPhase).toBe(2);
    expect(charterBySlug("genetic_tests")?.seedingPhase).toBe(2);
  });
});
