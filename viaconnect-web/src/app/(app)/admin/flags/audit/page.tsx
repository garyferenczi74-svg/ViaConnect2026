'use client';

// Prompt #93 Phase 6: searchable audit trail with CSV export.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Download, Filter, History } from 'lucide-react';

const supabase = createClient();

interface AuditRow {
  id: string;
  feature_id: string;
  change_type: string;
  change_reason: string | null;
  changed_by: string;
  changed_at: string;
  previous_state: unknown;
  new_state: unknown;
}

const CHANGE_TYPES = [
  'created', 'activated', 'deactivated', 'phase_changed',
  'rollout_percentage_changed', 'rollout_strategy_changed',
  'kill_switch_engaged', 'kill_switch_released',
  'scheduled_activation_set', 'scheduled_activation_canceled',
  'cohort_added', 'cohort_removed',
  'owner_changed', 'description_updated',
];

export default function AdminFlagAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [featureFilter, setFeatureFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    let query = supabase
      .from('feature_flag_audit')
      .select('id, feature_id, change_type, change_reason, changed_by, changed_at, previous_state, new_state')
      .order('changed_at', { ascending: false })
      .limit(500);

    if (featureFilter.trim()) query = query.eq('feature_id', featureFilter.trim());
    if (typeFilter) query = query.eq('change_type', typeFilter);
    if (since) query = query.gte('changed_at', since);
    if (until) query = query.lte('changed_at', until);

    const { data } = await query;
    setRows((data ?? []) as AuditRow[]);
  }, [featureFilter, typeFilter, since, until]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (featureFilter.trim()) params.set('feature', featureFilter.trim());
    if (typeFilter) params.set('change_type', typeFilter);
    if (since) params.set('since', since);
    if (until) params.set('until', until);
    return `/api/admin/flags/audit/export?${params.toString()}`;
  }, [featureFilter, typeFilter, since, until]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        <div>
          <Link
            href="/admin/flags"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Back to flags
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-2 flex items-center gap-2">
            <History className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} /> Audit trail
          </h1>
          <p className="text-xs text-white/55 mt-1">
            Showing {rows.length} rows (max 500). Use filters to narrow.
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 grid sm:grid-cols-5 gap-2">
          <input
            type="text"
            value={featureFilter}
            onChange={(e) => setFeatureFilter(e.target.value)}
            placeholder="feature_id"
            className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
          >
            <option value="">All change types</option>
            {CHANGE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
          />
          <input
            type="datetime-local"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-xs text-white"
          />
          <a
            href={exportUrl}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2DA5A0] text-[#0B1520] px-3 py-1.5 text-xs font-semibold hover:bg-[#2DA5A0]/90"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={1.5} /> Export CSV
          </a>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 overflow-hidden">
          {rows.length === 0 ? (
            <p className="p-4 text-xs text-white/55">No rows match.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {rows.map((r) => {
                const isOpen = expanded === r.id;
                return (
                  <li key={r.id} className="p-3">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : r.id)}
                      className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          <Link href={`/admin/flags/${r.feature_id}`} className="hover:text-[#2DA5A0]" onClick={(e) => e.stopPropagation()}>
                            {r.feature_id}
                          </Link>
                          <span className="text-white/55"> · {r.change_type}</span>
                        </p>
                        {r.change_reason && (
                          <p className="text-[11px] text-white/55">{r.change_reason}</p>
                        )}
                      </div>
                      <span className="text-[11px] text-white/50">
                        {new Date(r.changed_at).toLocaleString()}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="mt-2 grid sm:grid-cols-2 gap-2 text-[10px] text-white/70">
                        <div>
                          <p className="text-white/50 mb-1">previous_state</p>
                          <pre className="bg-[#0B1520] rounded-lg p-2 overflow-x-auto">
                            {JSON.stringify(r.previous_state, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <p className="text-white/50 mb-1">new_state</p>
                          <pre className="bg-[#0B1520] rounded-lg p-2 overflow-x-auto">
                            {JSON.stringify(r.new_state, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="text-[11px] text-white/40 flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5" strokeWidth={1.5} /> CSV export respects the current filters.
        </p>
      </div>
    </div>
  );
}
