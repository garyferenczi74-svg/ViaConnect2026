'use client';

// Prompt #98 Phase 5: Credits dashboard client.
//
// Shows current balance + lifetime + pending hold, the transaction
// history (newest first), and the pending milestone events still in
// their 30-day fraud hold. Application itself happens at the
// checkout page that accepts the credit; this page is read-only.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  Send,
  Award,
} from 'lucide-react';

interface Balance {
  current_balance_cents: number;
  lifetime_earned_cents: number;
  lifetime_applied_cents: number;
  pending_hold_cents: number;
  last_updated_at: string | null;
}

interface LedgerRow {
  id: string;
  entry_type: string;
  amount_cents: number;
  running_balance_cents: number;
  milestone_event_id: string | null;
  applied_to_reference_type: string | null;
  applied_to_reference_id: string | null;
  tax_year: number | null;
  notes: string | null;
  admin_reason: string | null;
  created_at: string;
}

interface Hold {
  id: string;
  milestone_id: string;
  milestone_display_name: string;
  reward_amount_cents: number;
  hold_expires_at: string;
  achieved_at: string;
}

const fmtUsd = (c: number) => `${c < 0 ? '-' : ''}$${Math.abs(c / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString() : 'n/a';

function entryLabel(type: string): string {
  const map: Record<string, string> = {
    earned_from_milestone:           'Earned from milestone',
    applied_to_subscription:         'Applied to subscription',
    applied_to_wholesale_order:      'Applied to wholesale order',
    applied_to_certification_fee:    'Applied to certification fee',
    applied_to_level_3_fee:          'Applied to Level 3 fee',
    applied_to_level_4_fee:          'Applied to Level 4 fee',
    expired:                         'Expired',
    voided_fraud:                    'Voided: fraud',
    voided_admin:                    'Voided: admin',
    admin_adjustment:                'Admin adjustment',
  };
  return map[type] ?? type.replace(/_/g, ' ');
}

export default function CreditsDashboardClient() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [entries, setEntries] = useState<LedgerRow[]>([]);
  const [holds, setHolds] = useState<Hold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/practitioner/referrals/credits');
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setBalance(json.balance);
      setEntries(json.entries ?? []);
      setHolds(json.holds ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1A30] text-white p-8">
        <div className="text-sm text-gray-400 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/practitioner/referrals/invite" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Invite a peer
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Referral credits</h1>
            <p className="text-sm text-gray-400 mt-1">Apply credits to your ViaCura purchases; never cash, never transferable.</p>
          </div>
          <button onClick={reload} className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 self-start md:self-auto">
            <RefreshCw className="w-3 h-3" strokeWidth={1.5} /> Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>
      )}

      {balance && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat label="Available" value={fmtUsd(balance.current_balance_cents)} Icon={Wallet} />
          <Stat label="Lifetime earned" value={fmtUsd(balance.lifetime_earned_cents)} Icon={TrendingUp} />
          <Stat label="Lifetime applied" value={fmtUsd(balance.lifetime_applied_cents)} Icon={TrendingDown} />
          <Stat label="Pending hold" value={fmtUsd(balance.pending_hold_cents)} Icon={Clock} />
        </section>
      )}

      {holds.length > 0 && (
        <section className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-xs uppercase tracking-wider text-amber-300 mb-2 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" strokeWidth={1.5} /> Pending 30-day holds
          </p>
          <ul className="space-y-2 text-sm">
            {holds.map((h) => (
              <li key={h.id} className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{h.milestone_display_name}</p>
                  <p className="text-xs text-gray-400">Vests {fmtDate(h.hold_expires_at)}</p>
                </div>
                <span className="font-mono text-amber-200">{fmtUsd(h.reward_amount_cents)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs uppercase tracking-wider text-gray-400 mb-3 inline-flex items-center gap-1">
          <Send className="w-3 h-3" strokeWidth={1.5} /> Where credits apply
        </p>
        <ul className="text-sm text-gray-300 grid grid-cols-1 md:grid-cols-2 gap-1 list-disc list-inside">
          <li>Practitioner subscription renewal</li>
          <li>Certification fees (Level 2, 3, 4, annual recert)</li>
          <li>Wholesale supplement orders</li>
          <li>Level 3 White-Label production deposit + final payment</li>
          <li>Level 4 Custom Formulation development + production fees</li>
        </ul>
        <p className="text-xs text-gray-500 mt-3">
          Credits expire 24 months after earning. You'll receive reminders at 90, 60, 30, and 7 days before expiry.
        </p>
      </section>

      <section>
        <p className="text-xs uppercase tracking-wider text-gray-400 mb-3 inline-flex items-center gap-1">
          <Award className="w-3 h-3" strokeWidth={1.5} /> Transaction history
        </p>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No activity yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400">
                <tr>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-right px-3 py-2">Amount</th>
                  <th className="text-right px-3 py-2">Running balance</th>
                  <th className="text-left px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-white/5">
                    <td className="px-3 py-1.5 text-xs">{fmtDate(e.created_at)}</td>
                    <td className="px-3 py-1.5">{entryLabel(e.entry_type)}</td>
                    <td className={`px-3 py-1.5 text-right font-mono ${e.amount_cents < 0 ? 'text-rose-300' : 'text-portal-green'}`}>
                      {fmtUsd(e.amount_cents)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">{fmtUsd(e.running_balance_cents)}</td>
                    <td className="px-3 py-1.5 text-xs text-gray-400">{e.admin_reason ?? e.notes ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, Icon }: { label: string; value: string; Icon: typeof Wallet }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <Icon className="w-4 h-4 text-copper mb-2" strokeWidth={1.5} />
      <p className="text-xl font-semibold font-mono">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}
