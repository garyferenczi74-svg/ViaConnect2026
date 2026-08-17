/**
 * Prompt 221A: Jeffery review layer types.
 * Managerial layer ON TOP of Marshall and Lex. Fail-closed for hard-block classes.
 */

export const JEFFERY_ARTIFACT_TYPES = [
  "kb_promotion",
  "synthesis",
  "agent_digest_compile",
  "completion_report",
  "config_change",
  "agent_kpi_pass",
] as const;

export type JefferyArtifactType = (typeof JEFFERY_ARTIFACT_TYPES)[number];

export type JefferyVerdict = "approved" | "rejected" | "needs_human";

export type JefferyReviewerMode =
  | "programmatic"
  | "ai_assisted"
  | "gary_escalation";

export type ReviewCheckResult = "pass" | "fail" | "warn";

export interface ReviewCheck {
  name: string;
  result: ReviewCheckResult;
  detail: string;
}

export interface JefferyReviewInput {
  artifactType: JefferyArtifactType;
  artifactRef: string;
  checks: ReviewCheck[];
  /** Agent that produced the artifact (for no-self-review). */
  producedByAgent?: string | null;
  reviewerMode?: JefferyReviewerMode;
  handlerVersion?: string;
  rationaleSummary?: string | null;
}

export interface JefferyReviewOutcome {
  verdict: JefferyVerdict;
  checks: ReviewCheck[];
  reviewerMode: JefferyReviewerMode;
  hardBlock: boolean;
  reasonCodes: string[];
}

/** Hard-block classes: cannot ship downstream without Jeffery approved. */
export const HARD_BLOCK_ARTIFACT_TYPES: readonly JefferyArtifactType[] = [
  "kb_promotion",
  "synthesis",
  "completion_report",
  "config_change",
] as const;

/**
 * Advisory-plus: first failure flags ACC; second consecutive hard-blocks.
 * Digests/compiles still publish once so users keep daily surfaces.
 */
export const ADVISORY_PLUS_ARTIFACT_TYPES: readonly JefferyArtifactType[] = [
  "agent_digest_compile",
] as const;

/** Always needs_human: Gary decisions; Jeffery packages only. */
export const ALWAYS_NEEDS_HUMAN_TYPES: readonly JefferyArtifactType[] = [
  "config_change",
] as const;

export const JEFFERY_REVIEW_HANDLER_VERSION = "221a.1";

/** SLA targets (minutes) for ACC clocks. */
export const JEFFERY_REVIEW_SLA_MINUTES: Record<JefferyArtifactType, number> = {
  kb_promotion: 30,
  synthesis: 240,
  agent_digest_compile: 240,
  completion_report: 240,
  config_change: 240,
  agent_kpi_pass: 1440,
};
