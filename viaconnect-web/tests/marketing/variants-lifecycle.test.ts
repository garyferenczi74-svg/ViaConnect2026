import { describe, it, expect } from "vitest";
import { countWords, validateWordCounts } from "@/lib/marketing/variants/wordCount";
import { assignVariant, hashIndex, generateVisitorId } from "@/lib/marketing/variants/assignment";
import { categorizeReferrer, viewportFromWidth } from "@/lib/marketing/variants/impression";
import {
  evaluateWinner,
  type VariantOutcome,
} from "@/lib/marketing/variants/winnerCheck";
import {
  deriveStage,
  deriveActions,
  canActivateClientSide,
  stageLabel,
} from "@/lib/marketing/variants/lifecycle";
import { preCheckVariant } from "@/lib/marketing/variants/precheck";
import { WORD_COUNT_BUDGETS, WINNER_THRESHOLDS } from "@/lib/marketing/variants/types";

// ── wordCount ────────────────────────────────────────────────────────────────

describe("wordCount.countWords", () => {
  it("counts words separated by single spaces", () => {
    expect(countWords("one two three")).toBe(3);
  });
  it("collapses multiple spaces", () => {
    expect(countWords("one   two\ttwo three")).toBe(4);
  });
  it("returns 0 for empty / whitespace", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   \t\n   ")).toBe(0);
  });
  it("strips trademark markers before counting", () => {
    // ™ markers are stripped; the em-dash remains as its own token after whitespace split.
    expect(countWords("ViaConnect™ GeneX360™ fast")).toBe(3);
    expect(countWords("ViaConnect™ GeneX360™")).toBe(2);
  });
  it("counts punctuation-attached words as one", () => {
    expect(countWords("Hello, world!")).toBe(2);
  });
});

describe("wordCount.validateWordCounts", () => {
  it("passes within budget", () => {
    const r = validateWordCounts(
      "Your wellness protocol — built from your biology, in three steps.",
      "Answer the assessment. Add your data. Get the precise protocol your body needs, with the science behind every recommendation.",
    );
    expect(r.ok).toBe(true);
    expect(r.reasons).toEqual([]);
  });
  it("rejects oversized headline", () => {
    const r = validateWordCounts(
      Array.from({ length: WORD_COUNT_BUDGETS.headline_max + 1 }, (_, i) => `word${i}`).join(" "),
      "subhead under budget",
    );
    expect(r.ok).toBe(false);
    expect(r.reasons.some((s) => s.includes("Headline"))).toBe(true);
  });
  it("rejects oversized subheadline", () => {
    const r = validateWordCounts(
      "Headline ok",
      Array.from({ length: WORD_COUNT_BUDGETS.subheadline_max + 1 }, (_, i) => `word${i}`).join(" "),
    );
    expect(r.ok).toBe(false);
    expect(r.reasons.some((s) => s.includes("Subheadline"))).toBe(true);
  });
  it("rejects empty fields", () => {
    const r = validateWordCounts("", "");
    expect(r.ok).toBe(false);
    expect(r.reasons.length).toBeGreaterThanOrEqual(2);
  });
});

// ── assignment ───────────────────────────────────────────────────────────────

describe("assignment.assignVariant", () => {
  it("returns null when no variants active", async () => {
    const r = await assignVariant({ visitorId: "v1", testId: "t1", activeSlotIds: [] });
    expect(r).toBeNull();
  });
  it("returns null when visitor id missing", async () => {
    const r = await assignVariant({ visitorId: "", testId: "t1", activeSlotIds: ["a", "b"] });
    expect(r).toBeNull();
  });
  it("is deterministic for same visitor + test", async () => {
    const a = await assignVariant({ visitorId: "v1", testId: "t1", activeSlotIds: ["a", "b", "c"] });
    const b = await assignVariant({ visitorId: "v1", testId: "t1", activeSlotIds: ["a", "b", "c"] });
    expect(a).toBe(b);
  });
  it("differs across visitors (uniform distribution sanity check)", async () => {
    const buckets: Record<string, number> = { a: 0, b: 0, c: 0, d: 0, e: 0 };
    for (let i = 0; i < 1000; i += 1) {
      const slot = await assignVariant({
        visitorId: `visitor-${i}`,
        testId: "hero_2026q2",
        activeSlotIds: ["a", "b", "c", "d", "e"],
      });
      if (slot) buckets[slot] += 1;
    }
    // Each bucket should hold somewhere between 100 and 300 of the 1000.
    for (const k of Object.keys(buckets)) {
      expect(buckets[k]).toBeGreaterThan(100);
      expect(buckets[k]).toBeLessThan(300);
    }
  });
});

describe("assignment.hashIndex", () => {
  it("returns 0 for bucketCount=0", async () => {
    expect(await hashIndex("anything", 0)).toBe(0);
  });
  it("returns a non-negative integer < bucketCount", async () => {
    for (let i = 0; i < 100; i += 1) {
      const idx = await hashIndex(`s-${i}`, 7);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(7);
    }
  });
});

describe("assignment.generateVisitorId", () => {
  it("returns a unique uuid each call", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i += 1) ids.add(generateVisitorId());
    expect(ids.size).toBe(50);
  });
});

// ── impression helpers ──────────────────────────────────────────────────────

describe("impression.categorizeReferrer", () => {
  it("direct when referrer empty", () => {
    expect(categorizeReferrer(null)).toBe("direct");
    expect(categorizeReferrer("")).toBe("direct");
  });
  it("organic_search for google", () => {
    expect(categorizeReferrer("https://www.google.com/search?q=x")).toBe("organic_search");
  });
  it("social for instagram", () => {
    expect(categorizeReferrer("https://www.instagram.com/post/abc")).toBe("social");
  });
  it("other for unparseable", () => {
    expect(categorizeReferrer("not a url")).toBe("other");
  });
  it("referral for unknown valid host", () => {
    expect(categorizeReferrer("https://news.example.com/article")).toBe("referral");
  });
});

describe("impression.viewportFromWidth", () => {
  it("mobile under 768", () => {
    expect(viewportFromWidth(375)).toBe("mobile");
    expect(viewportFromWidth(767)).toBe("mobile");
  });
  it("tablet 768-1023", () => {
    expect(viewportFromWidth(768)).toBe("tablet");
    expect(viewportFromWidth(1023)).toBe("tablet");
  });
  it("desktop 1024+", () => {
    expect(viewportFromWidth(1024)).toBe("desktop");
    expect(viewportFromWidth(1920)).toBe("desktop");
  });
});

// ── winnerCheck ──────────────────────────────────────────────────────────────

describe("winnerCheck.evaluateWinner", () => {
  const startedTooEarly = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const startedLongEnough = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);

  it("blocks when runtime under threshold", () => {
    const outcomes: VariantOutcome[] = [
      { slotId: "control", visitors: 10000, caqStarts: 1000 },
      { slotId: "A", visitors: 10000, caqStarts: 1500 },
    ];
    const r = evaluateWinner({ controlSlotId: "control", variantOutcomes: outcomes, testStartedAt: startedTooEarly });
    expect(r.meetsRuntime).toBe(false);
    expect(r.eligibleWinnerSlotId).toBeNull();
  });

  it("blocks when sample size under threshold", () => {
    const outcomes: VariantOutcome[] = [
      { slotId: "control", visitors: 200, caqStarts: 20 },
      { slotId: "A", visitors: 200, caqStarts: 50 },
    ];
    const r = evaluateWinner({ controlSlotId: "control", variantOutcomes: outcomes, testStartedAt: startedLongEnough });
    expect(r.eligibleWinnerSlotId).toBeNull();
    expect(r.variants[0].meetsSampleSize).toBe(false);
  });

  it("blocks when lift below threshold", () => {
    const outcomes: VariantOutcome[] = [
      { slotId: "control", visitors: 10000, caqStarts: 1000 },
      { slotId: "A", visitors: 10000, caqStarts: 1050 }, // 0.5pp lift
    ];
    const r = evaluateWinner({ controlSlotId: "control", variantOutcomes: outcomes, testStartedAt: startedLongEnough });
    expect(r.variants[0].meetsLift).toBe(false);
    expect(r.eligibleWinnerSlotId).toBeNull();
  });

  it("declares winner when all five conditions met", () => {
    const outcomes: VariantOutcome[] = [
      { slotId: "control", visitors: WINNER_THRESHOLDS.min_visitors_per_variant, caqStarts: 800 },
      { slotId: "A", visitors: WINNER_THRESHOLDS.min_visitors_per_variant, caqStarts: 1100 },
    ];
    const r = evaluateWinner({ controlSlotId: "control", variantOutcomes: outcomes, testStartedAt: startedLongEnough });
    expect(r.variants[0].meetsSampleSize).toBe(true);
    expect(r.variants[0].meetsLift).toBe(true);
    expect(r.variants[0].meetsConfidence).toBe(true);
    expect(r.eligibleWinnerSlotId).toBe("A");
  });

  it("picks highest-lift winner when multiple variants are eligible", () => {
    const n = WINNER_THRESHOLDS.min_visitors_per_variant;
    const outcomes: VariantOutcome[] = [
      { slotId: "control", visitors: n, caqStarts: 800 },
      { slotId: "A", visitors: n, caqStarts: 1000 }, // 4pp lift
      { slotId: "B", visitors: n, caqStarts: 1200 }, // 8pp lift
    ];
    const r = evaluateWinner({ controlSlotId: "control", variantOutcomes: outcomes, testStartedAt: startedLongEnough });
    expect(r.eligibleWinnerSlotId).toBe("B");
  });
});

// ── lifecycle state machine ──────────────────────────────────────────────────

describe("lifecycle.deriveStage", () => {
  it("draft when nothing set", () => {
    expect(
      deriveStage({
        word_count_validated: false,
        marshall_precheck_passed: false,
        steve_approval_at: null,
        active_in_test: false,
        archived: false,
      }),
    ).toBe("draft");
  });
  it("word_validated", () => {
    expect(
      deriveStage({
        word_count_validated: true,
        marshall_precheck_passed: false,
        steve_approval_at: null,
        active_in_test: false,
        archived: false,
      }),
    ).toBe("word_validated");
  });
  it("precheck_clean", () => {
    expect(
      deriveStage({
        word_count_validated: true,
        marshall_precheck_passed: true,
        steve_approval_at: null,
        active_in_test: false,
        archived: false,
      }),
    ).toBe("precheck_clean");
  });
  it("approved", () => {
    expect(
      deriveStage({
        word_count_validated: true,
        marshall_precheck_passed: true,
        steve_approval_at: new Date().toISOString(),
        active_in_test: false,
        archived: false,
      }),
    ).toBe("approved");
  });
  it("active", () => {
    expect(
      deriveStage({
        word_count_validated: true,
        marshall_precheck_passed: true,
        steve_approval_at: new Date().toISOString(),
        active_in_test: true,
        archived: false,
      }),
    ).toBe("active");
  });
  it("archived dominates everything", () => {
    expect(
      deriveStage({
        word_count_validated: true,
        marshall_precheck_passed: true,
        steve_approval_at: new Date().toISOString(),
        active_in_test: true,
        archived: true,
      }),
    ).toBe("archived");
  });
});

describe("lifecycle.canActivateClientSide", () => {
  const baseRow = {
    word_count_validated: true,
    marshall_precheck_passed: true,
    steve_approval_at: new Date().toISOString(),
    archived: false,
  };

  it("ok when all four conditions met", () => {
    const r = canActivateClientSide(baseRow);
    expect(r.ok).toBe(true);
    expect(r.reasons).toEqual([]);
  });
  it("blocks on archived", () => {
    const r = canActivateClientSide({ ...baseRow, archived: true });
    expect(r.ok).toBe(false);
    expect(r.reasons.some((s) => s.includes("archived"))).toBe(true);
  });
  it("blocks when word_count not validated", () => {
    const r = canActivateClientSide({ ...baseRow, word_count_validated: false });
    expect(r.ok).toBe(false);
  });
  it("blocks when precheck not passed", () => {
    const r = canActivateClientSide({ ...baseRow, marshall_precheck_passed: false });
    expect(r.ok).toBe(false);
  });
  it("blocks when steve approval missing", () => {
    const r = canActivateClientSide({ ...baseRow, steve_approval_at: null });
    expect(r.ok).toBe(false);
  });
});

describe("lifecycle.deriveActions", () => {
  const draft = {
    word_count_validated: false,
    marshall_precheck_passed: false,
    steve_approval_at: null,
    active_in_test: false,
    archived: false,
  };
  const approved = {
    word_count_validated: true,
    marshall_precheck_passed: true,
    steve_approval_at: new Date().toISOString(),
    active_in_test: false,
    archived: false,
  };
  const active = { ...approved, active_in_test: true };

  it("marketing_admin can validate word count on draft, cannot approve", () => {
    const a = deriveActions(draft, "marketing_admin");
    expect(a.canValidateWordCount).toBe(true);
    expect(a.canApprove).toBe(false);
  });
  it("compliance_admin can approve precheck-clean variant", () => {
    const a = deriveActions(
      { ...approved, steve_approval_at: null },
      "compliance_admin",
    );
    expect(a.canApprove).toBe(true);
  });
  it("marketing_admin cannot approve precheck-clean variant", () => {
    const a = deriveActions(
      { ...approved, steve_approval_at: null },
      "marketing_admin",
    );
    expect(a.canApprove).toBe(false);
  });
  it("approved variant can be activated", () => {
    const a = deriveActions(approved, "compliance_admin");
    expect(a.canActivate).toBe(true);
  });
  it("active variant cannot be re-activated; can be deactivated", () => {
    const a = deriveActions(active, "compliance_admin");
    expect(a.canActivate).toBe(false);
    expect(a.canDeactivate).toBe(true);
  });
  it("active variant can be revoked by compliance_admin only", () => {
    const a = deriveActions(active, "marketing_admin");
    expect(a.canRevoke).toBe(false);
    const b = deriveActions(active, "superadmin");
    expect(b.canRevoke).toBe(true);
  });
});

describe("lifecycle.stageLabel", () => {
  it("returns a human-readable label for every stage", () => {
    for (const s of ["draft", "word_validated", "precheck_clean", "approved", "active", "archived"] as const) {
      expect(stageLabel(s)).toMatch(/[A-Z]/);
    }
  });
});

// ── precheck wrapper ─────────────────────────────────────────────────────────

describe("precheck.preCheckVariant", () => {
  it("clears clean copy", async () => {
    const r = await preCheckVariant({
      headline: "Your wellness protocol, built from your biology",
      subheadline: "Answer the assessment. Add your data. Get the precise protocol your body needs.",
      ctaLabel: "Start the assessment",
    });
    expect(r.passed).toBe(true);
    expect(r.blockerCount).toBe(0);
  });

  it("blocks 'Vitality Score' (BIO_OPTIMIZATION_NAMING)", async () => {
    const r = await preCheckVariant({
      headline: "Your Vitality Score awaits",
      subheadline: "Begin in twelve minutes.",
      ctaLabel: "Start",
    });
    expect(r.passed).toBe(false);
    expect(r.blockerCount).toBeGreaterThan(0);
  });

  it("blocks outcome-guarantee phrasing in subheadline", async () => {
    const r = await preCheckVariant({
      headline: "Better sleep starts here",
      subheadline: "You will sleep deeper within 30 days, guaranteed.",
      ctaLabel: "Start",
    });
    expect(r.passed).toBe(false);
  });

  it("blocks Dr. naming without consent on file", async () => {
    const r = await preCheckVariant({
      headline: "Reviewed by Dr. Fadi Dagher",
      subheadline: "Every protocol category is reviewed before it reaches you.",
      ctaLabel: "Start",
      clinicianConsentOnFile: false,
    });
    // P1, not P0 — but still a blocker per #138a precheck definition.
    expect(r.blockerCount).toBeGreaterThan(0);
  });

  it("clears Dr. naming when consent flag is set", async () => {
    const r = await preCheckVariant({
      headline: "Reviewed by Dr. Fadi Dagher",
      subheadline: "Every protocol category is reviewed before it reaches you.",
      ctaLabel: "Start",
      clinicianConsentOnFile: true,
    });
    // Other rules may still flag, but the named-person rule does not.
    const namedFinding = r.findings.find((f) => f.ruleId === "MARSHALL.MARKETING.NAMED_PERSON_CONNECTION");
    expect(namedFinding).toBeUndefined();
  });
});
