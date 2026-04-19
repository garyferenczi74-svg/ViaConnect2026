'use client';

// Prompt #95 Phase 3: proposal list page.
// Filter by status, domain, impact tier, initiator. Search by title.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, FilePlus, Filter, Search, ShieldCheck } from 'lucide-react';

const supabase = createClient();

interface ProposalRow {
  id: string;
  proposal_number: number;
  title: string;
  pricing_domain_id: string;
  current_value_cents: number | null;
  proposed_value_cents: number | null;
  current_value_percent: number | null;
  proposed_value_percent: number | null;
  percent_change: number | null;
  change_type: string;
  impact_tier: string;
  status: string;
  is_emergency: boolean;
  initiated_by: string;
  initiated_at: string;
  proposed_effective_date: string;
  expires_at: string;
}

const STATUSES = [
  '', 'draft', 'submitted_for_approval', 'under_review',
  'approved_pending_activation', 'activated', 'rolled_back',
  'rejected', 'withdrawn', 'expired',
];
const TIERS = ['', 'minor', 'moderate', 'major', 'structural'];

function tierColor(tier: string): string {
  switch (tier) {
    case 'minor': return 'bg-emerald-500/15 text-emerald-300';
    case 'moderate': return 'bg-sky-500/15 text-sky-300';
    case 'major': return 'bg-amber-500/15 text-amber-300';
    case 'structural': return 'bg-red-500/15 text-red-300';
    default: return 'bg-white/[0.06] text-white/60';
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'draft': return 'bg-white/[0.08] text-white/70';
    case 'submitted_for_approval':
    case 'under_review': return 'bg-amber-500/15 text-amber-300';
    case 'approved_pending_activation': return 'bg-sky-500/15 text-sky-300';
    case 'activated': return 'bg-emerald-500/15 text-emerald-300';
    case 'rejected':
    case 'rolled_back':
    case 'withdrawn':
    case 'expired': return 'bg-red-500/15 text-red-300';
    default: return 'bg-white/[0.06] text-white/60';
  }
}

export default function ProposalsListPage() {
  const [rows, setRows] = useState<ProposalRow[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [emergencyOnly, setEmergencyOnly] = useState(false);

  const refresh = useCallback(async () => {
    let q = supabase
      .from('pricing_proposals')
      .select(
        'id, proposal_number, title, pricing_domain_id, current_value_cents, proposed_value_cents, current_value_percent, proposed_value_percent, percent_change, change_type, impact_tier, status, is_emergency, initiated_by, initiated_at, proposed_effective_date, expires_at',
      )
      .order('initiated_at', { ascending: false })
      .limit(200);
    if (statusFilter) q = q.eq('status', statusFilter);
    if (tierFilter) q = q.eq('impact_tier', tierFilter);
    if (emergencyOnly) q = q.eq('is_emergency', true);
    const { data } = await q;
    setRows((data ?? []) as ProposalRow[]);
  }, [statusFilter, tierFilter, emergencyOnly]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.title.toLowerCase().includes(s));
  }, [rows, search]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <Link
              href="/admin/governance/decision-rights"
              className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Decision rights
            </Link>
            <h1 className="text-xl sm:text-2xl font-semibold mt-2 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} /> Pricing proposals
            </h1>
            <p className="text-xs text-white/55 mt-1">
              {rows.length} proposals tracked. Click any row to open.
            </p>
          </div>
          <Link
            href="/admin/governance/proposals/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#2DA5A0] text-[#0B1520] px-4 py-2 text-sm font-semibold hover:bg-[#2DA5A0]/90"
          >
            <FilePlus className="h-4 w-4" strokeWidth={1.5} /> New proposal
          </Link>
        </div>

        <div className="grid sm:grid-cols-4 gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title"
              className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] pl-9 pr-3 py-2 text-xs text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-2 py-2 text-xs text-white"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s || 'All statuses'}</option>
            ))}
          </select>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-2 py-2 text-xs text-white"
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>{t || 'All tiers'}</option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 text-xs text-white/75">
            <input
              type="checkbox"
              checked={emergencyOnly}
              onChange={(e) => setEmergencyOnly(e.target.checked)}
            />
            Emergency only
          </label>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 overflow-hidden">
          {filtered.length === 0 ? (
            <p className="p-6 text-xs text-white/55 text-center">No proposals yet.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {filtered.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/admin/governance/proposals/${r.id}`}
                    className="block p-3 hover:bg-white/[0.02]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <span className="text-[10px] font-mono text-white/40 w-16 shrink-0">
                        #{r.proposal_number}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{r.title}</p>
                        <p className="text-[11px] text-white/55">
                          {r.pricing_domain_id}
                          {r.percent_change !== null ? ` . ${r.percent_change.toFixed(2)}%` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {r.is_emergency && (
                          <span className="rounded-lg bg-red-500/20 text-red-300 px-2 py-0.5 text-[10px] font-semibold">
                            EMERGENCY
                          </span>
                        )}
                        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${tierColor(r.impact_tier)}`}>
                          {r.impact_tier}
                        </span>
                        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${statusColor(r.status)}`}>
                          {r.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-[11px] text-white/40 flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5" strokeWidth={1.5} /> Filters run server-side via RLS.
          Only admins see this page.
        </p>
      </div>
    </div>
  );
}
