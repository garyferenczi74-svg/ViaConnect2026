// Prompt #98 Phase 4: Milestone-detection DB orchestrator.
//
// Scans the four milestone source tables for referred practitioners
// and records new milestone events through the pure detector. Runs
// from the daily Edge Function tick OR an admin-triggered backfill
// via the admin API. Idempotent on (attribution_id, milestone_id).
//
// Source tables per spec:
//   1. activation_and_first_purchase     practitioner_subscriptions(active)
//                                        + first shop_orders(completed) >= $500
//   2. master_certification_complete     practitioner_certifications(certified, level=master_practitioner)
//   3. level_3_white_label_first_delivery white_label_production_orders(delivered, first per practitioner)
//   4. level_4_first_formulation_approved custom_formulations(approved_production_ready, first per practitioner)
//
// Tables 3 + 4 may not exist in every environment (Prompts #96 + #97
// might not be applied). The detector returns gracefully when the
// source table is missing.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  evaluateMilestoneCandidate,
  computeHoldExpiry,
} from './milestone-detector';
import { runFraudDetectionOnMilestoneEvent } from './fraud-detection-orchestrator';
import type { MilestoneId } from './schema-types';

interface OrchestratorDeps {
  supabase: SupabaseClient | unknown;
}

export interface MilestoneRecordResult {
  recorded: boolean;
  milestone_event_id?: string;
  reason?: string;
  attribution_id?: string;
}

/**
 * Records a single milestone event when the candidate passes the
 * detector. Idempotent: a duplicate (attribution, milestone) returns
 * recorded=false with reason='already recorded'.
 */
export async function recordMilestoneEventIfEligible(
  params: {
    milestone_id: MilestoneId;
    referred_practitioner_id: string;
    evidence: Record<string, unknown>;
  },
  deps: OrchestratorDeps,
): Promise<MilestoneRecordResult> {
  const sb = deps.supabase as any;

  const { data: attribution } = await sb
    .from('practitioner_referral_attributions')
    .select('id, status')
    .eq('referred_practitioner_id', params.referred_practitioner_id)
    .maybeSingle();

  const { data: existing } = attribution
    ? await sb
        .from('practitioner_referral_milestone_events')
        .select('id')
        .eq('attribution_id', attribution.id)
        .eq('milestone_id', params.milestone_id)
        .maybeSingle()
    : { data: null };

  const decision = evaluateMilestoneCandidate({
    milestone_id: params.milestone_id,
    referred_practitioner_id: params.referred_practitioner_id,
    attribution_status: attribution?.status ?? null,
    existing_event_for_milestone: !!existing,
    evidence: params.evidence,
  });

  if (!decision.should_record) {
    return { recorded: false, reason: decision.reason, attribution_id: attribution?.id };
  }

  const holdExpiry = computeHoldExpiry(new Date());
  const { data: event, error } = await sb
    .from('practitioner_referral_milestone_events')
    .insert({
      attribution_id: attribution!.id,
      milestone_id: params.milestone_id,
      evidence: decision.evidence,
      vesting_status: 'pending_hold',
      hold_expires_at: holdExpiry.toISOString(),
    })
    .select('id')
    .maybeSingle();

  if (error) {
    return { recorded: false, reason: `insert failed: ${error.message}`, attribution_id: attribution?.id };
  }

  // Phase 6 hook: run pattern-based fraud detection on this referrer
  // as soon as the event is recorded. Failures are non-fatal; the
  // vesting tick will also consult pending flags.
  try {
    const { data: referringRow } = await sb
      .from('practitioner_referral_attributions')
      .select('referring_practitioner_id')
      .eq('id', attribution!.id)
      .maybeSingle();
    if (referringRow?.referring_practitioner_id && event?.id) {
      await runFraudDetectionOnMilestoneEvent(
        { milestone_event_id: event.id, referring_practitioner_id: referringRow.referring_practitioner_id },
        deps,
      );
    }
  } catch (e) {
    console.warn('[wl-ref-milestone] fraud detection failed', (e as Error).message);
  }

  return { recorded: true, milestone_event_id: event?.id, attribution_id: attribution!.id };
}

/**
 * Scans all four milestone sources for one referred practitioner and
 * records eligible events. Useful for backfill after status fixes.
 */
export async function scanAndRecordMilestonesForPractitioner(
  referredPractitionerId: string,
  deps: OrchestratorDeps,
): Promise<MilestoneRecordResult[]> {
  const sb = deps.supabase as any;
  const results: MilestoneRecordResult[] = [];

  // Milestone 1: subscription active + first wholesale >= $500.
  const { data: sub } = await sb
    .from('practitioner_subscriptions')
    .select('id, tier_id, status')
    .eq('practitioner_id', referredPractitionerId)
    .in('tier_id', ['standard_portal', 'white_label_platform'])
    .eq('status', 'active')
    .order('started_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (sub) {
    const { data: firstOrder } = await sb
      .from('shop_orders')
      .select('id, total_cents, completed_at')
      .eq('practitioner_id', referredPractitionerId)
      .eq('status', 'completed')
      .gte('total_cents', 50_000)
      .order('completed_at', { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (firstOrder) {
      results.push(await recordMilestoneEventIfEligible({
        milestone_id: 'activation_and_first_purchase',
        referred_practitioner_id: referredPractitionerId,
        evidence: {
          subscription_id: sub.id,
          subscription_tier_id: sub.tier_id,
          first_order_id: firstOrder.id,
          first_order_amount_cents: firstOrder.total_cents,
          first_order_completed_at: firstOrder.completed_at,
        },
      }, deps));
    }
  }

  // Milestone 2: Master Practitioner certification certified.
  const { data: cert } = await sb
    .from('practitioner_certifications')
    .select('id, certified_at, status')
    .eq('practitioner_id', referredPractitionerId)
    .eq('certification_level_id', 'master_practitioner')
    .eq('status', 'certified')
    .maybeSingle();
  if (cert) {
    results.push(await recordMilestoneEventIfEligible({
      milestone_id: 'master_certification_complete',
      referred_practitioner_id: referredPractitionerId,
      evidence: { certification_id: cert.id, certified_at: cert.certified_at },
    }, deps));
  }

  // Milestone 3: Level 3 White-Label first delivered production order.
  // Defensive: table from Prompt #96 may not be present in every env.
  try {
    const { data: prodOrder, error: prodErr } = await sb
      .from('white_label_production_orders')
      .select('id, enrollment_id, delivered_at, total_cents, status')
      .eq('practitioner_id', referredPractitionerId)
      .eq('status', 'delivered')
      .order('delivered_at', { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (!prodErr && prodOrder) {
      results.push(await recordMilestoneEventIfEligible({
        milestone_id: 'level_3_white_label_first_delivery',
        referred_practitioner_id: referredPractitionerId,
        evidence: {
          enrollment_id: prodOrder.enrollment_id,
          production_order_id: prodOrder.id,
          delivered_at: prodOrder.delivered_at,
          order_total_cents: prodOrder.total_cents,
        },
      }, deps));
    }
  } catch {
    // Source not present in this environment; safe to skip.
  }

  // Milestone 4: Level 4 first approved custom formulation.
  try {
    const { data: formulation, error: formErr } = await sb
      .from('custom_formulations')
      .select('id, enrollment_id, approved_at, status')
      .eq('practitioner_id', referredPractitionerId)
      .eq('status', 'approved_production_ready')
      .order('approved_at', { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (!formErr && formulation) {
      results.push(await recordMilestoneEventIfEligible({
        milestone_id: 'level_4_first_formulation_approved',
        referred_practitioner_id: referredPractitionerId,
        evidence: {
          enrollment_id: formulation.enrollment_id,
          custom_formulation_id: formulation.id,
          approved_at: formulation.approved_at,
        },
      }, deps));
    }
  } catch {
    // Source not present in this environment; safe to skip.
  }

  return results;
}
