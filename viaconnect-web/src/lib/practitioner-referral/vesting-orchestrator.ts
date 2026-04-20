// Prompt #98 Phase 4: Vesting DB orchestrator.
//
// Processes pending_hold milestone events whose hold has expired:
//   vest         create immutable credit ledger entry (amount_cents from
//                the milestone definition; entry_type=earned_from_milestone;
//                tax_year=UTC year of vesting); flip event to 'vested' +
//                stamp credit_ledger_entry_id.
//   extend_hold  push hold_expires_at forward 7 days when a pending
//                fraud flag exists.
//   void_admin   flip event to 'voided_admin' when attribution is no
//                longer eligible.
//
// On vest the orchestrator also:
//   - upserts practitioner_referral_tax_earnings via the pure
//     applyEarningToTaxYear (handles the $600 1099 threshold).
//   - recomputes the referrer's status tier (tier-calculator).
//   - dispatches the appropriate notification (privacy-aware via
//     notification-router).
//
// Runs from the daily Edge Function tick OR from the admin
// vest-pending API route.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  evaluateVesting,
  HOLD_EXTENSION_DAYS_ON_FRAUD_FLAG,
} from './vesting-engine';
import { applyEarningToTaxYear, taxYearForDate, type TaxYearAggregate } from './tax-earnings';
import { calculateTierForCount, detectNewlyEarnedTier } from './tier-calculator';
import { routeNotification } from './notification-router';
import type { AttributionStatus } from './schema-types';

interface OrchestratorDeps {
  supabase: SupabaseClient | unknown;
}

export interface VestingPassResult {
  scanned: number;
  vested: number;
  extended_hold: number;
  voided: number;
  errors: number;
}

interface PendingEventRow {
  id: string;
  attribution_id: string;
  milestone_id: string;
  hold_expires_at: string;
  practitioner_referral_attributions: {
    referring_practitioner_id: string;
    referred_practitioner_id: string;
    status: AttributionStatus;
  };
  practitioner_referral_milestones: {
    reward_amount_cents: number;
    display_name: string;
  };
}

/**
 * Process every pending_hold event whose hold has expired in one
 * pass. Returns a summary; errors are logged via console.warn but do
 * not abort the loop.
 */
export async function processPendingVesting(
  now: Date,
  deps: OrchestratorDeps,
): Promise<VestingPassResult> {
  const sb = deps.supabase as any;
  const summary: VestingPassResult = { scanned: 0, vested: 0, extended_hold: 0, voided: 0, errors: 0 };

  const { data: events, error } = await sb
    .from('practitioner_referral_milestone_events')
    .select(`
      id, attribution_id, milestone_id, hold_expires_at,
      practitioner_referral_attributions!inner (
        referring_practitioner_id, referred_practitioner_id, status
      ),
      practitioner_referral_milestones!inner ( reward_amount_cents, display_name )
    `)
    .eq('vesting_status', 'pending_hold')
    .lte('hold_expires_at', now.toISOString())
    .limit(500);

  if (error) {
    console.warn('[wl-ref-vest] event scan failed', error.message);
    summary.errors++;
    return summary;
  }

  for (const event of (events ?? []) as PendingEventRow[]) {
    summary.scanned++;
    try {
      // Pending fraud flags relevant to this event or attribution.
      const { data: flags } = await sb
        .from('practitioner_referral_fraud_flags')
        .select('id, severity')
        .eq('status', 'pending_review')
        .or(`milestone_event_id.eq.${event.id},attribution_id.eq.${event.attribution_id}`);
      const flagsArr = (flags ?? []) as Array<{ severity: string }>;
      const blocking = flagsArr.filter((f) => f.severity === 'blocking' || f.severity === 'high').length;
      const nonBlocking = flagsArr.length - blocking;

      const decision = evaluateVesting({
        now,
        hold_expires_at: event.hold_expires_at,
        attribution_status: event.practitioner_referral_attributions.status,
        pending_blocking_fraud_flags: blocking,
        pending_non_blocking_fraud_flags: nonBlocking,
      });

      if (decision.outcome === 'hold_active') {
        // Should not happen given the SQL filter; defensive skip.
        continue;
      }

      if (decision.outcome === 'extend_hold') {
        const next = new Date(now);
        next.setUTCDate(next.getUTCDate() + (decision.extension_days ?? HOLD_EXTENSION_DAYS_ON_FRAUD_FLAG));
        await sb
          .from('practitioner_referral_milestone_events')
          .update({ hold_expires_at: next.toISOString(), updated_at: now.toISOString() })
          .eq('id', event.id);
        summary.extended_hold++;
        continue;
      }

      if (decision.outcome === 'void_admin') {
        await sb
          .from('practitioner_referral_milestone_events')
          .update({
            vesting_status: 'voided_admin',
            voided_at: now.toISOString(),
            voided_reason: decision.reason ?? 'attribution no longer eligible',
            updated_at: now.toISOString(),
          })
          .eq('id', event.id);
        summary.voided++;
        continue;
      }

      // outcome === 'vest' — create immutable ledger entry.
      const taxYear = taxYearForDate(now);
      const referringId = event.practitioner_referral_attributions.referring_practitioner_id;
      const amountCents = event.practitioner_referral_milestones.reward_amount_cents;

      const { data: ledger, error: ledgerErr } = await sb
        .from('practitioner_referral_credit_ledger')
        .insert({
          practitioner_id: referringId,
          entry_type: 'earned_from_milestone',
          amount_cents: amountCents,
          running_balance_cents: 0,    // trigger recomputes
          milestone_event_id: event.id,
          tax_year: taxYear,
          notes: `${event.practitioner_referral_milestones.display_name} vested`,
        })
        .select('id')
        .maybeSingle();

      if (ledgerErr || !ledger?.id) {
        console.warn('[wl-ref-vest] ledger insert failed for event', event.id, ledgerErr?.message);
        summary.errors++;
        continue;
      }

      await sb
        .from('practitioner_referral_milestone_events')
        .update({
          vesting_status: 'vested',
          vested_at: now.toISOString(),
          credit_ledger_entry_id: ledger.id,
          updated_at: now.toISOString(),
        })
        .eq('id', event.id);

      summary.vested++;

      // Tax earnings aggregate.
      try {
        const { data: priorTax } = await sb
          .from('practitioner_referral_tax_earnings')
          .select('total_earned_cents, crossed_600_threshold, crossed_600_threshold_at, form_1099_required')
          .eq('practitioner_id', referringId)
          .eq('tax_year', taxYear)
          .maybeSingle();
        const prior: TaxYearAggregate = {
          tax_year: taxYear,
          total_earned_cents: priorTax?.total_earned_cents ?? 0,
          crossed_600_threshold: priorTax?.crossed_600_threshold ?? false,
          crossed_600_threshold_at: priorTax?.crossed_600_threshold_at ?? null,
          form_1099_required: priorTax?.form_1099_required ?? false,
        };
        const next = applyEarningToTaxYear(prior, amountCents, now);
        await sb
          .from('practitioner_referral_tax_earnings')
          .upsert({
            practitioner_id: referringId,
            tax_year: taxYear,
            total_earned_cents: next.total_earned_cents,
            crossed_600_threshold: next.crossed_600_threshold,
            crossed_600_threshold_at: next.crossed_600_threshold_at,
            form_1099_required: next.form_1099_required,
            updated_at: now.toISOString(),
          }, { onConflict: 'practitioner_id,tax_year' });
      } catch (e) {
        console.warn('[wl-ref-vest] tax aggregate update failed', (e as Error).message);
      }

      // Tier recompute.
      try {
        const { count: successfulCount } = await sb
          .from('practitioner_referral_attributions')
          .select('id', { count: 'exact', head: true })
          .eq('referring_practitioner_id', referringId)
          .eq('status', 'verified_active');
        const newCount = successfulCount ?? 0;
        const nextTier = calculateTierForCount(newCount);

        const { data: priorTierRow } = await sb
          .from('practitioner_referral_status_tiers')
          .select('current_tier, bronze_earned_at, silver_earned_at, gold_earned_at')
          .eq('practitioner_id', referringId)
          .maybeSingle();
        const prevTier = (priorTierRow?.current_tier ?? 'none') as
          'none' | 'bronze_referrer' | 'silver_referrer' | 'gold_referrer';
        const newlyEarned = detectNewlyEarnedTier(prevTier, nextTier);

        const update: Record<string, unknown> = {
          practitioner_id: referringId,
          current_tier: nextTier,
          successful_referrals_count: newCount,
          last_updated_at: now.toISOString(),
        };
        if (newlyEarned === 'bronze_referrer' && !priorTierRow?.bronze_earned_at) update.bronze_earned_at = now.toISOString();
        if (newlyEarned === 'silver_referrer' && !priorTierRow?.silver_earned_at) update.silver_earned_at = now.toISOString();
        if (newlyEarned === 'gold_referrer'   && !priorTierRow?.gold_earned_at)   update.gold_earned_at   = now.toISOString();

        await sb
          .from('practitioner_referral_status_tiers')
          .upsert(update, { onConflict: 'practitioner_id' });
      } catch (e) {
        console.warn('[wl-ref-vest] tier recompute failed', (e as Error).message);
      }

      // Notification dispatch (privacy-aware).
      try {
        const { data: prefs } = await sb
          .from('practitioner_referral_notification_preferences')
          .select('allow_referrer_progress_notifications')
          .eq('attribution_id', event.attribution_id)
          .maybeSingle();
        const { data: referredPract } = await sb
          .from('practitioners')
          .select('practice_name')
          .eq('id', event.practitioner_referral_attributions.referred_practitioner_id)
          .maybeSingle();
        const route = routeNotification({
          stage: 'vested',
          privacy_allows_progress: prefs?.allow_referrer_progress_notifications !== false,
          referred_practice_name: referredPract?.practice_name ?? null,
          milestone_display_name: event.practitioner_referral_milestones.display_name,
          amount_cents: amountCents,
          hold_expires_at: null,
        });
        if (route.send) {
          // Phase 4 ships the routing decision; the actual mailer is
          // wired in Phase 5/7. Log here so the contract is testable
          // with grep until then.
          console.log('[wl-ref-vest] notify', referringId, route.template, route.payload);
        }
      } catch (e) {
        console.warn('[wl-ref-vest] notification routing failed', (e as Error).message);
      }
    } catch (e) {
      console.warn('[wl-ref-vest] event failed', event.id, (e as Error).message);
      summary.errors++;
    }
  }

  return summary;
}
