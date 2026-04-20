'use client';

// Prompt #102 Phase 2: practitioner payout methods list.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { PayoutMethodStatus, PayoutRail } from '@/lib/payouts/types';

interface Method {
  method_id: string;
  rail: PayoutRail;
  status: PayoutMethodStatus;
  priority: number;
  display_label: string;
}

const STATUS_TONE: Record<PayoutMethodStatus, string> = {
  pending_setup: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  verified: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  failed_verification: 'bg-red-500/15 text-red-300 border-red-500/30',
  revoked: 'bg-white/[0.04] text-white/50 border-white/10',
};

export default function PayoutMethodsPage() {
  const [rows, setRows] = useState<Method[]>([]);

  const refresh = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any;
    const { data } = await supabase
      .from('practitioner_payout_methods')
      .select('method_id, rail, status, priority, display_label')
      .order('priority', { ascending: true });
    setRows((data ?? []) as Method[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/practitioner/operations/payouts" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Payouts
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Payout methods
        </h1>
        <p className="text-xs text-white/55">
          Stripe Connect (US ACH), PayPal (global), wire transfer (high-value). Priority determines fallback order.
        </p>

        {rows.length === 0 ? (
          <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
            <p className="text-xs text-white/60">No payout methods on file. Set one up to receive commission.</p>
          </section>
        ) : (
          <ul className="space-y-2">
            {rows.map((m) => (
              <li key={m.method_id} className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-white font-semibold">{m.display_label}</p>
                  <p className="text-[10px] text-white/55">{m.rail.replace(/_/g, ' ')} · priority {m.priority}</p>
                </div>
                <span className={`text-[10px] font-semibold rounded-md px-2 py-0.5 border ${STATUS_TONE[m.status]}`}>
                  {m.status.replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
