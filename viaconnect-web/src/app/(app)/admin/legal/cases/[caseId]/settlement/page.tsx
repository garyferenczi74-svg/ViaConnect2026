'use client';

// Prompt #104 Phase 7: Per-case settlement composer + approval chain.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Loader2, AlertCircle, ScaleIcon, RefreshCw, CheckCircle,
} from 'lucide-react';
import { SETTLEMENT_RELEASE_SCOPES } from '@/lib/legal/types';

interface Settlement {
  settlement_id: string;
  settlement_date: string;
  monetary_amount_cents: number;
  currency: string;
  payment_method: string | null;
  payment_received_at: string | null;
  nda_required: boolean;
  release_scope: string;
  approval_tier: string;
  approved_at: string | null;
  cfo_approved_at: string | null;
  ceo_approved_at: string | null;
  executed_at: string | null;
}

const STATUS_TONE: Record<string, string> = {
  paid:         'border-emerald-500/40 text-emerald-300',
  executed:     'border-sky-500/40 text-sky-300',
  in_approval:  'border-amber-500/40 text-amber-300',
  drafted:      'border-white/10 text-gray-300',
};

function statusOf(s: Settlement): keyof typeof STATUS_TONE {
  if (s.payment_received_at) return 'paid';
  if (s.executed_at) return 'executed';
  if (s.approved_at || s.cfo_approved_at || s.ceo_approved_at) return 'in_approval';
  return 'drafted';
}

export default function CaseSettlementPage() {
  const params = useParams<{ caseId: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amountCents, setAmountCents] = useState<number>(0);
  const [currency, setCurrency] = useState('USD');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [ndaRequired, setNdaRequired] = useState(false);
  const [releaseScope, setReleaseScope] = useState('specific_claim');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/legal/cases/${params.caseId}/settlements`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setSettlements(json.rows ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [params.caseId]);

  useEffect(() => { reload(); }, [reload]);

  async function createSettlement() {
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/legal/cases/${params.caseId}/settlements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlement_date: date,
          monetary_amount_cents: amountCents,
          currency,
          payment_method: paymentMethod || undefined,
          nda_required: ndaRequired,
          release_scope: releaseScope,
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setAmountCents(0);
      setPaymentMethod('');
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function patch(settlementId: string, action: string) {
    setBusy(`${settlementId}-${action}`);
    setError(null);
    try {
      const r = await fetch(`/api/admin/legal/settlements/${settlementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function dollar(cents: number) {
    return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const requiresCfo = amountCents >= 500_000;
  const requiresCeo = amountCents >= 2_500_000;

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href={`/admin/legal/cases/${params.caseId}`} className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Case
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold mt-2 inline-flex items-center gap-2">
          <ScaleIcon className="w-6 h-6" strokeWidth={1.5} /> Settlement
        </h1>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <h2 className="text-sm font-semibold">Draft new settlement</h2>

          <label className="text-xs text-gray-400 block">Settlement date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5 text-white" />

          <label className="text-xs text-gray-400 block">Amount (cents)</label>
          <input type="number" min={0} value={amountCents} onChange={(e) => setAmountCents(Number(e.target.value))}
            className="w-full text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5 text-white" />
          <div className="text-[10px] text-gray-500">
            {dollar(amountCents)}.
            {requiresCeo
              ? ' Requires Compliance + CFO + CEO approval.'
              : requiresCfo
                ? ' Requires Compliance + CFO approval.'
                : ' Requires Compliance approval only.'}
          </div>

          <label className="text-xs text-gray-400 block">Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}
            className="w-full text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5 text-white">
            <option value="USD">USD</option>
            <option value="CAD">CAD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>

          <label className="text-xs text-gray-400 block">Payment method</label>
          <input type="text" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
            placeholder="wire, ACH, check"
            className="w-full text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5 text-white" />

          <label className="text-xs text-gray-400 block">Release scope</label>
          <select value={releaseScope} onChange={(e) => setReleaseScope(e.target.value)}
            className="w-full text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5 text-white">
            {SETTLEMENT_RELEASE_SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <label className="text-xs text-gray-300 inline-flex items-center gap-1">
            <input type="checkbox" checked={ndaRequired} onChange={(e) => setNdaRequired(e.target.checked)} />
            NDA required
          </label>

          <button
            disabled={submitting || amountCents < 0}
            onClick={createSettlement}
            className="w-full text-xs px-3 py-2 rounded border border-copper text-copper hover:bg-copper/10 disabled:opacity-50 inline-flex items-center justify-center gap-1"
          >
            {submitting ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : null}
            Draft settlement
          </button>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Existing settlements ({settlements.length})</h2>
            <button onClick={reload} className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
            </button>
          </div>
          {loading ? (
            <div className="text-xs text-gray-400 inline-flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> Loading
            </div>
          ) : settlements.length === 0 ? (
            <div className="text-xs text-gray-500 italic">No settlements drafted yet.</div>
          ) : (
            <div className="grid gap-3">
              {settlements.map((s) => {
                const st = statusOf(s);
                return (
                  <div key={s.settlement_id} className="rounded border border-white/10 px-3 py-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-mono">{dollar(s.monetary_amount_cents)} {s.currency}</div>
                        <div className="text-[10px] text-gray-400">tier {s.approval_tier} &middot; date {s.settlement_date}</div>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_TONE[st]}`}>{st}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {!s.approved_at && (
                        <button disabled={busy !== null} onClick={() => patch(s.settlement_id, 'compliance_approve')}
                          className="text-[10px] px-2 py-1 rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50">
                          Compliance approve
                        </button>
                      )}
                      {s.approval_tier !== 'compliance_only' && !s.cfo_approved_at && (
                        <button disabled={busy !== null} onClick={() => patch(s.settlement_id, 'cfo_approve')}
                          className="text-[10px] px-2 py-1 rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50">
                          CFO approve
                        </button>
                      )}
                      {s.approval_tier === 'compliance_plus_cfo_plus_ceo' && !s.ceo_approved_at && (
                        <button disabled={busy !== null} onClick={() => patch(s.settlement_id, 'ceo_approve')}
                          className="text-[10px] px-2 py-1 rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50">
                          CEO approve
                        </button>
                      )}
                      {!s.executed_at && (
                        <button disabled={busy !== null} onClick={() => patch(s.settlement_id, 'execute')}
                          className="text-[10px] px-2 py-1 rounded border border-sky-500/40 text-sky-300 hover:bg-sky-500/10 disabled:opacity-50 inline-flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" strokeWidth={1.5} /> Execute
                        </button>
                      )}
                      {s.executed_at && !s.payment_received_at && (
                        <button disabled={busy !== null} onClick={() => patch(s.settlement_id, 'mark_paid')}
                          className="text-[10px] px-2 py-1 rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50">
                          Mark paid
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
