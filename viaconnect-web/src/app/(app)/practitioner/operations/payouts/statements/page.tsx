'use client';

// Prompt #102 Phase 2: practitioner statement list.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Receipt } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCents } from '@/lib/payouts/statementGenerator';

interface StmtRow { statement_id: string; period_start: string; period_end: string; net_payable_cents: number; storage_path: string; }

export default function StatementsPage() {
  const [rows, setRows] = useState<StmtRow[]>([]);

  const refresh = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any;
    const { data } = await supabase
      .from('practitioner_statements')
      .select('statement_id, period_start, period_end, net_payable_cents, storage_path')
      .order('period_end', { ascending: false })
      .limit(36);
    setRows((data ?? []) as StmtRow[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/practitioner/operations/payouts" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Payouts
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
          <Receipt className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Statements
        </h1>

        {rows.length === 0 ? (
          <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
            <p className="text-xs text-white/60">No statements yet. Your first statement appears after the first monthly payout batch runs.</p>
          </section>
        ) : (
          <ul className="space-y-2">
            {rows.map((s) => (
              <li key={s.statement_id} className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-white font-semibold">{s.period_start} to {s.period_end}</p>
                  <p className="text-[10px] text-white/55 font-mono">{s.storage_path}</p>
                </div>
                <span className="text-xs text-white/80">{formatCents(s.net_payable_cents)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
