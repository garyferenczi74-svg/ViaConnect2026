'use client';

// Prompt #104 Phase 2: Cases list.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, RefreshCw, AlertCircle, AlertTriangle, ShieldAlert } from 'lucide-react';

interface CaseRow {
  case_id: string;
  case_label: string;
  state: string;
  bucket: string;
  priority: string;
  has_medical_claim_flag: boolean;
  intake_at: string;
  estimated_damages_cents: number | null;
  counterparty_id: string | null;
  counterparty_label: string | null;
}

const STATE_TONE: Record<string, string> = {
  intake:                          'border-white/10 text-gray-300 bg-white/5',
  triage_ai:                       'border-amber-500/30 text-amber-300 bg-amber-500/10',
  pending_human_triage:            'border-amber-500/40 text-amber-300 bg-amber-500/10',
  pending_medical_director_review: 'border-rose-500/40 text-rose-300 bg-rose-500/10',
  classified:                      'border-sky-500/40 text-sky-300 bg-sky-500/10',
  active_enforcement:              'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
  resolved_successful:             'border-emerald-500/20 text-emerald-300/70 bg-emerald-500/5',
  resolved_unsuccessful:           'border-rose-500/30 text-rose-300/80 bg-rose-500/10',
  escalated_to_outside_counsel:    'border-purple-500/40 text-purple-300 bg-purple-500/10',
  escalated_to_litigation:         'border-purple-500/60 text-purple-200 bg-purple-500/15',
  closed_no_action:                'border-white/10 text-gray-400 bg-white/[0.02]',
  archived:                        'border-white/5 text-gray-500 bg-white/[0.01]',
};

const BUCKET_TONE: Record<string, string> = {
  unclassified:                     'border-white/10 text-gray-300',
  map_only:                         'border-amber-500/30 text-amber-300',
  gray_market_no_differences:       'border-orange-500/30 text-orange-300',
  gray_market_material_differences: 'border-rose-500/40 text-rose-300',
  counterfeit:                      'border-rose-500/60 text-rose-200',
};

export default function CasesListPage() {
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<string>('');
  const [bucketFilter, setBucketFilter] = useState<string>('');

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (stateFilter) params.set('state', stateFilter);
      if (bucketFilter) params.set('bucket', bucketFilter);
      const r = await fetch(`/api/admin/legal/cases?${params.toString()}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setRows(json.rows ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, [stateFilter, bucketFilter]);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin/legal" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Legal Ops
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Cases</h1>
            <p className="text-sm text-gray-400 mt-1">All legal investigation cases. Click a row for detail, evidence, and timeline.</p>
          </div>
          <button onClick={reload} className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 self-start md:self-auto">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 mb-6">
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1">
          <option value="">All states</option>
          {Object.keys(STATE_TONE).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={bucketFilter} onChange={(e) => setBucketFilter(e.target.value)} className="text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1">
          <option value="">All buckets</option>
          {Object.keys(BUCKET_TONE).map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

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

      {!loading && rows.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-gray-300">
          No cases match the current filters.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="grid gap-2">
          {rows.map((r) => (
            <Link
              key={r.case_id}
              href={`/admin/legal/cases/${r.case_id}`}
              className="block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 hover:border-copper"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <div className="font-mono text-sm">{r.case_label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {r.counterparty_label ?? <span className="italic text-gray-500">No counterparty linked</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {r.has_medical_claim_flag && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-rose-500/40 text-rose-300 inline-flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" strokeWidth={1.5} /> medical claim
                    </span>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${BUCKET_TONE[r.bucket] ?? 'border-white/10 text-gray-300'}`}>{r.bucket}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATE_TONE[r.state] ?? 'border-white/10 text-gray-300'}`}>{r.state}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-gray-300">{r.priority}</span>
                  {r.priority === 'p1_critical' && <AlertTriangle className="w-3 h-3 text-rose-300" strokeWidth={1.5} />}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
