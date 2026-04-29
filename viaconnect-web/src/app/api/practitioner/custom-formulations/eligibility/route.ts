// Prompt #97 Phase 2.2: eligibility probe endpoint.
// GET /api/practitioner/custom-formulations/eligibility
// Returns the eligibility result so the landing page can render current
// status + evidence without the practitioner submitting anything.

import { NextResponse } from 'next/server';
import { requirePractitioner } from '@/lib/custom-formulations/admin-guard';
import { checkLevel4Eligibility } from '@/lib/custom-formulations/eligibility';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function GET(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const auth = await requirePractitioner();
    if (auth.kind === 'error') return auth.response;

    const result = await withTimeout(
      checkLevel4Eligibility(auth.practitionerId),
      10000,
      'api.practitioner.custom-formulations.eligibility.check',
    );
    return NextResponse.json(result);
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.practitioner.custom-formulations.eligibility', 'check timeout', { requestId, error: err });
      return NextResponse.json({ error: 'Eligibility check timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.practitioner.custom-formulations.eligibility', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
