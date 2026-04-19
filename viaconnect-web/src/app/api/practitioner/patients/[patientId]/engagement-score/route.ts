// Prompt #92 Phase 5: practitioner-facing engagement score endpoint.
//
// FIREWALL: the response shape is the only surface exposed across the
// Helix firewall. No Helix balance, tier, transaction, streak, achievement,
// or leaderboard field is ever emitted. The fields returned here are
// explicitly enumerated; any field appearing here must come from
// engagement_score_snapshots only.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: { patientId: string } },
) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Resolve the practitioner record for the caller
  const { data: practitionerRow } = await supabase
    .from('practitioners')
    .select('id, status')
    .eq('user_id', user.id)
    .maybeSingle();
  const practitioner = practitionerRow as { id: string; status: string } | null;
  if (!practitioner || practitioner.status !== 'active') {
    return NextResponse.json({ error: 'No active practitioner record' }, { status: 403 });
  }

  // Verify active relationship + engagement score consent
  const { data: rel } = await supabase
    .from('patient_practitioner_relationships')
    .select('status, consent_share_engagement_score')
    .eq('patient_user_id', params.patientId)
    .eq('practitioner_id', practitioner.id)
    .maybeSingle();
  const relationship = rel as { status: string; consent_share_engagement_score: boolean } | null;
  if (!relationship || relationship.status !== 'active') {
    return NextResponse.json({ error: 'No active relationship' }, { status: 403 });
  }
  if (!relationship.consent_share_engagement_score) {
    return NextResponse.json({ error: 'Patient has not granted engagement score consent' }, { status: 403 });
  }

  const { data: snapshot } = await supabase
    .from('engagement_score_snapshots')
    .select(
      'score, protocol_adherence_score, assessment_engagement_score, tracking_consistency_score, outcome_trajectory_score, period_start_date, period_end_date',
    )
    .eq('user_id', params.patientId)
    .order('period_end_date', { ascending: false })
    .limit(1)
    .maybeSingle();

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

  // Explicit whitelist shape — do not spread the row.
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
}
