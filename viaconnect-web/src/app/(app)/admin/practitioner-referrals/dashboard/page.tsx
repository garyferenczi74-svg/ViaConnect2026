'use client';

// Prompt #98 Phase 7: Admin program health dashboard.
//
// Five sections (program, per_referrer, milestones, financial, tax).
// Each renders the JSON payload as a table and exposes a CSV download
// button hitting /api/admin/practitioner-referrals/reporting with
// format=csv. Mirrors the Prompt #96 white-label reporting page.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Download,
  AlertCircle,
} from 'lucide-react';

type Section = 'program' | 'per_referrer' | 'milestones' | 'financial' | 'tax';

const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: 'program',      label: 'Program' },
  { id: 'per_referrer', label: 'Per referrer' },
  { id: 'milestones',   label: 'Milestones' },
  { id: 'financial',    label: 'Financial' },
  { id: 'tax',          label: 'Tax' },
];

export default function PractitionerReferralDashboardPage() {
  const [section, setSection] = useState<Section>('program');
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/practitioner-referrals/reporting?section=${section}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setRows(json.rows ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, [section]);

  const columns = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin/practitioner-referrals/fraud-review" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Practitioner referrals
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Program health</h1>
            <p className="text-sm text-gray-400 mt-1">Referral program metrics. Download CSV per section for spreadsheet analysis.</p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <a
              href={`/api/admin/practitioner-referrals/reporting?section=${section}&format=csv`}
              className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10"
              download
            >
              <Download className="w-3 h-3" strokeWidth={1.5} /> CSV
            </a>
            <button onClick={reload} className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
            </button>
          </div>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 mb-6">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`text-xs px-3 py-1.5 rounded border ${
              section === s.id ? 'border-copper text-copper bg-copper/10' : 'border-white/10 text-gray-300 hover:text-white'
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

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
          No rows for this section yet.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-400">
              <tr>
                {columns.map((c) => <th key={c} className="text-left px-3 py-2">{c.replace(/_/g, ' ')}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-white/5">
                  {columns.map((c) => {
                    const v = row[c];
                    const display = v === null || v === undefined
                      ? 'n/a'
                      : typeof v === 'boolean' ? String(v)
                      : typeof v === 'number' ? v.toLocaleString()
                      : String(v);
                    return <td key={c} className="px-3 py-2 font-mono text-xs">{display}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
