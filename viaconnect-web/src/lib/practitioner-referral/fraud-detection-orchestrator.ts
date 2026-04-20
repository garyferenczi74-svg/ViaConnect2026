// Prompt #98 Phase 6: Fraud detection orchestrator.
//
// Three hooks:
//   runFraudDetectionOnMilestoneEvent   called when a milestone event
//                                        is recorded. Runs high-velocity
//                                        + cluster pattern checks for
//                                        the referrer.
//   runFraudDetectionOnTermination      called when a practitioner is
//                                        terminated. Runs rapid-
//                                        termination check against their
//                                        attribution, if any.
//   runIpOverlapSweep                    admin-triggered or scheduled;
//                                        scans clicks + attributions
//                                        for IP overlap.
//
// Detected flags are inserted into practitioner_referral_fraud_flags
// with status='pending_review'.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  detectHighVelocity,
  detectClusterPattern,
  detectRapidTermination,
  detectIpOverlap,
  HIGH_VELOCITY_WINDOW_DAYS,
  type AttributionLite,
  type MilestoneEventLite,
  type ClickRecordLite,
} from './fraud-patterns';

interface Deps {
  supabase: SupabaseClient | unknown;
}

// SupabaseClient typing is cast at the call site; insertFlag accepts
// the same unknown-typed handle every other orchestrator uses.
async function insertFlag(
  sb: SupabaseClient,
  params: {
    attribution_id?: string;
    milestone_event_id?: string;
    practitioner_id?: string;
    flag_type: string;
    severity: string;
    evidence: Record<string, unknown>;
  },
): Promise<void> {
  await sb.from('practitioner_referral_fraud_flags').insert({
    attribution_id: params.attribution_id ?? null,
    milestone_event_id: params.milestone_event_id ?? null,
    practitioner_id: params.practitioner_id ?? null,
    flag_type: params.flag_type,
    severity: params.severity,
    evidence: params.evidence,
    auto_detected: true,
  });
}

/**
 * Hook: a milestone event was just created for an attribution whose
 * referrer is `referringPractitionerId`. Runs high-velocity + cluster
 * checks.
 */
export async function runFraudDetectionOnMilestoneEvent(
  params: { milestone_event_id: string; referring_practitioner_id: string },
  deps: Deps,
): Promise<{ flags_created: number }> {
  const sb = deps.supabase as any;
  let flagsCreated = 0;

  // High-velocity: all milestone events for this referrer within
  // the 30-day window.
  const since = new Date(Date.now() - HIGH_VELOCITY_WINDOW_DAYS * 86_400_000);
  const { data: attributions } = await sb
    .from('practitioner_referral_attributions')
    .select('id')
    .eq('referring_practitioner_id', params.referring_practitioner_id);
  const attributionIds = ((attributions ?? []) as Array<{ id: string }>).map((a) => a.id);

  if (attributionIds.length > 0) {
    const { data: recentEvents } = await sb
      .from('practitioner_referral_milestone_events')
      .select('id, attribution_id, achieved_at')
      .in('attribution_id', attributionIds)
      .gte('achieved_at', since.toISOString())
      .limit(500);
    const events = (recentEvents ?? []) as MilestoneEventLite[];

    const velocity = detectHighVelocity({ recent_events: events, now: new Date() });
    if (velocity.detected) {
      await insertFlag(sb, {
        milestone_event_id: params.milestone_event_id,
        practitioner_id: params.referring_practitioner_id,
        flag_type: 'high_velocity_signups',
        severity: velocity.severity ?? 'medium',
        evidence: velocity.evidence ?? {},
      });
      flagsCreated++;
    }
  }

  // Cluster: load this referrer's attributions + referred practice
  // contact info.
  const { data: clusterRows } = await sb
    .from('practitioner_referral_attributions')
    .select(`
      id,
      referred_practitioner_id,
      practitioners!referred_practitioner_id (
        practice_name, practice_phone, practice_street_address,
        practice_city, practice_state, practice_postal_code
      )
    `)
    .eq('referring_practitioner_id', params.referring_practitioner_id)
    .eq('status', 'verified_active');

  const clusterInput: AttributionLite[] = ((clusterRows ?? []) as Array<any>).map((row) => ({
    attribution_id: row.id,
    referred_practitioner_id: row.referred_practitioner_id,
    practice_name: row.practitioners?.practice_name ?? null,
    practice_phone: row.practitioners?.practice_phone ?? null,
    practice_street_address: row.practitioners?.practice_street_address ?? null,
    practice_city: row.practitioners?.practice_city ?? null,
    practice_state: row.practitioners?.practice_state ?? null,
    practice_postal_code: row.practitioners?.practice_postal_code ?? null,
  }));

  const cluster = detectClusterPattern({ attributions: clusterInput });
  if (cluster.detected) {
    await insertFlag(sb, {
      milestone_event_id: params.milestone_event_id,
      practitioner_id: params.referring_practitioner_id,
      flag_type: 'cluster_pattern',
      severity: cluster.severity ?? 'high',
      evidence: cluster.evidence ?? {},
    });
    flagsCreated++;
  }

  return { flags_created: flagsCreated };
}

/**
 * Hook: a practitioner transitioned to account_status='terminated'.
 * If they were referred within the last 90 days, raise a flag.
 */
export async function runFraudDetectionOnTermination(
  params: { practitioner_id: string; terminated_at: Date },
  deps: Deps,
): Promise<{ flags_created: number }> {
  const sb = deps.supabase as any;

  const { data: attribution } = await sb
    .from('practitioner_referral_attributions')
    .select('id, referring_practitioner_id, attributed_at, status')
    .eq('referred_practitioner_id', params.practitioner_id)
    .maybeSingle();
  if (!attribution || attribution.status !== 'verified_active') {
    return { flags_created: 0 };
  }

  const result = detectRapidTermination({
    attributed_at: attribution.attributed_at,
    terminated_at: params.terminated_at,
  });
  if (!result.detected) return { flags_created: 0 };

  await insertFlag(sb, {
    attribution_id: attribution.id,
    practitioner_id: attribution.referring_practitioner_id,
    flag_type: 'referred_practitioner_terminated_quickly',
    severity: result.severity ?? 'medium',
    evidence: result.evidence ?? {},
  });
  return { flags_created: 1 };
}

/**
 * Scheduled or admin-triggered: look at recent click records and
 * raise a flag when >= IP_OVERLAP_THRESHOLD distinct attributions
 * share the same IP hash.
 */
export async function runIpOverlapSweep(
  params: { lookback_days?: number },
  deps: Deps,
): Promise<{ flags_created: number }> {
  const sb = deps.supabase as any;
  const lookbackDays = params.lookback_days ?? 30;
  const since = new Date(Date.now() - lookbackDays * 86_400_000);

  const { data: rows } = await sb
    .from('practitioner_referral_link_clicks')
    .select('id, attribution_id, ip_address_hash, converted_to_attribution')
    .eq('converted_to_attribution', true)
    .gte('clicked_at', since.toISOString())
    .limit(10_000);

  const clicks: ClickRecordLite[] = ((rows ?? []) as Array<any>)
    .filter((r) => r.attribution_id)
    .map((r) => ({ id: r.id, attribution_id: r.attribution_id, ip_address_hash: r.ip_address_hash }));

  const result = detectIpOverlap({ clicks });
  if (!result.detected) return { flags_created: 0 };

  // Insert a single flag per overlap finding; admin reviewer can drill
  // into the evidence to see which attributions are implicated.
  await insertFlag(sb, {
    flag_type: 'ip_overlap',
    severity: result.severity ?? 'high',
    evidence: result.evidence ?? {},
  });
  return { flags_created: 1 };
}
