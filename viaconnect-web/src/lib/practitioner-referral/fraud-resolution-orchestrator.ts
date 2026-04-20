// Prompt #98 Phase 6: Fraud-resolution DB orchestrator.
//
// Wraps the pure evaluateFraudResolution + buildClawbackLedgerDelta
// and performs the atomic side effects the decision requires:
//   - update the flag status + admin_actor + review_notes
//   - void the linked milestone event (when confirm_fraud + linked)
//   - write an immutable 'voided_fraud' ledger entry (when event
//     was already vested)
//   - void the attribution + deactivate the referrer's code on
//     systemic confirmation (3+ cumulative flags)
//
// All DB writes happen in sequence; the compliance-review immutability
// trigger still applies to the referral credit ledger so corrections
// to a ledger entry happen via new rows, not updates.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  evaluateFraudResolution,
  buildClawbackLedgerDelta,
  type AdminAction,
  type ResolutionDecision,
} from './fraud-resolution';

interface Deps {
  supabase: SupabaseClient | unknown;
  admin_actor_id: string;
}

export interface ResolveFraudFlagInput {
  flag_id: string;
  action: AdminAction;
  reason: string;
}

export interface ResolveFraudFlagResult {
  ok: boolean;
  decision?: ResolutionDecision;
  error?: string;
}

export async function resolveFraudFlag(
  input: ResolveFraudFlagInput,
  deps: Deps,
): Promise<ResolveFraudFlagResult> {
  const sb = deps.supabase as any;

  const { data: flag } = await sb
    .from('practitioner_referral_fraud_flags')
    .select('id, status, attribution_id, milestone_event_id, practitioner_id, referral_code_id')
    .eq('id', input.flag_id)
    .maybeSingle();
  if (!flag) return { ok: false, error: 'Flag not found' };
  if (flag.status !== 'pending_review') {
    return { ok: false, error: `Flag is in status ${flag.status}; only pending_review can be resolved` };
  }

  // Load the linked milestone event (if any) to determine vested state.
  let eventVestingStatus: 'pending_hold' | 'vested' | 'voided_fraud' | 'voided_admin' = 'pending_hold';
  let eventVestedAmountCents = 0;
  if (flag.milestone_event_id) {
    const { data: event } = await sb
      .from('practitioner_referral_milestone_events')
      .select(`
        id, vesting_status,
        practitioner_referral_attributions!inner ( referring_practitioner_id ),
        practitioner_referral_milestones!inner ( reward_amount_cents )
      `)
      .eq('id', flag.milestone_event_id)
      .maybeSingle();
    if (event) {
      eventVestingStatus = event.vesting_status;
      if (event.vesting_status === 'vested') {
        eventVestedAmountCents = event.practitioner_referral_milestones.reward_amount_cents;
      }
    }
  }

  // Count existing confirmed_fraud flags on the same attribution to
  // determine if this confirmation tips the attribution into systemic.
  let attributionFlagCount = 1;    // including this one
  if (flag.attribution_id) {
    const { count } = await sb
      .from('practitioner_referral_fraud_flags')
      .select('id', { count: 'exact', head: true })
      .eq('attribution_id', flag.attribution_id)
      .eq('status', 'confirmed_fraud');
    attributionFlagCount = (count ?? 0) + 1;
  }

  const decision = evaluateFraudResolution({
    admin_action: input.action,
    reason: input.reason,
    flag_has_milestone_event_link: !!flag.milestone_event_id,
    milestone_event_vested: eventVestedAmountCents > 0,
    milestone_event_vesting_status: eventVestingStatus,
    attribution_fraud_flag_count_including_this: attributionFlagCount,
  });

  if (!decision.ok) {
    return { ok: false, decision, error: decision.reason_invalid ? 'Reason does not meet length requirement' : 'Action not permitted' };
  }

  const nowIso = new Date().toISOString();

  // 1. Mark the flag resolved.
  await sb
    .from('practitioner_referral_fraud_flags')
    .update({
      status: decision.next_flag_status!,
      reviewed_at: nowIso,
      reviewed_by: deps.admin_actor_id,
      review_notes: input.reason,
      updated_at: nowIso,
    })
    .eq('id', input.flag_id);

  // 2. Void the linked milestone event, if applicable.
  if (decision.void_milestone_event && flag.milestone_event_id) {
    await sb
      .from('practitioner_referral_milestone_events')
      .update({
        vesting_status: 'voided_fraud',
        voided_at: nowIso,
        voided_reason: `Fraud confirmed by admin: ${input.reason}`,
        updated_at: nowIso,
      })
      .eq('id', flag.milestone_event_id);
  }

  // 3. Write a clawback ledger entry when the event was already vested.
  if (decision.clawback_ledger_entry && flag.milestone_event_id && eventVestedAmountCents > 0) {
    const delta = buildClawbackLedgerDelta({ vested_amount_cents: eventVestedAmountCents });
    if (delta.amount_cents !== 0) {
      // Load practitioner_id from the vested event for the ledger row.
      const { data: event } = await sb
        .from('practitioner_referral_milestone_events')
        .select('practitioner_referral_attributions!inner ( referring_practitioner_id )')
        .eq('id', flag.milestone_event_id)
        .maybeSingle();
      const referringId = event?.practitioner_referral_attributions?.referring_practitioner_id;

      if (referringId) {
        const { data: balance } = await sb
          .from('practitioner_referral_credit_balances')
          .select('current_balance_cents')
          .eq('practitioner_id', referringId)
          .maybeSingle();
        const runningBalance = (balance?.current_balance_cents ?? 0) + delta.amount_cents;

        await sb.from('practitioner_referral_credit_ledger').insert({
          practitioner_id: referringId,
          entry_type: delta.entry_type,
          amount_cents: delta.amount_cents,
          running_balance_cents: runningBalance,
          milestone_event_id: flag.milestone_event_id,
          admin_actor_id: deps.admin_actor_id,
          admin_reason: `Clawback: ${input.reason}`,
          notes: `Fraud clawback for milestone event ${flag.milestone_event_id}`,
        });
      }
    }
  }

  // 4. Systemic fraud escalation.
  if (decision.void_attribution && flag.attribution_id) {
    await sb
      .from('practitioner_referral_attributions')
      .update({
        status: 'blocked_fraud_suspected',
        voided_at: nowIso,
        voided_by: deps.admin_actor_id,
        voided_reason: `Systemic fraud confirmed: ${input.reason}`,
        updated_at: nowIso,
      })
      .eq('id', flag.attribution_id);
  }
  if (decision.deactivate_code && flag.practitioner_id) {
    // Referrer's code deactivated; existing attributions are left alone.
    await sb
      .from('practitioner_referral_codes')
      .update({
        is_active: false,
        deactivated_reason: `Systemic fraud: ${input.reason}`,
        deactivated_at: nowIso,
        deactivated_by: deps.admin_actor_id,
        updated_at: nowIso,
      })
      .eq('practitioner_id', flag.practitioner_id);
  }

  return { ok: true, decision };
}
