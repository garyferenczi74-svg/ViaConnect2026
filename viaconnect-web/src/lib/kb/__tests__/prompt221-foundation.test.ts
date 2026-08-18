/**
 * Prompt 221 Phase 1 foundation unit tests (no live DB, no seeding).
 */

import { describe, expect, it } from "vitest";
import {
  KB_COLLECTION_CHARTERS,
  KB_COLLECTION_SLUGS,
  charterBySlug,
  isKbCollectionSlug,
} from "../collections";
import {
  contentHashFromParts,
  contentHashFromText,
  normalizeForHash,
} from "../contentHash";
import {
  defaultGradeForStudyType,
  gradeMeetsMinimum,
  mayCiteAsEvidence,
  needsHumanReview,
} from "../grades";
import { canPromoteKbItem, isLiveGateStatus } from "../promote";
import { formatHitsForHannahContext, type KbSearchHit } from "../search";

describe("prompt221 collections", () => {
  it("registers exactly thirteen collection slugs", () => {
    expect(KB_COLLECTION_SLUGS).toHaveLength(13);
    expect(KB_COLLECTION_CHARTERS).toHaveLength(13);
  });

  it("maps each slug to a charter with phase and gate profile", () => {
    for (const slug of KB_COLLECTION_SLUGS) {
      const c = charterBySlug(slug);
      expect(c).toBeDefined();
      expect(c!.seedingPhase).toBeGreaterThanOrEqual(1);
      expect(c!.seedingPhase).toBeLessThanOrEqual(4);
      expect(["standard", "lex_lane", "practitioner_flagged"]).toContain(
        c!.gateProfile
      );
    }
  });

  it("marks C3 as lex_lane phase 4", () => {
    const c3 = charterBySlug("via_cura_competitive");
    expect(c3?.gateProfile).toBe("lex_lane");
    expect(c3?.seedingPhase).toBe(4);
    expect(c3?.coOwnerAgents).toContain("lex");
  });

  it("type-guards collection slugs", () => {
    expect(isKbCollectionSlug("clinical_studies")).toBe(true);
    expect(isKbCollectionSlug("not_a_collection")).toBe(false);
  });
});

describe("prompt221 contentHash", () => {
  it("normalizes case and whitespace", () => {
    expect(normalizeForHash("  Omega-3  DHA  ")).toBe("omega 3 dha");
  });

  it("is stable for equivalent parts", () => {
    const a = contentHashFromParts({ brand: "Acme", product: "Liposomal C" });
    const b = contentHashFromParts({ product: "Liposomal C", brand: "Acme" });
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("differs when content differs", () => {
    const a = contentHashFromText("study alpha outcomes");
    const b = contentHashFromText("study beta outcomes");
    expect(a).not.toBe(b);
  });
});

describe("prompt221 grades", () => {
  it("defaults study types without fabricating unknown", () => {
    expect(defaultGradeForStudyType("meta_analysis")).toBe("A");
    expect(defaultGradeForStudyType("RCT")).toBe("B");
    expect(defaultGradeForStudyType("animal")).toBe("D");
    expect(defaultGradeForStudyType("mystery")).toBeNull();
    expect(defaultGradeForStudyType(null)).toBeNull();
  });

  it("enforces confidence review threshold", () => {
    expect(needsHumanReview(69)).toBe(true);
    expect(needsHumanReview(70)).toBe(false);
    expect(needsHumanReview(null)).toBe(true);
  });

  it("blocks grade E as scientific evidence citation", () => {
    expect(mayCiteAsEvidence("A")).toBe(true);
    expect(mayCiteAsEvidence("E")).toBe(false);
    expect(gradeMeetsMinimum("B", "C")).toBe(true);
    expect(gradeMeetsMinimum("D", "C")).toBe(false);
  });
});

describe("prompt221 promote guards", () => {
  it("requires Lex decision for C3 lex_approved", () => {
    const denied = canPromoteKbItem({
      currentStatus: "lex_review",
      targetStatus: "lex_approved",
      gateProfile: "lex_lane",
      synthesisType: "sku_competitive_comparison",
      extractionConfidence: 90,
      hasLexApprovedDecision: false,
    });
    expect(denied.ok).toBe(false);
    expect(denied.reason).toBe("lex_decision_required");

    const allowed = canPromoteKbItem({
      currentStatus: "lex_review",
      targetStatus: "lex_approved",
      gateProfile: "lex_lane",
      synthesisType: "sku_competitive_comparison",
      extractionConfidence: 90,
      hasLexApprovedDecision: true,
    });
    expect(allowed.ok).toBe(true);
  });

  it("blocks low confidence live promotion", () => {
    const r = canPromoteKbItem({
      currentStatus: "pending",
      targetStatus: "approved",
      gateProfile: "standard",
      extractionConfidence: 50,
      hasLexApprovedDecision: false,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("low_confidence_requires_review");
  });

  it("blocks plain approved for C3 competitive synthesis", () => {
    const r = canPromoteKbItem({
      currentStatus: "pending",
      targetStatus: "approved",
      gateProfile: "standard",
      synthesisType: "sku_competitive_comparison",
      extractionConfidence: 95,
      hasLexApprovedDecision: false,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("c3_must_use_lex_approved");
  });

  it("identifies live statuses", () => {
    expect(isLiveGateStatus("approved")).toBe(true);
    expect(isLiveGateStatus("lex_approved")).toBe(true);
    expect(isLiveGateStatus("pending")).toBe(false);
  });
});

describe("prompt221 hannah context formatting", () => {
  it("states empty retrieval honestly", () => {
    const text = formatHitsForHannahContext([]);
    expect(text).toMatch(/no relevant corpus items/i);
  });

  it("labels grade E as non-evidence", () => {
    const hits: KbSearchHit[] = [
      {
        itemId: "1",
        title: "Competitor claim",
        summary: "Label phrase only.",
        evidenceGrade: "E",
        gateStatus: "approved",
        collectionSlug: "competitive_supplements",
        payloadType: "product",
        distance: 0.1,
        provenance: {},
      },
    ];
    const text = formatHitsForHannahContext(hits);
    expect(text).toMatch(/do not cite as scientific evidence/i);
  });
});
