'use client';

// Prompt #104 Phase 2: Counterparty registry list.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, RefreshCw, AlertCircle, AlertTriangle, Plus } from 'lucide-react';

interface Row {
  counterparty_id: string;
  display_label: string;
  counterparty_type: string;
  primary_jurisdiction: string | null;
  identity_confidence: number;
  disputed_identity: boolean;
  total_cases_count: number;
  total_settlement_cents: number;
  last_activity_at: string;
}

export default function CounterpartiesListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [disputedOnly, setDisputedOnly] = useState(false);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (disputedOnly) params.set('disputed_only', 'true');
      if (search) params.set('q', search);
      const r = await fetch(`/api/admin/legal/counterparties?${params.toString()}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setRows(json.rows ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, [disputedOnly]);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin/legal" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Legal Ops
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Counterparties</h1>
            <p className="text-sm text-gray-400 mt-1">
              Resellers and other entities under enforcement consideration. Identity confidence is human-verified; AI-only inferences are blocked at intake.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <Link
              href="/admin/legal/counterparties/new"
              className="text-xs px-2 py-1 rounded border border-copper text-copper hover:bg-copper/10 inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" strokeWidth={1.5} /> New
            </Link>
            <button onClick={reload} className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') reload(); }}
          placeholder="Search by display label"
          className="text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1 text-white flex-1 max-w-xs"
        />
        <label className="text-xs text-gray-300 inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10">
          <input type="checkbox" checked={disputedOnly} onChange={(e) => setDisputedOnly(e.target.checked)} />
          Disputed only
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
          No counterparties match.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="grid gap-2">
          {rows.map((r) => (
            <Link
              key={r.counterparty_id}
              href={`/admin/legal/counterparties/${r.counterparty_id}`}
              className="block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 hover:border-copper"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <div className="font-medium">{r.display_label}</div>
                  <div className="text-xs text-gray-400 mt-0.5 inline-flex items-center gap-2">
                    <span className="font-mono">{r.counterparty_type}</span>
                    {r.primary_jurisdiction && <span>{r.primary_jurisdiction}</span>}
                    <span>{r.total_cases_count} case{r.total_cases_count === 1 ? '' : 's'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.disputed_identity && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-rose-500/40 text-rose-300 inline-flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" strokeWidth={1.5} /> disputed
                    </span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-gray-300">
                    confidence {Math.round(r.identity_confidence * 100)}%
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
