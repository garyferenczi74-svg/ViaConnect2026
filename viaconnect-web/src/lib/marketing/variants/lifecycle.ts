/**
 * Variant lifecycle state machine (Prompt #138a §5.2).
 *
 * Pure-function transitions over the marketing_copy_variants row shape.
 * The DB-side activation invariant (CHECK constraint) is the source of
 * truth; this module mirrors it client-side so the admin UI can disable
 * inapplicable actions without round-tripping.
 *
 * Lifecycle stages:
 *   draft           — created, not yet word-count validated
 *   word_validated  — passed §5.2 step 2 (≤12 / ≤32 words)
 *   precheck_clean  — Marshall pre-check returned passed=true
 *   approved        — Steve has approved (timestamp + identity recorded)
 *   active          — active_in_test = true (visible to visitors)
 *   archived        — archived = true (kept for evidence, never deleted)
 */

import type { MarketingCopyVariantRow } from "./types";

export type VariantStage =
  | "draft"
  | "word_validated"
  | "precheck_clean"
  | "approved"
  | "active"
  | "archived";

export function deriveStage(row: Pick<
  MarketingCopyVariantRow,
  "word_count_validated" | "marshall_precheck_passed" | "steve_approval_at" | "active_in_test" | "archived"
>): VariantStage {
  if (row.archived) return "archived";
  if (row.active_in_test) return "active";
  if (row.steve_approval_at) return "approved";
  if (row.marshall_precheck_passed) return "precheck_clean";
  if (row.word_count_validated) return "word_validated";
  return "draft";
}

export interface VariantActions {
  canValidateWordCount: boolean;
  canRunPreCheck: boolean;
  canRequestApproval: boolean;
  canApprove: boolean;
  canRevoke: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
  canArchive: boolean;
  canRestore: boolean;
}

/**
 * What buttons should be enabled in the admin UI for this row + actor.
 * The actor's role is supplied separately because Steve's approve/revoke
 * actions are gated to compliance_admin / superadmin per #138a §7.6, not
 * to marketing_admin who can draft and validate but cannot approve.
 */
export function deriveActions(
  row: Pick<
    MarketingCopyVariantRow,
    "word_count_validated" | "marshall_precheck_passed" | "steve_approval_at" | "active_in_test" | "archived"
  >,
  actorRole: "marketing_admin" | "admin" | "superadmin" | "compliance_admin",
): VariantActions {
  const stage = deriveStage(row);
  const isComplianceLevel = actorRole === "compliance_admin" || actorRole === "superadmin";

  if (stage === "archived") {
    return {
      canValidateWordCount: false,
      canRunPreCheck: false,
      canRequestApproval: false,
      canApprove: false,
      canRevoke: false,
      canActivate: false,
      canDeactivate: false,
      canArchive: false,
      canRestore: true,
    };
  }

  if (stage === "active") {
    return {
      canValidateWordCount: false,
      canRunPreCheck: false,
      canRequestApproval: false,
      canApprove: false,
      canRevoke: isComplianceLevel,
      canActivate: false,
      canDeactivate: true,
      canArchive: false,
      canRestore: false,
    };
  }

  if (stage === "approved") {
    return {
      canValidateWordCount: false,
      canRunPreCheck: false,
      canRequestApproval: false,
      canApprove: false,
      canRevoke: isComplianceLevel,
      canActivate: true,
      canDeactivate: false,
      canArchive: true,
      canRestore: false,
    };
  }

  if (stage === "precheck_clean") {
    return {
      canValidateWordCount: false,
      canRunPreCheck: true, // re-run allowed
      canRequestApproval: true,
      canApprove: isComplianceLevel,
      canRevoke: false,
      canActivate: false,
      canDeactivate: false,
      canArchive: true,
      canRestore: false,
    };
  }

  if (stage === "word_validated") {
    return {
      canValidateWordCount: true, // re-run allowed
      canRunPreCheck: true,
      canRequestApproval: false,
      canApprove: false,
      canRevoke: false,
      canActivate: false,
      canDeactivate: false,
      canArchive: true,
      canRestore: false,
    };
  }

  // draft
  return {
    canValidateWordCount: true,
    canRunPreCheck: false,
    canRequestApproval: false,
    canApprove: false,
    canRevoke: false,
    canActivate: false,
    canDeactivate: false,
    canArchive: true,
    canRestore: false,
  };
}

/**
 * Returns the human-readable stage label used in the admin badges.
 */
export function stageLabel(stage: VariantStage): string {
  switch (stage) {
    case "draft": return "Draft";
    case "word_validated": return "Word count validated";
    case "precheck_clean": return "Pre-check clean";
    case "approved": return "Approved";
    case "active": return "Active in test";
    case "archived": return "Archived";
  }
}

/**
 * Mirror of the DB CHECK constraint — used in the admin UI to fail-fast
 * before issuing an UPDATE that would be rejected at the database layer.
 */
export function canActivateClientSide(row: Pick<
  MarketingCopyVariantRow,
  "word_count_validated" | "marshall_precheck_passed" | "steve_approval_at" | "archived"
>): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (row.archived) reasons.push("Variant is archived; restore before activating.");
  if (!row.word_count_validated) reasons.push("Word-count validation not passed.");
  if (!row.marshall_precheck_passed) reasons.push("Marshall pre-check not cleared.");
  if (!row.steve_approval_at) reasons.push("Steve approval not on file.");
  return { ok: reasons.length === 0, reasons };
}
