/**
 * Prompt 221A: verdict derivation (fail-closed for hard-block classes).
 * No self-review approvals. Config always needs_human.
 */

import {
  ALWAYS_NEEDS_HUMAN_TYPES,
  ADVISORY_PLUS_ARTIFACT_TYPES,
  HARD_BLOCK_ARTIFACT_TYPES,
  JEFFERY_REVIEW_HANDLER_VERSION,
  type JefferyArtifactType,
  type JefferyReviewInput,
  type JefferyReviewOutcome,
  type JefferyReviewerMode,
  type JefferyVerdict,
  type ReviewCheck,
} from "./types";

function failedChecks(checks: ReviewCheck[]): ReviewCheck[] {
  return checks.filter((c) => c.result === "fail");
}

function isHardBlock(artifactType: JefferyArtifactType): boolean {
  return (HARD_BLOCK_ARTIFACT_TYPES as readonly string[]).includes(artifactType);
}

function isAdvisoryPlus(artifactType: JefferyArtifactType): boolean {
  return (ADVISORY_PLUS_ARTIFACT_TYPES as readonly string[]).includes(
    artifactType
  );
}

function alwaysNeedsHuman(artifactType: JefferyArtifactType): boolean {
  return (ALWAYS_NEEDS_HUMAN_TYPES as readonly string[]).includes(artifactType);
}

/**
 * Derive verdict from checks + authority rules.
 * Never fails open into approval when checks fail or self-review.
 */
export function deriveJefferyVerdict(
  artifactType: JefferyArtifactType,
  checks: ReviewCheck[],
  opts?: {
    producedByAgent?: string | null;
    consecutiveCompileFailures?: number;
    forceGaryEscalation?: boolean;
  }
): JefferyReviewOutcome {
  const fails = failedChecks(checks);
  const reasonCodes = fails.map((f) => f.name);
  const producedBy = (opts?.producedByAgent ?? "").toLowerCase();

  // No self-review: Jeffery-produced work never self-approves
  if (producedBy === "jeffery") {
    return {
      verdict: "needs_human",
      checks,
      reviewerMode: "programmatic",
      hardBlock: true,
      reasonCodes: [...reasonCodes, "no_self_review"],
    };
  }

  if (opts?.forceGaryEscalation) {
    return {
      verdict: "needs_human",
      checks,
      reviewerMode: "gary_escalation",
      hardBlock: isHardBlock(artifactType),
      reasonCodes: [...reasonCodes, "gary_escalation"],
    };
  }

  // Config / allowlist / budget: always package for Gary
  if (alwaysNeedsHuman(artifactType)) {
    return {
      verdict: "needs_human",
      checks,
      reviewerMode: "programmatic",
      hardBlock: true,
      reasonCodes:
        fails.length > 0
          ? reasonCodes
          : ["gary_decision_required"],
    };
  }

  // Advisory-plus digests/compiles
  if (isAdvisoryPlus(artifactType)) {
    const consecutive = opts?.consecutiveCompileFailures ?? 0;
    if (fails.length === 0) {
      return {
        verdict: "approved",
        checks,
        reviewerMode: "programmatic",
        hardBlock: false,
        reasonCodes: [],
      };
    }
    // First failure: warn path (caller still publishes once); second hard-blocks
    if (consecutive >= 2) {
      return {
        verdict: "rejected",
        checks,
        reviewerMode: "programmatic",
        hardBlock: true,
        reasonCodes: [...reasonCodes, "consecutive_compile_failures"],
      };
    }
    return {
      verdict: "needs_human",
      checks,
      reviewerMode: "programmatic",
      hardBlock: false,
      reasonCodes: [...reasonCodes, "advisory_flag_publish_once"],
    };
  }

  // Hard-block classes: any fail => rejected or needs_human (completion reports)
  if (isHardBlock(artifactType)) {
    if (fails.length === 0) {
      return {
        verdict: "approved",
        checks,
        reviewerMode: "programmatic",
        hardBlock: true,
        reasonCodes: [],
      };
    }
    if (artifactType === "completion_report") {
      return {
        verdict: "needs_human",
        checks,
        reviewerMode: "programmatic",
        hardBlock: true,
        reasonCodes,
      };
    }
    return {
      verdict: "rejected",
      checks,
      reviewerMode: "programmatic",
      hardBlock: true,
      reasonCodes,
    };
  }

  // agent_kpi_pass: breaches => needs_human ACC findings
  if (fails.length === 0) {
    return {
      verdict: "approved",
      checks,
      reviewerMode: "programmatic",
      hardBlock: false,
      reasonCodes: [],
    };
  }
  return {
    verdict: "needs_human",
    checks,
    reviewerMode: "programmatic",
    hardBlock: false,
    reasonCodes,
  };
}

export function buildReviewRecord(
  input: JefferyReviewInput,
  outcome: JefferyReviewOutcome
): {
  artifactType: JefferyArtifactType;
  artifactRef: string;
  reviewChecks: ReviewCheck[];
  verdict: JefferyVerdict;
  reviewerMode: JefferyReviewerMode;
  handlerVersion: string;
  rationaleSummary: string;
  producedByAgent: string | null;
} {
  return {
    artifactType: input.artifactType,
    artifactRef: input.artifactRef,
    reviewChecks: outcome.checks,
    verdict: outcome.verdict,
    reviewerMode: input.reviewerMode ?? outcome.reviewerMode,
    handlerVersion: input.handlerVersion ?? JEFFERY_REVIEW_HANDLER_VERSION,
    rationaleSummary:
      input.rationaleSummary ??
      (outcome.reasonCodes.length
        ? `checks failed: ${outcome.reasonCodes.join(", ")}`
        : "all programmatic checks passed"),
    producedByAgent: input.producedByAgent ?? null,
  };
}

/**
 * Retrievability for KB items: Marshall/Lex gate AND Jeffery approved.
 * Fail-closed: anything else is not consumer-eligible.
 */
export function isKbItemRetrievable(opts: {
  gateStatus: string;
  jefferyVerdict: string | null | undefined;
}): boolean {
  const gateOk =
    opts.gateStatus === "approved" || opts.gateStatus === "lex_approved";
  return gateOk && opts.jefferyVerdict === "approved";
}

/**
 * Sequence helper for C3: Marshall -> Lex -> Jeffery.
 */
export function c3SequenceComplete(opts: {
  marshallGateStatus: string;
  hasLexDecision: boolean;
  jefferyVerdict: string | null | undefined;
}): { complete: boolean; missing: string[] } {
  const missing: string[] = [];
  if (opts.marshallGateStatus !== "lex_approved") {
    missing.push("marshall_lex_approved_gate");
  }
  if (!opts.hasLexDecision) missing.push("lex_decision");
  if (opts.jefferyVerdict !== "approved") missing.push("jeffery_approved");
  return { complete: missing.length === 0, missing };
}
