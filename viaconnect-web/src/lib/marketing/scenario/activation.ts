/**
 * Activation gate validators for Sarah Scenario surfaces (Prompt #138d).
 *
 * Mirrors DB CHECK constraints from the migration. Same pattern as
 * #138a/#138c/#138e activation modules.
 */

import type {
  ScenarioPersonaRow,
  ScenarioCategoryRow,
  ScenarioCopyBlockRow,
} from "./types";

export interface ActivationResult {
  ok: boolean;
  reasons: string[];
}

function gateThree(
  row: { marshall_precheck_passed: boolean; steve_approval_at: string | null; archived: boolean },
): ActivationResult {
  const reasons: string[] = [];
  if (!row.marshall_precheck_passed) reasons.push("Marshall pre-check has not passed.");
  if (!row.steve_approval_at) reasons.push("Steve approval is missing.");
  if (row.archived) reasons.push("Row is archived.");
  return { ok: reasons.length === 0, reasons };
}

export function canActivatePersona(
  row: Pick<ScenarioPersonaRow, "marshall_precheck_passed" | "steve_approval_at" | "archived">,
): ActivationResult {
  return gateThree(row);
}

export function canActivateCategory(
  row: Pick<ScenarioCategoryRow, "marshall_precheck_passed" | "steve_approval_at" | "archived">,
): ActivationResult {
  return gateThree(row);
}

export function canActivateCopyBlock(
  row: Pick<ScenarioCopyBlockRow, "marshall_precheck_passed" | "steve_approval_at" | "archived">,
): ActivationResult {
  return gateThree(row);
}
