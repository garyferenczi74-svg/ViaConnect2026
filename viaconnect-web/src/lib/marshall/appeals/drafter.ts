/**
 * Rebuttal drafter (Prompt #123 §6).
 *
 * Pipeline: select template -> deterministic slot fill -> (optional Anthropic
 * augmentation, deferred) -> self-check -> persist appeal_drafts row.
 *
 * Foundation phase: NO Anthropic API call; augmentation_used always false.
 * Phase 2 will add the bounded augmentation layer per spec section 6.4 with
 * prompt-injection defense and JSON-schema validation.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { selectTemplate, fillTemplate, AUGMENTATION_ENABLED, type SlotValues } from "./templates";
import { selfCheckDraft } from "./selfCheck";
import { logAppealEvent } from "./logging";
import type {
  AppealAnalysisRow,
  AppealDraftRow,
  AppealRecommendation,
  AppealClaimType,
  RebuttalTemplateRow,
} from "./types";
import { SELF_CHECK_RECURSION_CAP } from "./types";

export interface DrafterInput {
  appeal_id: string;
  analysis: Pick<AppealAnalysisRow, "id" | "recommendation" | "drift_report"> & {
    recommendation: AppealRecommendation;
    claim_type: AppealClaimType;
  };
  jurisdiction: string;
  language: string;
  slot_values: SlotValues;
}

export interface DrafterResult {
  ok: boolean;
  draft_id?: string;
  draft_text?: string;
  template?: RebuttalTemplateRow;
  self_check_passed?: boolean;
  self_check_findings?: Array<{ ruleId: string; severity: string; message: string }>;
  error?: string;
}

export async function generateDraft(
  client: SupabaseClient,
  input: DrafterInput,
): Promise<DrafterResult> {
  const template = await selectTemplate(client, {
    disposition: input.analysis.recommendation,
    claim_type: input.analysis.claim_type,
    jurisdiction: input.jurisdiction,
    language: input.language,
  });
  if (!template) {
    return { ok: false, error: "no_active_template_for_disposition" };
  }

  const filled = fillTemplate(template, input.slot_values);
  if (filled.unfilledSlots.length > 0) {
    return {
      ok: false,
      error: `unfilled_required_slots: ${filled.unfilledSlots.join(", ")}`,
    };
  }

  // Self-check loop. Augmentation layer is deferred; only one pass needed in
  // Phase 1 because there is no augmenter to strip and retry against.
  let draftText = filled.text;
  let augmentationUsed = false;
  let selfCheck = await selfCheckDraft(draftText);
  let attempts = 1;

  while (!selfCheck.passed && AUGMENTATION_ENABLED && attempts < SELF_CHECK_RECURSION_CAP) {
    // Phase 2 augmentation layer plugs in here. For Phase 1 the loop body
    // never runs because AUGMENTATION_ENABLED is false; left in place to
    // make the recursion-cap contract explicit.
    augmentationUsed = false;
    draftText = filled.text;
    selfCheck = await selfCheckDraft(draftText);
    attempts += 1;
  }

  // Find the next version for this appeal.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (client as any)
    .from("appeal_drafts")
    .select("version")
    .eq("appeal_id", input.appeal_id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersion = ((existing?.version as number | undefined) ?? 0) + 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from("appeal_drafts")
    .insert({
      appeal_id: input.appeal_id,
      analysis_id: input.analysis.id,
      template_id: template.id,
      template_version: template.version,
      version: nextVersion,
      draft_text: draftText,
      augmentation_used: augmentationUsed,
      self_check_passed: selfCheck.passed,
      self_check_findings: selfCheck.findings.length > 0 ? selfCheck.findings : null,
      generated_by: "marshall_drafter",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "draft_insert_failed" };
  }

  logAppealEvent({
    event: selfCheck.passed ? "draft_generated" : "draft_self_check_failed",
    appeal_id: input.appeal_id,
    analysis_id: input.analysis.id,
    draft_id: data.id,
    template_code: template.template_code,
    self_check_passed: selfCheck.passed,
    self_check_finding_count: selfCheck.findings.length,
  });

  return {
    ok: true,
    draft_id: data.id,
    draft_text: draftText,
    template,
    self_check_passed: selfCheck.passed,
    self_check_findings: selfCheck.findings,
  };
}
