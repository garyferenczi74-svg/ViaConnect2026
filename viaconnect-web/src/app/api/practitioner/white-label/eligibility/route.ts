// Prompt #96 Phase 2: Practitioner-self eligibility check.
//
// GET /api/practitioner/white-label/eligibility
// Authenticated practitioner only. Looks up the calling user's
// practitioners row, runs checkPractitionerEligibility, returns the
// result. Does NOT mutate state; the enroll endpoint handles persistence.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkPractitionerEligibility } from '@/lib/white-label/eligibility';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  try {
    const supabase = createClient();

    let user;
    try {
      const authResult = await withTimeout(
        supabase.auth.getUser(),
        5000,
        'api.white-label.eligibility.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.white-label.eligibility', 'auth timeout', { requestId, error: err });
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
      'api.white-label.eligibility.practitioner-load',
    );
    const practitioner = practitionerRes.data;
    const error = practitionerRes.error;
    if (error) {
      safeLog.error('api.white-label.eligibility', 'practitioner lookup failed', { requestId, error });
      return NextResponse.json({ error: 'Practitioner lookup failed' }, { status: 500 });
    }
    if (!practitioner) {
      return NextResponse.json({ error: 'No practitioner record for this user' }, { status: 404 });
    }

    const result = await withTimeout(
      checkPractitionerEligibility(practitioner.id, { supabase }),
      10000,
      'api.white-label.eligibility.check',
    );
    return NextResponse.json({
      practitioner_id: practitioner.id,
      ...result,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.white-label.eligibility', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.white-label.eligibility', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
