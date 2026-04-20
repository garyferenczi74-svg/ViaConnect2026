'use client';

// Prompt #100 Phase 5: admin investigation queue for anonymous listings.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fetchAdminViolationQueue } from '@/lib/map/queries-client';
import type { MAPViolationRow } from '@/lib/map/types';
import { SEVERITY_TONE } from '@/lib/map/severity';
import { formatPriceFromCents } from '@/lib/pricing/format';

export default function AdminInvestigationQueuePage() {
  const [rows, setRows] = useState<MAPViolationRow[]>([]);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const all = await fetchAdminViolationQueue(supabase);
    setRows(all.filter((v) => v.practitionerId === null));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
        <Link href="/admin/map" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> MAP Enforcement
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Search className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Investigation queue
        </h1>
        <p className="text-xs text-white/55">
          Anonymous or unverifiable listings. These never auto-escalate against any practitioner, per the fair-enforcement guardrail.
        </p>

        {rows.length === 0 ? (
          <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
            <p className="text-xs text-white/60">Investigation queue is clear.</p>
          </section>
        ) : (
          <ul className="space-y-2">
            {rows.map((v) => (
              <li key={v.violationId} className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold rounded-md px-1.5 py-0.5 border ${SEVERITY_TONE[v.severity]}`}>
                    {v.severity.toUpperCase()}
                  </span>
                  <span className="text-xs text-white">Product {v.productId.slice(0, 8)}</span>
                  <span className="text-[11px] text-white/55">observed {formatPriceFromCents(v.observedPriceCents)}</span>
                </div>
                <span className="text-[11px] text-white/55">{new Date(v.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
