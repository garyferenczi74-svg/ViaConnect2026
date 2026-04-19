// Prompt #96 Phase 2: Practitioner-self eligibility check.
//
// GET /api/practitioner/white-label/eligibility
// Authenticated practitioner only. Looks up the calling user's
// practitioners row, runs checkPractitionerEligibility, returns the
// result. Does NOT mutate state; the enroll endpoint handles persistence.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkPractitionerEligibility } from '@/lib/white-label/eligibility';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { data: practitioner, error } = await (supabase as any)
    .from('practitioners')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: 'Practitioner lookup failed' }, { status: 500 });
  }
  if (!practitioner) {
    return NextResponse.json({ error: 'No practitioner record for this user' }, { status: 404 });
  }

  const result = await checkPractitionerEligibility(practitioner.id, { supabase });
  return NextResponse.json({
    practitioner_id: practitioner.id,
    ...result,
  });
}
