'use client';

// Prompt #104 Phase 6: Outside counsel roster (admin only per RLS).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, RefreshCw, AlertCircle, Briefcase } from 'lucide-react';

interface Row {
  counsel_id: string;
  firm_name: string;
  attorney_name: string;
  specialty: string[];
  jurisdictions: string[];
  billing_rate_cents: number | null;
  retainer_required: boolean;
  retainer_amount_cents: number | null;
  active: boolean;
  created_at: string;
}

export default function CounselRosterPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeOnly, setActiveOnly] = useState(true);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/legal/counsel?active_only=${activeOnly}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setRows(json.rows ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, [activeOnly]);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin/legal" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Legal Ops
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold inline-flex items-center gap-2">
              <Briefcase className="w-6 h-6" strokeWidth={1.5} /> Outside counsel
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Roster of vetted counsel. Engagements require CFO approval over $5,000 and CEO approval over $25,000.
            </p>
          </div>
          <button onClick={reload} className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 self-start md:self-auto">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 mb-6">
        <label className="text-xs text-gray-300 inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10">
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
          Active only
        </label>
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
          No counsel records yet. Roster must be seeded by Gary + Steve Rica.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="grid gap-2">
          {rows.map((r) => (
            <div key={r.counsel_id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <div className="font-medium">{r.firm_name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{r.attorney_name}</div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    Specialty: {r.specialty.join(', ') || 'unspecified'} &middot; Jurisdictions: {r.jurisdictions.join(', ') || 'unspecified'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.billing_rate_cents !== null && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-gray-300">
                      ${(r.billing_rate_cents / 100).toLocaleString()}/hr
                    </span>
                  )}
                  {r.retainer_required && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-300">
                      Retainer required
                    </span>
                  )}
                  {!r.active && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-gray-500">
                      inactive
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
