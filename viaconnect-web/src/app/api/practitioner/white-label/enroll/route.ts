// Prompt #96 Phase 2: Begin practitioner enrollment.
//
// POST /api/practitioner/white-label/enroll
// Re-runs eligibility (server-side, never trust the client), then inserts
// a white_label_enrollments row in status='eligibility_verified' if the
// practitioner does not already have one. Returns the enrollment.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkPractitionerEligibility } from '@/lib/white-label/eligibility';

export const runtime = 'nodejs';

export async function POST(): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const sb = supabase as any;
  const { data: practitioner } = await sb
    .from('practitioners')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!practitioner) {
    return NextResponse.json({ error: 'No practitioner record for this user' }, { status: 404 });
  }

  const eligibility = await checkPractitionerEligibility(practitioner.id, { supabase });
  if (!eligibility.is_eligible || !eligibility.primary_path) {
    return NextResponse.json(
      { error: 'Not eligible for white-label enrollment', eligibility },
      { status: 403 },
    );
  }

  const { data: existing } = await sb
    .from('white_label_enrollments')
    .select('id, status, qualifying_path, enrolled_at')
    .eq('practitioner_id', practitioner.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ enrollment: existing, was_existing: true });
  }

  const { data: inserted, error: insertError } = await sb
    .from('white_label_enrollments')
    .insert({
      practitioner_id: practitioner.id,
      status: 'eligibility_verified',
      qualifying_path: eligibility.primary_path,
      qualifying_path_verified_at: new Date().toISOString(),
      qualifying_path_verified_by: user.id,
      qualifying_path_evidence: eligibility.evidence,
    })
    .select('id, status, qualifying_path, enrolled_at')
    .maybeSingle();

  if (insertError) {
    return NextResponse.json(
      { error: 'Enrollment insert failed', details: insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ enrollment: inserted, was_existing: false }, { status: 201 });
}
