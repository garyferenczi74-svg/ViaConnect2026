// Prompt #96 Phase 2: Practitioner-facing white-label enrollment.
//
// Server component shell that gates the page on the
// white_label_products_2028 launch phase. When the phase is not yet
// active (which it will not be until 2028), the practitioner sees the
// "coming Q3 2028" placeholder. When active, the enrollment client
// component runs.

import { createClient } from '@/lib/supabase/server';
import { isLaunchPhaseActive } from '@/lib/launch-phases/is-active';
import EnrollClient from './enroll-client';
import { Hourglass } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function WhiteLabelEnrollPage() {
  const supabase = createClient();
  const active = await isLaunchPhaseActive('white_label_products_2028', supabase);

  if (!active) {
    return (
      <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-10 md:px-8 md:py-16">
        <div className="max-w-2xl mx-auto rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <Hourglass className="w-10 h-10 text-copper mx-auto mb-4" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold mb-2">Level 3 White-Label Products</h1>
          <p className="text-sm text-gray-400">
            Launching Q3 to Q4 2028. Infrastructure is built; enrollment opens once Gary activates the launch phase.
          </p>
          <p className="text-xs text-gray-500 mt-4">
            If you believe you should have early access, contact your account manager.
          </p>
        </div>
      </div>
    );
  }

  return <EnrollClient />;
}
