// Prompt #127 P4: HIPAA legal-counsel notification hook.
//
// When a breach determination flips to `breach_confirmed`, HIPAA
// notification obligations kick in (45 CFR 164.400 series). Legal counsel
// must be notified within 24 hours of assessment completion per the
// #127 decision memo.
//
// Current channel (approved per decision memo, option a):
//   - Write a hipaa_breach_confirmed event to compliance_audit_log.
//   - The admin overview surfaces the red banner at /admin/frameworks/hipaa.
//   - Steve escalates manually to legal counsel via the standing channel.
//
// Future channel (P-latest or operational): replace this module with an
// approved webhook call. The function signature stays stable; only the
// body changes.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface BreachConfirmedNotificationInput {
  supabase: SupabaseClient;
  breachDeterminationId: string;
  incidentId: string;
  individualsAffectedCount: number | null;
  assessedBy: string;
  rationaleSummary: string;
}

export interface BreachConfirmedNotificationResult {
  ok: boolean;
  auditLogId?: string | number;
  error?: string;
}

/**
 * Fire the legal-notification hook for a confirmed breach. Non-throwing:
 * caller cannot block the write of the breach determination row on a
 * notification failure; we surface the failure via the return value so
 * the UI can render a red "notification delivery failed, escalate
 * manually" banner if needed.
 */
export async function notifyLegalOfConfirmedBreach(
  input: BreachConfirmedNotificationInput,
): Promise<BreachConfirmedNotificationResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = input.supabase as any;
  const { data, error } = await sb
    .from('compliance_audit_log')
    .insert({
      event_type: 'hipaa_breach_confirmed',
      actor_type: 'system',
      actor_id: null,
      payload: {
        breach_determination_id: input.breachDeterminationId,
        incident_id: input.incidentId,
        individuals_affected_count: input.individualsAffectedCount,
        assessed_by: input.assessedBy,
        rationale_summary: input.rationaleSummary.slice(0, 500),
        notification_required_within: '24 hours per 45 CFR 164.400 series',
        next_steps: [
          'Escalate to legal counsel (Thomas Rosengren) within 24 hours',
          'Prepare individual notifications per 45 CFR 164.404',
          'Prepare OCR notification per 45 CFR 164.408',
          'Prepare media notification if 500+ individuals per 45 CFR 164.406',
        ],
      },
    })
    .select('id')
    .single();

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[hipaa legal-notifier] audit_log insert failed', {
      breachDeterminationId: input.breachDeterminationId,
      message: error.message,
    });
    return { ok: false, error: error.message };
  }

  const row = data as { id: string | number } | null;
  // eslint-disable-next-line no-console
  console.warn('[hipaa legal-notifier] breach_confirmed notification logged', {
    auditLogId: row?.id,
    breachDeterminationId: input.breachDeterminationId,
  });
  return { ok: true, auditLogId: row?.id };
}
