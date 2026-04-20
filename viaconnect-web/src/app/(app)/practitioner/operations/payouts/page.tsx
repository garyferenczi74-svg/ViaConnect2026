'use client';

// Prompt #102 Phase 2: practitioner payouts overview.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Wallet, FileText, AlertTriangle, Receipt } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCents } from '@/lib/payouts/statementGenerator';

interface ReconRow { run_id: string; period_start: string; period_end: string; net_payable_cents: number; status: string; }
interface StmtRow { statement_id: string; period_start: string; period_end: string; net_payable_cents: number; }

export default function PractitionerPayoutsOverviewPage() {
  const [recon, setRecon] = useState<ReconRow[]>([]);
  const [stmts, setStmts] = useState<StmtRow[]>([]);

  const refresh = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any;
    const [rResp, sResp] = await Promise.all([
      supabase.from('commission_reconciliation_runs').select('run_id, period_start, period_end, net_payable_cents, status').order('period_end', { ascending: false }).limit(12),
      supabase.from('practitioner_statements').select('statement_id, period_start, period_end, net_payable_cents').order('period_end', { ascending: false }).limit(12),
    ]);
    setRecon((rResp.data ?? []) as ReconRow[]);
    setStmts((sResp.data ?? []) as StmtRow[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const pendingReconTotal = recon.filter((r) => r.status === 'reconciled').reduce((s, r) => s + Number(r.net_payable_cents), 0);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/practitioner/operations" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Operations
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Payouts
        </h1>

        <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
          <p className="text-[11px] text-white/55">Pending payout (reconciled, not yet paid)</p>
          <p className="text-2xl font-bold mt-1">{formatCents(pendingReconTotal)}</p>
        </section>

        <div className="grid sm:grid-cols-2 gap-3">
          <Link href="/practitioner/operations/payouts/methods" className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 hover:bg-[#1A2744] p-3 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-[#E8803A]" strokeWidth={1.5} />
            <span className="text-xs text-white/85">Payout methods</span>
          </Link>
          <Link href="/practitioner/operations/payouts/tax-info" className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 hover:bg-[#1A2744] p-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#E8803A]" strokeWidth={1.5} />
            <span className="text-xs text-white/85">Tax info</span>
          </Link>
          <Link href="/practitioner/operations/payouts/statements" className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 hover:bg-[#1A2744] p-3 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[#E8803A]" strokeWidth={1.5} />
            <span className="text-xs text-white/85">Statements</span>
          </Link>
          <Link href="/practitioner/operations/payouts/disputes" className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 hover:bg-[#1A2744] p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#E8803A]" strokeWidth={1.5} />
            <span className="text-xs text-white/85">Disputes</span>
          </Link>
        </div>

        {stmts.length > 0 && (
          <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
            <h2 className="text-sm font-semibold mb-3">Recent statements</h2>
            <ul className="space-y-2">
              {stmts.slice(0, 6).map((s) => (
                <li key={s.statement_id}>
                  <Link href={`/practitioner/operations/payouts/statements/${s.statement_id}`} className="flex items-center justify-between rounded-lg bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2 text-xs">
                    <span>{s.period_start} to {s.period_end}</span>
                    <span className="text-white/80">{formatCents(s.net_payable_cents)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
