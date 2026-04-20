'use client';

// Prompt #102 Phase 2: practitioner operations hub.

import Link from 'next/link';
import { ArrowLeft, Network, Wallet } from 'lucide-react';

export default function PractitionerOperationsHubPage() {
  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <Link href="/practitioner/dashboard" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-2">Operations</h1>
          <p className="text-xs text-white/55 mt-1">
            Manage your verified sales channels and commission payouts. Verified channels keep MAP enforcement from flagging legitimate sales; payouts are processed monthly after accrual reconciliation.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Link href="/practitioner/operations/channels" className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 hover:bg-[#1A2744] p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-[#E8803A]" strokeWidth={1.5} />
              <span className="text-sm font-semibold">Verified channels</span>
            </div>
            <p className="text-[11px] text-white/55">
              Declare your sales channels (website, marketplaces, clinic POS) so MAP monitoring grants VIP coverage.
            </p>
          </Link>
          <Link href="/practitioner/operations/payouts" className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 hover:bg-[#1A2744] p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-[#E8803A]" strokeWidth={1.5} />
              <span className="text-sm font-semibold">Payouts</span>
            </div>
            <p className="text-[11px] text-white/55">
              Payout methods, tax documents, monthly statements, disputes.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
