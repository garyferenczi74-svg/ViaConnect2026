// Prompt #92 Phase 5: practitioner-facing engagement score endpoint.
//
// FIREWALL: the response shape is the only surface exposed across the
// Helix firewall. No Helix balance, tier, transaction, streak, achievement,
// or leaderboard field is ever emitted. The fields returned here are
// explicitly enumerated; any field appearing here must come from
// engagement_score_snapshots only.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function GET(
  request: Request,
  { params }: { params: { patientId: string } },
) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  try {
    const supabase = createClient();

    let user;
    try {
      const authResult = await withTimeout(
        supabase.auth.getUser(),
        5000,
        'api.practitioner.engagement-score.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.practitioner.engagement-score', 'auth timeout', { requestId, error: err });
        return NextResponse.json({ error: 'Authentication timed out. Please try again.' }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sb = supabase as any;

    // Resolve the practitioner record for the caller. Path C reconciliation:
    // practitioners now uses account_status (5-state superset of the
    // Prompt #92 stub's 4-state status). Cast through `any` because the
    // generated types lag the migration; types regen will catch up.
    const practitionerRes = await withTimeout(
      (async () => sb
        .from('practitioners')
        .select('id, account_status')
        .eq('user_id', user.id)
        .maybeSingle())(),
      8000,
      'api.practitioner.engagement-score.practitioner-load',
    );
    const practitioner = practitionerRes.data as { id: string; account_status: string } | null;
    if (!practitioner || practitioner.account_status !== 'active') {
      return NextResponse.json({ error: 'No active practitioner record' }, { status: 403 });
    }

    // Verify active relationship + engagement score consent. Path C
    // reconciliation: practitioner_patients is the canonical relationship
    // table; the Prompt #92 patient_practitioner_relationships shim has
    // been dropped. practitioner_patients references auth.users directly
    // for both sides, so we match on auth.uid() not practitioners.id.
    const relRes = await withTimeout(
      (async () => sb
        .from('practitioner_patients')
        .select('status, consent_share_engagement_score')
        .eq('patient_id', params.patientId)
        .eq('practitioner_id', user.id)
        .maybeSingle())(),
      8000,
      'api.practitioner.engagement-score.relationship-load',
    );
    const relationship = relRes.data as { status: string; consent_share_engagement_score: boolean } | null;
    if (!relationship || relationship.status !== 'active') {
      return NextResponse.json({ error: 'No active relationship' }, { status: 403 });
    }
    if (!relationship.consent_share_engagement_score) {
      return NextResponse.json({ error: 'Patient has not granted engagement score consent' }, { status: 403 });
    }

    const snapshotRes = await withTimeout(
      (async () => supabase
        .from('engagement_score_snapshots')
        .select(
          'score, protocol_adherence_score, assessment_engagement_score, tracking_consistency_score, outcome_trajectory_score, period_start_date, period_end_date',
        )
        .eq('user_id', params.patientId)
        .order('period_end_date', { ascending: false })
        .limit(1)
        .maybeSingle())(),
      8000,
      'api.practitioner.engagement-score.snapshot-load',
    );
    const snapshot = snapshotRes.data;

    if (!snapshot) {
      return NextResponse.json({ error: 'No engagement score available for this patient' }, { status: 404 });
    }

    const row = snapshot as {
      score: number;
      protocol_adherence_score: number;
      assessment_engagement_score: number;
      tracking_consistency_score: number;
      outcome_trajectory_score: number;
      period_start_date: string;
      period_end_date: string;
    };

    // Explicit whitelist shape, do not spread the row.
    return NextResponse.json({
      score: row.score,
      components: {
        protocolAdherence: row.protocol_adherence_score,
        assessmentEngagement: row.assessment_engagement_score,
        trackingConsistency: row.tracking_consistency_score,
        outcomeTrajectory: row.outcome_trajectory_score,
      },
      period: {
        start: row.period_start_date,
        end: row.period_end_date,
      },
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.practitioner.engagement-score', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.practitioner.engagement-score', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
