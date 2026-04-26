/**
 * PII-safe logger for the appeal pipeline (Prompt #123 §13.10 + §16.2).
 *
 * Plaintext rebuttal bodies NEVER enter application logs. Only opaque
 * identifiers and enum values are logged. Helper to ensure the rule is
 * followed by every site that emits a log line.
 */

export interface AppealLogPayload {
  event:
    | "analyze_started"
    | "analyze_completed"
    | "draft_generated"
    | "draft_self_check_failed"
    | "decision_recorded"
    | "send_dispatched"
    | "dual_approval_required"
    | "dual_approval_received";
  appeal_id: string;
  analysis_id?: string;
  draft_id?: string;
  decision_id?: string;
  recommendation?: string;
  decision_kind?: string;
  template_code?: string;
  self_check_passed?: boolean;
  self_check_finding_count?: number;
  /** Free-form code, never plaintext. */
  reason_code?: string;
}

export function logAppealEvent(payload: AppealLogPayload): void {
  // Console.log is the runtime sink; structured logging plumbing replaces
  // this in production environments. The contract is the same: enums and
  // ids only, never plaintext draft body or rebuttal text.
  // eslint-disable-next-line no-console
  console.log(`[marshall/appeals] ${JSON.stringify(payload)}`);
}
