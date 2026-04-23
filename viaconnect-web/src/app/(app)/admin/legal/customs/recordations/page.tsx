'use client';

// Prompt #114 P2a: Customs recordations list.
//
// Clones the /admin/legal/cases/page.tsx shape: header with back link,
// status filter, reload button, empty/loading/error states, clickable
// card rows linking to /recordations/[id]. Mobile + desktop responsive
// per CLAUDE.md quality gate. No dashes in UI copy.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  AlertCircle,
  Plus,
  FileText,
  ShieldCheck,
  CalendarClock,
} from 'lucide-react';
import {
  CUSTOMS_RECORDATION_STATUSES,
  type CustomsRecordationStatus,
  type CustomsRecordationType,
} from '@/lib/customs/types';
import { formatCents } from '@/lib/customs/cbpFeeCalculator';

interface RecordationRow {
  recordation_id: string;
  recordation_type: CustomsRecordationType;
  status: CustomsRecordationStatus;
  mark_text: string | null;
  cbp_recordation_number: string | null;
  cbp_expiration_date: string | null;
  cbp_grace_expiration_date: string | null;
  total_ic_count: number | null;
  total_fee_cents: number | null;
  submitted_at: string | null;
  counsel_reviewed_at: string | null;
  ceo_approved_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_TONE: Record<CustomsRecordationStatus, string> = {
  draft:         'border-white/10 text-gray-300 bg-white/5',
  pending_fee:   'border-amber-500/30 text-amber-300 bg-amber-500/10',
  under_review:  'border-sky-500/40 text-sky-300 bg-sky-500/10',
  active:        'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
  grace_period:  'border-orange-500/40 text-orange-300 bg-orange-500/10',
  expired:       'border-rose-500/40 text-rose-300 bg-rose-500/10',
  withdrawn:     'border-white/5 text-gray-500 bg-white/[0.01]',
};

const TYPE_TONE: Record<CustomsRecordationType, string> = {
  trademark: 'border-[#2DA5A0]/40 text-[#2DA5A0]',
  copyright: 'border-purple-500/40 text-purple-300',
};

export default function CustomsRecordationsListPage() {
  const [rows, setRows] = useState<RecordationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const r = await fetch(`/api/admin/legal/customs/recordations?${params.toString()}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setRows(json.rows ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { reload(); }, [reload]);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link
          href="/admin/legal/customs"
          className="text-xs text-gray-400 hover:text-white inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Customs
        </Link>
        <div className="flex flex-col gap-3 mt-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold inline-flex items-center gap-2">
              <ShieldCheck className="w-6 h-6" strokeWidth={1.5} />
              Recordations
            </h1>
            <p className="text-sm text-gray-400 mt-1 max-w-3xl">
              CBP IPRR filings under 19 C.F.R. Part 133. One row per recordation; expired and grace-period rows stay visible for audit.
            </p>
          </div>
          <div className="flex gap-2 self-start md:self-auto">
            <button
              onClick={reload}
              className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 min-h-[44px] md:min-h-0"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
            </button>
            <Link
              href="/admin/legal/customs/recordations/new"
              className="text-xs inline-flex items-center gap-1 px-3 py-1 rounded border border-[#2DA5A0]/40 bg-[#2DA5A0]/10 text-[#2DA5A0] hover:bg-[#2DA5A0]/20 min-h-[44px] md:min-h-0"
            >
              <Plus className="w-3 h-3" strokeWidth={1.5} /> New recordation
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-base md:text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1 min-h-[44px] md:min-h-0"
        >
          <option value="">All statuses</option>
          {CUSTOMS_RECORDATION_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
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
          No recordations match the current filter. Start one with the New recordation button above.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="grid gap-2">
          {rows.map((r) => (
            <Link
              key={r.recordation_id}
              href={`/admin/legal/customs/recordations/${r.recordation_id}`}
              className="block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 hover:border-[#2DA5A0]/60"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-sm truncate">
                    {r.cbp_recordation_number ?? (
                      <span className="italic text-gray-500">no CBP number yet</span>
                    )}
                  </div>
                  <div className="text-sm mt-0.5 truncate">
                    {r.mark_text ?? (
                      <span className="italic text-gray-500">Copyright filing</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 inline-flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <FileText className="w-3 h-3" strokeWidth={1.5} />
                      {r.total_ic_count ? `${r.total_ic_count} IC` : 'no IC classes'}
                    </span>
                    {r.total_fee_cents !== null && (
                      <span>{formatCents(r.total_fee_cents)} total fee</span>
                    )}
                    {r.cbp_expiration_date && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="w-3 h-3" strokeWidth={1.5} />
                        expires {r.cbp_expiration_date}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${TYPE_TONE[r.recordation_type]}`}>
                    {r.recordation_type}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_TONE[r.status]}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
