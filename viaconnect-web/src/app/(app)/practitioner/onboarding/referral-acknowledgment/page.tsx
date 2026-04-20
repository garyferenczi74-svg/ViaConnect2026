// Prompt #98 Phase 3: Referred-practitioner acknowledgment step
// (server gate).

import { createClient } from '@/lib/supabase/server';
import { isLaunchPhaseActive } from '@/lib/launch-phases/is-active';
import AcknowledgmentClient from './acknowledgment-client';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ReferralAcknowledgmentPage() {
  const supabase = createClient();

  // When the launch flag is off, skip the step entirely - the
  // referred practitioner does not yet exist in the program.
  const active = await isLaunchPhaseActive('practitioner_referral_2027', supabase);
  if (!active) {
    redirect('/practitioner/dashboard');
  }

  return <AcknowledgmentClient />;
}
