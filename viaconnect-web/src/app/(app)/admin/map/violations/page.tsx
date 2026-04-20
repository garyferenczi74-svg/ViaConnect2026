'use client';

// Prompt #100 Phase 5: admin active violations queue.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ViolationQueue } from '@/components/admin/map/ViolationQueue';
import { fetchAdminViolationQueue } from '@/lib/map/queries-client';
import type { MAPViolationRow } from '@/lib/map/types';

export default function AdminViolationQueuePage() {
  const [rows, setRows] = useState<MAPViolationRow[]>([]);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const r = await fetchAdminViolationQueue(supabase);
    setRows(r.filter((v) => v.practitionerId !== null));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
        <Link href="/admin/map" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> MAP Enforcement
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Active violations
        </h1>
        <ViolationQueue rows={rows} onChange={refresh} />
      </div>
    </div>
  );
}
