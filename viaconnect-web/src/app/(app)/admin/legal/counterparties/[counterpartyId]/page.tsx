'use client';

// Prompt #104 Phase 2: Counterparty profile.

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface Counterparty {
  counterparty_id: string;
  display_label: string;
  counterparty_type: string;
  primary_jurisdiction: string | null;
  jurisdictions: string[];
  verified_business_reg_id: string | null;
  verified_domain: string | null;
  marketplace_handles: Array<{ platform: string; handle: string; admin_confirmed: boolean }>;
  identity_confidence: number;
  disputed_identity: boolean;
  total_cases_count: number;
  total_settlement_cents: number;
  first_seen_at: string;
  last_activity_at: string;
  notes: string | null;
}

export default function CounterpartyDetailPage() {
  const params = useParams<{ counterpartyId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cp, setCp] = useState<Counterparty | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Reuse the list endpoint with a search by counterparty id
      const r = await fetch(`/api/admin/legal/counterparties?q=`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      const found = (json.rows ?? []).find((row: Counterparty) => row.counterparty_id === params.counterpartyId);
      if (!found) throw new Error('Counterparty not found');
      setCp(found);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [params.counterpartyId]);

  useEffect(() => { reload(); }, [reload]);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin/legal/counterparties" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Counterparties
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <h1 className="text-2xl md:text-3xl font-bold">{cp?.display_label ?? params.counterpartyId.slice(0, 8)}</h1>
          <button onClick={reload} className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 self-start md:self-auto">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> {error}
        </div>
      )}

      {loading && (
        <div className="text-sm text-gray-400 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
        </div>
      )}

      {!loading && cp && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-semibold mb-3">Identity</h2>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <dt className="text-gray-400">Type</dt>
              <dd className="font-mono">{cp.counterparty_type}</dd>
              <dt className="text-gray-400">Confidence</dt>
              <dd>{Math.round(cp.identity_confidence * 100)}%</dd>
              <dt className="text-gray-400">Jurisdictions</dt>
              <dd>{[cp.primary_jurisdiction, ...cp.jurisdictions.filter((j) => j !== cp.primary_jurisdiction)].filter(Boolean).join(', ') || <span className="text-gray-500 italic">none</span>}</dd>
              {cp.verified_business_reg_id && (
                <>
                  <dt className="text-gray-400">Business reg</dt>
                  <dd className="font-mono">{cp.verified_business_reg_id}</dd>
                </>
              )}
              {cp.verified_domain && (
                <>
                  <dt className="text-gray-400">Verified domain</dt>
                  <dd className="font-mono">{cp.verified_domain}</dd>
                </>
              )}
              {cp.disputed_identity && (
                <>
                  <dt className="text-gray-400">Disputed</dt>
                  <dd className="text-rose-300">yes</dd>
                </>
              )}
            </dl>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-semibold mb-3">Activity</h2>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <dt className="text-gray-400">First seen</dt>
              <dd>{new Date(cp.first_seen_at).toLocaleString()}</dd>
              <dt className="text-gray-400">Last activity</dt>
              <dd>{new Date(cp.last_activity_at).toLocaleString()}</dd>
              <dt className="text-gray-400">Cases (total)</dt>
              <dd>{cp.total_cases_count}</dd>
              <dt className="text-gray-400">Settlements (total)</dt>
              <dd>${(cp.total_settlement_cents / 100).toLocaleString()}</dd>
            </dl>
          </section>

          <section className="lg:col-span-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-semibold mb-3">Marketplace handles ({cp.marketplace_handles.length})</h2>
            {cp.marketplace_handles.length === 0 ? (
              <div className="text-xs text-gray-500 italic">No marketplace handles recorded.</div>
            ) : (
              <ul className="text-xs space-y-1">
                {cp.marketplace_handles.map((h, i) => (
                  <li key={i} className="flex items-center justify-between border border-white/10 rounded px-2 py-1">
                    <span><span className="font-mono">{h.platform}</span>: {h.handle}</span>
                    {h.admin_confirmed
                      ? <span className="text-[10px] px-1 py-0.5 rounded border border-emerald-500/30 text-emerald-300">admin-confirmed</span>
                      : <span className="text-[10px] px-1 py-0.5 rounded border border-amber-500/30 text-amber-300">unconfirmed</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {cp.notes && (
            <section className="lg:col-span-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="text-sm font-semibold mb-2">Notes</h2>
              <pre className="text-xs whitespace-pre-wrap text-gray-300">{cp.notes}</pre>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
