/**
 * Prompt 221 Part B: evidence grades A-E and extraction confidence routing.
 */

export type EvidenceGrade = "A" | "B" | "C" | "D" | "E";

export const EVIDENCE_GRADE_RANK: Record<EvidenceGrade, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
};

/** Minimum confidence to promote without human review queue. */
export const EXTRACTION_CONFIDENCE_REVIEW_THRESHOLD = 70;

export function isEvidenceGrade(value: string): value is EvidenceGrade {
  return value === "A" || value === "B" || value === "C" || value === "D" || value === "E";
}

export function gradeMeetsMinimum(
  grade: EvidenceGrade | null | undefined,
  minimum: EvidenceGrade
): boolean {
  if (!grade) return false;
  return EVIDENCE_GRADE_RANK[grade] <= EVIDENCE_GRADE_RANK[minimum];
}

/** E is competitive awareness only; never cited as evidence by Hannah. */
export function mayCiteAsEvidence(grade: EvidenceGrade | null | undefined): boolean {
  return Boolean(grade && grade !== "E");
}

export function needsHumanReview(confidence: number | null | undefined): boolean {
  if (confidence === null || confidence === undefined) return true;
  return confidence < EXTRACTION_CONFIDENCE_REVIEW_THRESHOLD;
}

/**
 * Map study_type strings to default grade when curator has not overridden.
 * UNKNOWN / unparseable returns null (never fabricated).
 */
export function defaultGradeForStudyType(
  studyType: string | null | undefined
): EvidenceGrade | null {
  if (!studyType) return null;
  const t = studyType.toLowerCase();
  if (t === "meta_analysis" || t === "systematic_review") return "A";
  if (t === "rct") return "B";
  if (t === "cohort" || t === "case_control") return "C";
  if (t === "animal" || t === "in_vitro") return "D";
  if (t === "review") return "C";
  return null;
}
