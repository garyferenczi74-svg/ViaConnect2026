'use client';

// Prompt #95 Phase 5: grandfathering inspection UI.
// Shows active customer_price_bindings, filterable by domain + policy +
// expiration window.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Download, Filter, ShieldCheck } from 'lucide-react';

const supabase = createClient();

interface BindingRow {
  id: string;
  user_id: string | null;
  practitioner_id: string | null;
  pricing_domain_id: string;
  target_object_id: string;
  bound_value_cents: number | null;
  bound_value_percent: number | null;
  bound_at: string;
  binding_expires_at: string | null;
  grandfathering_policy: string;
  status: string;
  authorized_by_proposal_id: string;
}

export default function GrandfatheringPage() {
  const [rows, setRows] = useState<BindingRow[]>([]);
  const [domainFilter, setDomainFilter] = useState('');
  const [policyFilter, setPolicyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'expired' | 'superseded' | ''>('active');

  const refresh = useCallback(async () => {
    let q = supabase
      .from('customer_price_bindings')
      .select(
        'id, user_id, practitioner_id, pricing_domain_id, target_object_id, bound_value_cents, bound_value_percent, bound_at, binding_expires_at, grandfathering_policy, status, authorized_by_proposal_id',
      )
      .order('bound_at', { ascending: false })
      .limit(500);
    if (domainFilter) q = q.eq('pricing_domain_id', domainFilter);
    if (policyFilter) q = q.eq('grandfathering_policy', policyFilter);
    if (statusFilter) q = q.eq('status', statusFilter);
    const { data } = await q;
    setRows((data ?? []) as BindingRow[]);
  }, [domainFilter, policyFilter, statusFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const byDomain = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) map[r.pricing_domain_id] = (map[r.pricing_domain_id] ?? 0) + 1;
    return map;
  }, [rows]);

  const downloadCsv = () => {
    const header = 'id,subject,pricing_domain_id,target_object_id,bound_value_cents,bound_value_percent,bound_at,binding_expires_at,policy,status,proposal_id';
    const lines = rows.map((r) =>
      [
        r.id,
        r.user_id ?? `practitioner:${r.practitioner_id}`,
        r.pricing_domain_id,
        r.target_object_id,
        r.bound_value_cents ?? '',
        r.bound_value_percent ?? '',
        r.bound_at,
        r.binding_expires_at ?? '',
        r.grandfathering_policy,
        r.status,
        r.authorized_by_proposal_id,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const blob = new Blob([header + '\n' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grandfathered-bindings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <Link
            href="/admin/governance/proposals"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Proposals
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-2 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} /> Grandfathered customers
          </h1>
          <p className="text-xs text-white/55 mt-1">
            {rows.length} bindings shown. Use filters to narrow.
          </p>
        </div>

        <div className="grid sm:grid-cols-4 gap-2">
          <input
            type="text"
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            placeholder="Pricing domain id"
            className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-2 py-2 text-xs text-white"
          />
          <select
            value={policyFilter}
            onChange={(e) => setPolicyFilter(e.target.value)}
            className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-2 py-2 text-xs text-white"
          >
            <option value="">All policies</option>
            {['indefinite', 'twelve_months', 'six_months', 'thirty_days'].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-2 py-2 text-xs text-white"
          >
            {['active', 'expired', 'superseded', ''].map((s) => (
              <option key={s} value={s}>{s || 'All statuses'}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={downloadCsv}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2DA5A0] text-[#0B1520] px-3 py-2 text-xs font-semibold hover:bg-[#2DA5A0]/90"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={1.5} /> Export CSV
          </button>
        </div>

        <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
          <h2 className="text-sm font-semibold mb-2">By pricing domain</h2>
          {Object.keys(byDomain).length === 0 ? (
            <p className="text-xs text-white/55">No bindings match.</p>
          ) : (
            <ul className="text-xs text-white/75 space-y-1">
              {Object.entries(byDomain).sort((a, b) => b[1] - a[1]).map(([d, n]) => (
                <li key={d} className="flex justify-between bg-white/[0.04] rounded-lg px-2 py-1">
                  <span>{d}</span>
                  <span className="font-semibold">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 overflow-hidden">
          {rows.length === 0 ? (
            <p className="p-4 text-xs text-white/55 text-center">No bindings yet.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {rows.map((r) => (
                <li key={r.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">
                      <code className="text-white/70">{r.user_id ?? `practitioner:${r.practitioner_id}`}</code>
                    </p>
                    <p className="text-[11px] text-white/55">
                      {r.pricing_domain_id}{' . '}
                      {r.bound_value_cents !== null
                        ? `$${(r.bound_value_cents / 100).toFixed(2)}`
                        : r.bound_value_percent !== null
                        ? `${r.bound_value_percent}%`
                        : 'n/a'}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="rounded-lg bg-white/[0.06] text-white/70 px-2 py-0.5 text-[10px]">
                      {r.grandfathering_policy}
                    </span>
                    <span
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${
                        r.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : r.status === 'expired'
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-white/[0.08] text-white/60'
                      }`}
                    >
                      {r.status}
                    </span>
                    {r.binding_expires_at && (
                      <span className="text-[11px] text-white/55">
                        expires {new Date(r.binding_expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-[11px] text-white/40 flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5" strokeWidth={1.5} /> CSV export respects the current filters.
          Never contains PII beyond user_id UUID.
        </p>
      </div>
    </div>
  );
}
