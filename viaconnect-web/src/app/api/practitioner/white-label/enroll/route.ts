// Prompt #96 Phase 2: Begin practitioner enrollment.
//
// POST /api/practitioner/white-label/enroll
// Re-runs eligibility (server-side, never trust the client), then inserts
// a white_label_enrollments row in status='eligibility_verified' if the
// practitioner does not already have one. Returns the enrollment.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkPractitionerEligibility } from '@/lib/white-label/eligibility';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  try {
    const supabase = createClient();

    let user;
    try {
      const authResult = await withTimeout(
        supabase.auth.getUser(),
        5000,
        'api.white-label.enroll.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.white-label.enroll', 'auth timeout', { requestId, error: err });
        return NextResponse.json({ error: 'Authentication timed out. Please try again.' }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;
    const practitionerRes = await withTimeout(
      (async () => sb
        .from('practitioners')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle())(),
      8000,
      'api.white-label.enroll.practitioner-load',
    );
    const practitioner = practitionerRes.data;
    if (!practitioner) {
      return NextResponse.json({ error: 'No practitioner record for this user' }, { status: 404 });
    }

    const eligibility = await withTimeout(
      checkPractitionerEligibility(practitioner.id, { supabase }),
      10000,
      'api.white-label.enroll.eligibility',
    );
    if (!eligibility.is_eligible || !eligibility.primary_path) {
      return NextResponse.json(
        { error: 'Not eligible for white-label enrollment', eligibility },
        { status: 403 },
      );
    }

    const existingRes = await withTimeout(
      (async () => sb
        .from('white_label_enrollments')
        .select('id, status, qualifying_path, enrolled_at')
        .eq('practitioner_id', practitioner.id)
        .maybeSingle())(),
      8000,
      'api.white-label.enroll.existing-load',
    );
    const existing = existingRes.data;

    if (existing) {
      return NextResponse.json({ enrollment: existing, was_existing: true });
    }

    const insertRes = await withTimeout(
      (async () => sb
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
        .maybeSingle())(),
      8000,
      'api.white-label.enroll.insert',
    );
    const inserted = insertRes.data;
    const insertError = insertRes.error;

    if (insertError) {
      safeLog.error('api.white-label.enroll', 'insert failed', { requestId, error: insertError });
      return NextResponse.json(
        { error: 'Enrollment insert failed', details: insertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ enrollment: inserted, was_existing: false }, { status: 201 });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.white-label.enroll', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.white-label.enroll', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
