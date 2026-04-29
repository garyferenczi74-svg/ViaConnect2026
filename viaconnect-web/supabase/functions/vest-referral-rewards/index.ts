// =============================================================================
// vest-referral-rewards Edge Function
// =============================================================================
// Daily tick. Two passes:
//   1. Scan all referred practitioners for new milestone events
//      (calls scanAndRecordMilestonesForPractitioner inline; the
//      same logic the admin backfill route uses).
//   2. Process pending_hold milestone events whose 30-day hold has
//      expired (calls processPendingVesting inline). Vest, extend
//      hold (when fraud flag pending), or void (when attribution no
//      longer eligible). On vest: ledger entry + tax aggregate +
//      tier recompute + notification dispatch (privacy-aware).
//
// Inlines the pure cores (no @/lib alias in Deno edge runtime). Keep
// the numerics in lockstep with src/lib/practitioner-referral/*.
//
// Heartbeats to ultrathink_agent_registry on every successful run so
// Jeffery can monitor liveness.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ---------------------------------------------------------------------------
// Spec defaults (kept in lockstep with src/lib/practitioner-referral/schema-types.ts)
// ---------------------------------------------------------------------------
const FRAUD_HOLD_DAYS = 30;
const HOLD_EXTENSION_DAYS_ON_FRAUD_FLAG = 7;
const TAX_FORM_1099_THRESHOLD_CENTS = 60_000;       // $600
const TIER_THRESHOLDS = { bronze: 5, silver: 10, gold: 25 };
const PROGRAM_ACTIVE_STATUSES = new Set(['verified_active', 'pending_verification']);

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, content-type',
    },
  });
}

async function heartbeat(db: SupabaseClient, runId: string, ok: boolean, payload: Record<string, unknown>) {
  try {
    await db.rpc('ultrathink_agent_heartbeat', {
      p_agent_name: 'vest-referral-rewards',
      p_run_id: runId,
      p_event_type: ok ? 'heartbeat' : 'error',
      p_payload: payload,
      p_severity: ok ? 'info' : 'warning',
    });
  } catch (e) {
    console.warn('[vest-referral-rewards] heartbeat failed', (e as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Pass 1: scan source tables for new milestone events
// ---------------------------------------------------------------------------

interface RecordResult { recorded: boolean; reason?: string; milestone_id?: string; }

async function scanPractitionerForMilestones(
  db: SupabaseClient,
  practitionerId: string,
): Promise<RecordResult[]> {
  const out: RecordResult[] = [];

  const { data: attribution } = await db
    .from('practitioner_referral_attributions')
    .select('id, status')
    .eq('referred_practitioner_id', practitionerId)
    .maybeSingle();
  if (!attribution || !PROGRAM_ACTIVE_STATUSES.has(attribution.status)) return out;

  // Helper: insert when no existing event for this milestone.
  async function tryRecord(milestone_id: string, evidence: Record<string, unknown>) {
    const { data: existing } = await db
      .from('practitioner_referral_milestone_events')
      .select('id')
      .eq('attribution_id', attribution!.id)
      .eq('milestone_id', milestone_id)
      .maybeSingle();
    if (existing) return { recorded: false, reason: 'already recorded', milestone_id };

    const exp = new Date();
    exp.setUTCDate(exp.getUTCDate() + FRAUD_HOLD_DAYS);

    const { error } = await db
      .from('practitioner_referral_milestone_events')
      .insert({
        attribution_id: attribution!.id,
        milestone_id,
        evidence,
        vesting_status: 'pending_hold',
        hold_expires_at: exp.toISOString(),
      });
    if (error) return { recorded: false, reason: `insert failed: ${error.message}`, milestone_id };
    return { recorded: true, milestone_id };
  }

  // Milestone 1: subscription active + first wholesale >= $500.
  const { data: sub } = await db
    .from('practitioner_subscriptions')
    .select('id, tier_id, status')
    .eq('practitioner_id', practitionerId)
    .in('tier_id', ['standard_portal', 'white_label_platform'])
    .eq('status', 'active')
    .order('started_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (sub) {
    const { data: order } = await db
      .from('shop_orders')
      .select('id, total_cents, completed_at')
      .eq('practitioner_id', practitionerId)
      .eq('status', 'completed')
      .gte('total_cents', 50_000)
      .order('completed_at', { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (order) {
      out.push(await tryRecord('activation_and_first_purchase', {
        subscription_id: sub.id,
        subscription_tier_id: sub.tier_id,
        first_order_id: order.id,
        first_order_amount_cents: order.total_cents,
        first_order_completed_at: order.completed_at,
      }));
    }
  }

  // Milestone 2: master cert.
  const { data: cert } = await db
    .from('practitioner_certifications')
    .select('id, certified_at, status')
    .eq('practitioner_id', practitionerId)
    .eq('certification_level_id', 'master_practitioner')
    .eq('status', 'certified')
    .maybeSingle();
  if (cert) {
    out.push(await tryRecord('master_certification_complete', {
      certification_id: cert.id, certified_at: cert.certified_at,
    }));
  }

  // Milestone 3: Level 3 first delivery.
  try {
    const { data: prod, error: prodErr } = await db
      .from('white_label_production_orders')
      .select('id, enrollment_id, delivered_at, total_cents, status')
      .eq('practitioner_id', practitionerId)
      .eq('status', 'delivered')
      .order('delivered_at', { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (!prodErr && prod) {
      out.push(await tryRecord('level_3_white_label_first_delivery', {
        enrollment_id: prod.enrollment_id,
        production_order_id: prod.id,
        delivered_at: prod.delivered_at,
        order_total_cents: prod.total_cents,
      }));
    }
  } catch { /* table not present in this env */ }

  // Milestone 4: Level 4 first formulation approved.
  try {
    const { data: form, error: formErr } = await db
      .from('custom_formulations')
      .select('id, enrollment_id, approved_at, status')
      .eq('practitioner_id', practitionerId)
      .eq('status', 'approved_production_ready')
      .order('approved_at', { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (!formErr && form) {
      out.push(await tryRecord('level_4_first_formulation_approved', {
        enrollment_id: form.enrollment_id,
        custom_formulation_id: form.id,
        approved_at: form.approved_at,
      }));
    }
  } catch { /* table not present in this env */ }

  return out;
}

// ---------------------------------------------------------------------------
// Pass 2: process pending vesting
// ---------------------------------------------------------------------------

interface VestSummary { scanned: number; vested: number; extended_hold: number; voided: number; errors: number; }

function calculateTier(count: number) {
  if (count >= TIER_THRESHOLDS.gold) return 'gold_referrer';
  if (count >= TIER_THRESHOLDS.silver) return 'silver_referrer';
  if (count >= TIER_THRESHOLDS.bronze) return 'bronze_referrer';
  return 'none';
}

async function processPendingVestingPass(db: SupabaseClient, now: Date): Promise<VestSummary> {
  const summary: VestSummary = { scanned: 0, vested: 0, extended_hold: 0, voided: 0, errors: 0 };

  const { data: events, error } = await db
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
    console.warn('[vest-referral-rewards] event scan failed', error.message);
    summary.errors++;
    return summary;
  }

  type Row = {
    id: string;
    attribution_id: string;
    milestone_id: string;
    hold_expires_at: string;
    practitioner_referral_attributions: {
      referring_practitioner_id: string;
      referred_practitioner_id: string;
      status: string;
    };
    practitioner_referral_milestones: { reward_amount_cents: number; display_name: string };
  };

  for (const event of (events ?? []) as Row[]) {
    summary.scanned++;
    try {
      // Pending fraud flags relevant to this event or attribution.
      const { data: flags } = await db
        .from('practitioner_referral_fraud_flags')
        .select('id, severity')
        .eq('status', 'pending_review')
        .or(`milestone_event_id.eq.${event.id},attribution_id.eq.${event.attribution_id}`);
      const flagsArr = (flags ?? []) as Array<{ severity: string }>;

      // Attribution no longer eligible -> void.
      if (!PROGRAM_ACTIVE_STATUSES.has(event.practitioner_referral_attributions.status)) {
        await db.from('practitioner_referral_milestone_events').update({
          vesting_status: 'voided_admin',
          voided_at: now.toISOString(),
          voided_reason: `attribution status ${event.practitioner_referral_attributions.status} no longer eligible`,
          updated_at: now.toISOString(),
        }).eq('id', event.id);
        summary.voided++;
        continue;
      }

      // Pending fraud flag -> extend hold.
      if (flagsArr.length > 0) {
        const next = new Date(now);
        next.setUTCDate(next.getUTCDate() + HOLD_EXTENSION_DAYS_ON_FRAUD_FLAG);
        await db.from('practitioner_referral_milestone_events').update({
          hold_expires_at: next.toISOString(),
          updated_at: now.toISOString(),
        }).eq('id', event.id);
        summary.extended_hold++;
        continue;
      }

      // Vest.
      const taxYear = now.getUTCFullYear();
      const referringId = event.practitioner_referral_attributions.referring_practitioner_id;
      const amountCents = event.practitioner_referral_milestones.reward_amount_cents;

      const { data: ledger, error: ledgerErr } = await db
        .from('practitioner_referral_credit_ledger')
        .insert({
          practitioner_id: referringId,
          entry_type: 'earned_from_milestone',
          amount_cents: amountCents,
          running_balance_cents: 0,
          milestone_event_id: event.id,
          tax_year: taxYear,
          notes: `${event.practitioner_referral_milestones.display_name} vested`,
        })
        .select('id')
        .maybeSingle();
      if (ledgerErr || !ledger?.id) {
        console.warn('[vest-referral-rewards] ledger insert failed', event.id, ledgerErr?.message);
        summary.errors++;
        continue;
      }

      await db.from('practitioner_referral_milestone_events').update({
        vesting_status: 'vested',
        vested_at: now.toISOString(),
        credit_ledger_entry_id: ledger.id,
        updated_at: now.toISOString(),
      }).eq('id', event.id);
      summary.vested++;

      // Tax aggregate update.
      const { data: priorTax } = await db
        .from('practitioner_referral_tax_earnings')
        .select('total_earned_cents, crossed_600_threshold, crossed_600_threshold_at, form_1099_required')
        .eq('practitioner_id', referringId)
        .eq('tax_year', taxYear)
        .maybeSingle();
      const totalNew = (priorTax?.total_earned_cents ?? 0) + amountCents;
      const justCrossed = !(priorTax?.crossed_600_threshold ?? false) && totalNew >= TAX_FORM_1099_THRESHOLD_CENTS;
      await db.from('practitioner_referral_tax_earnings').upsert({
        practitioner_id: referringId,
        tax_year: taxYear,
        total_earned_cents: totalNew,
        crossed_600_threshold: (priorTax?.crossed_600_threshold ?? false) || totalNew >= TAX_FORM_1099_THRESHOLD_CENTS,
        crossed_600_threshold_at: priorTax?.crossed_600_threshold_at ?? (justCrossed ? now.toISOString() : null),
        form_1099_required: (priorTax?.form_1099_required ?? false) || totalNew >= TAX_FORM_1099_THRESHOLD_CENTS,
        updated_at: now.toISOString(),
      }, { onConflict: 'practitioner_id,tax_year' });

      // Tier recompute.
      const { count: successfulCount } = await db
        .from('practitioner_referral_attributions')
        .select('id', { count: 'exact', head: true })
        .eq('referring_practitioner_id', referringId)
        .eq('status', 'verified_active');
      const newCount = successfulCount ?? 0;
      const nextTier = calculateTier(newCount);
      const { data: priorTier } = await db
        .from('practitioner_referral_status_tiers')
        .select('current_tier, bronze_earned_at, silver_earned_at, gold_earned_at')
        .eq('practitioner_id', referringId)
        .maybeSingle();
      const update: Record<string, unknown> = {
        practitioner_id: referringId,
        current_tier: nextTier,
        successful_referrals_count: newCount,
        last_updated_at: now.toISOString(),
      };
      if (nextTier === 'bronze_referrer' && !priorTier?.bronze_earned_at) update.bronze_earned_at = now.toISOString();
      if (nextTier === 'silver_referrer' && !priorTier?.silver_earned_at) update.silver_earned_at = now.toISOString();
      if (nextTier === 'gold_referrer'   && !priorTier?.gold_earned_at)   update.gold_earned_at   = now.toISOString();
      await db.from('practitioner_referral_status_tiers').upsert(update, { onConflict: 'practitioner_id' });
    } catch (e) {
      console.warn('[vest-referral-rewards] event failed', event.id, (e as Error).message);
      summary.errors++;
    }
  }

  return summary;
}

// ---------------------------------------------------------------------------
// HTTP entrypoint
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200 });

  const db = admin();
  const runId = crypto.randomUUID();
  const startedAt = Date.now();
  const now = new Date();

  try {
    // Pass 1: detect new milestones for every active referred practitioner.
    const { data: activeAttributions } = await db
      .from('practitioner_referral_attributions')
      .select('referred_practitioner_id')
      .in('status', ['verified_active', 'pending_verification'])
      .limit(2000);
    let newMilestones = 0;
    for (const row of (activeAttributions ?? []) as Array<{ referred_practitioner_id: string }>) {
      const results = await scanPractitionerForMilestones(db, row.referred_practitioner_id);
      newMilestones += results.filter((r) => r.recorded).length;
    }

    // Pass 2: process expired holds.
    const vest = await processPendingVestingPass(db, now);

    await heartbeat(db, runId, true, {
      new_milestones: newMilestones,
      ...vest,
      durationMs: Date.now() - startedAt,
    });

    return json({ status: 'ok', runId, new_milestones: newMilestones, ...vest });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    await heartbeat(db, runId, false, { error: msg });
    return json({ status: 'failed', error: msg }, 500);
  }
});
