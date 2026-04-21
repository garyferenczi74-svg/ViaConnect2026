'use client';

// Prompt #104 Phase 3: Templates list + counsel-review badge.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, RefreshCw, AlertCircle, FileText, ShieldCheck, ShieldAlert } from 'lucide-react';

interface Row {
  template_id: string;
  template_family: string;
  version: string;
  applicable_buckets: string[];
  applicable_jurisdictions: string[];
  required_merge_fields: string[];
  status: 'draft' | 'active' | 'retired';
  last_counsel_review_at: string | null;
  last_counsel_reviewer: string | null;
  created_at: string;
}

const STATUS_TONE: Record<Row['status'], string> = {
  draft:    'border-amber-500/40 text-amber-300 bg-amber-500/10',
  active:   'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
  retired:  'border-white/10 text-gray-400 bg-white/[0.02]',
};

export default function TemplatesListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const r = await fetch(`/api/admin/legal/templates?${params.toString()}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setRows(json.rows ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, [statusFilter]);

  // Group by template_family so newest versions of each are visible together.
  const grouped: Record<string, Row[]> = {};
  for (const r of rows) {
    if (!grouped[r.template_family]) grouped[r.template_family] = [];
    grouped[r.template_family].push(r);
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin/legal" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Legal Ops
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold inline-flex items-center gap-2">
              <FileText className="w-6 h-6" strokeWidth={1.5} /> Templates
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Versioned cease-and-desist + DMCA + marketplace IP complaint templates. Drafts require counsel review before activation; active templates are append-only versioned.
            </p>
          </div>
          <button onClick={reload} className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 self-start md:self-auto">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 mb-6">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="retired">Retired</option>
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
          No templates match.
        </div>
      )}

      {!loading && Object.entries(grouped).map(([family, versions]) => (
        <section key={family} className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-sm font-semibold mb-2 font-mono">{family}</h2>
          <div className="grid gap-2">
            {versions.map((v) => (
              <Link
                key={v.template_id}
                href={`/admin/legal/templates/${v.template_id}`}
                className="block rounded border border-white/5 px-3 py-2 hover:border-copper"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="text-xs">
                    <span className="font-mono">{v.version}</span>
                    <span className="text-gray-500 ml-2">
                      buckets: {v.applicable_buckets.join(', ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.last_counsel_review_at
                      ? <span className="text-[10px] inline-flex items-center gap-1 text-emerald-300"><ShieldCheck className="w-3 h-3" strokeWidth={1.5} /> counsel reviewed</span>
                      : <span className="text-[10px] inline-flex items-center gap-1 text-amber-300"><ShieldAlert className="w-3 h-3" strokeWidth={1.5} /> awaiting counsel</span>}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_TONE[v.status]}`}>{v.status}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
