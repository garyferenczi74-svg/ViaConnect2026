/**
 * Activation gate validators for outcome timeline surfaces (Prompt #138e).
 *
 * Mirrors the DB CHECK constraints from the migration so admin UI can
 * fail-fast before issuing UPDATEs. Same pattern as #138a/#138c.
 */

import type {
  OutcomePhaseRow,
  OutcomeQualifierRow,
  OutcomeCtaRow,
  OutcomeSectionBlockRow,
} from "./types";

export interface ActivationResult {
  ok: boolean;
  reasons: string[];
}

function gateThreeFields(
  row: { marshall_precheck_passed: boolean; steve_approval_at: string | null; archived: boolean },
): ActivationResult {
  const reasons: string[] = [];
  if (!row.marshall_precheck_passed) reasons.push("Marshall pre-check has not passed.");
  if (!row.steve_approval_at) reasons.push("Steve approval is missing.");
  if (row.archived) reasons.push("Row is archived.");
  return { ok: reasons.length === 0, reasons };
}

export function canActivatePhase(
  row: Pick<OutcomePhaseRow, "marshall_precheck_passed" | "steve_approval_at" | "archived">,
): ActivationResult {
  return gateThreeFields(row);
}

export function canActivateQualifier(
  row: Pick<OutcomeQualifierRow, "marshall_precheck_passed" | "steve_approval_at" | "archived">,
): ActivationResult {
  return gateThreeFields(row);
}

export function canActivateCta(
  row: Pick<OutcomeCtaRow, "marshall_precheck_passed" | "steve_approval_at" | "archived">,
): ActivationResult {
  return gateThreeFields(row);
}

export function canActivateSectionBlock(
  row: Pick<OutcomeSectionBlockRow, "marshall_precheck_passed" | "steve_approval_at" | "archived">,
): ActivationResult {
  return gateThreeFields(row);
}
