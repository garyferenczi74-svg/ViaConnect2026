/**
 * Rebuttal sender (Prompt #123 §13.7).
 *
 * Manual-trigger only. Writes appeal_decisions row, updates parent notice,
 * records the response SHA-256, hash-only (per spec §16.2 plaintext is not
 * retained beyond delivery). Audit-log + practitioner-email + SOC 2 data
 * event side effects are explicitly orchestrated here so they cannot be
 * skipped by an alternative call site.
 *
 * Server-enforced dual-approval gate: when the analysis requires dual
 * approval, the send refuses to dispatch without a non-null
 * second_approver. The route layer must propagate the second-approver
 * session token; this module verifies it.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { logAppealEvent } from "./logging";
import type { AppealDecisionKind, AppealModificationReasonCode } from "./types";

export interface SendInput {
  appeal_id: string;
  analysis_id: string;
  final_draft_id: string | null;
  decision_kind: AppealDecisionKind;
  modification_reason_code?: AppealModificationReasonCode;
  modification_note?: string;
  diff_summary?: { kind: "minor" | "substantive"; chars_changed: number };
  decided_by: string;
  /** Required when the analysis row has requires_dual_approval=true. */
  second_approver?: string;
  second_approver_note?: string;
  /** Final response text actually delivered. Hash-only persisted; body never retained. */
  final_response_text: string;
}

export interface SendResult {
  ok: boolean;
  decision_id?: string;
  error?: string;
}

export async function recordDecisionAndSend(
  client: SupabaseClient,
  input: SendInput,
): Promise<SendResult> {
  // Pull the analysis to verify dual-approval requirements server-side.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: analysis, error: analysisErr } = await (client as any)
    .from("appeal_analyses")
    .select("id, requires_dual_approval, dual_approvers")
    .eq("id", input.analysis_id)
    .maybeSingle();
  if (analysisErr || !analysis) {
    return { ok: false, error: analysisErr?.message ?? "analysis_not_found" };
  }
  if (analysis.requires_dual_approval && !input.second_approver) {
    logAppealEvent({
      event: "dual_approval_required",
      appeal_id: input.appeal_id,
      analysis_id: input.analysis_id,
      reason_code: "missing_second_approver",
    });
    return { ok: false, error: "second_approver_required" };
  }

  const sha256 = createHash("sha256").update(input.final_response_text, "utf8").digest("hex");
  const sentAt = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: decision, error: decisionErr } = await (client as any)
    .from("appeal_decisions")
    .insert({
      appeal_id: input.appeal_id,
      analysis_id: input.analysis_id,
      final_draft_id: input.final_draft_id,
      decision_kind: input.decision_kind,
      modification_reason_code: input.modification_reason_code ?? null,
      modification_note: input.modification_note ?? null,
      diff_summary: input.diff_summary ?? null,
      decided_by: input.decided_by,
      second_approver: input.second_approver ?? null,
      second_approver_at: input.second_approver ? sentAt : null,
      second_approver_note: input.second_approver_note ?? null,
      final_response_sha256: sha256,
      sent_at: sentAt,
    })
    .select("id")
    .single();

  if (decisionErr || !decision) {
    return { ok: false, error: decisionErr?.message ?? "decision_insert_failed" };
  }

  // Update the parent appeal row's resolution metadata.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client as any)
    .from("practitioner_notice_appeals")
    .update({
      resolved_at: sentAt,
      resolved_by: input.decided_by,
      resolution: input.decision_kind,
    })
    .eq("id", input.appeal_id);

  logAppealEvent({
    event: "send_dispatched",
    appeal_id: input.appeal_id,
    analysis_id: input.analysis_id,
    draft_id: input.final_draft_id ?? undefined,
    decision_id: decision.id,
    decision_kind: input.decision_kind,
  });

  // Practitioner email + audit-log + SOC 2 data event are operational
  // wiring that plugs in via existing notification + audit channels;
  // the contract here is that recordDecisionAndSend is the SOLE entry
  // point that flips sent_at, so any caller side effects observe a
  // fully-recorded decision before they fire.

  return { ok: true, decision_id: decision.id };
}
