// Prompt #96 Phase 6: Practitioner inventory page (server gate).

import { createClient } from '@/lib/supabase/server';
import { isLaunchPhaseActive } from '@/lib/launch-phases/is-active';
import InventoryClient from './inventory-client';
import { Hourglass } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PractitionerInventoryPage() {
  const supabase = createClient();
  const active = await isLaunchPhaseActive('white_label_products_2028', supabase);

  if (!active) {
    return (
      <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-10 md:px-8 md:py-16">
        <div className="max-w-2xl mx-auto rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <Hourglass className="w-10 h-10 text-copper mx-auto mb-4" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold mb-2">Inventory</h1>
          <p className="text-sm text-gray-400">Available once Level 3 White-Label launches in Q3 to Q4 2028.</p>
        </div>
      </div>
    );
  }

  return <InventoryClient />;
}
