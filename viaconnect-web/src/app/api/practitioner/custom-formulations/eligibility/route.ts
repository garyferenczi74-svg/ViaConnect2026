// Prompt #97 Phase 2.2: eligibility probe endpoint.
// GET /api/practitioner/custom-formulations/eligibility
// Returns the eligibility result so the landing page can render current
// status + evidence without the practitioner submitting anything.

import { NextResponse } from 'next/server';
import { requirePractitioner } from '@/lib/custom-formulations/admin-guard';
import { checkLevel4Eligibility } from '@/lib/custom-formulations/eligibility';

export async function GET() {
  const auth = await requirePractitioner();
  if (auth.kind === 'error') return auth.response;

  const result = await checkLevel4Eligibility(auth.practitionerId);
  return NextResponse.json(result);
}
