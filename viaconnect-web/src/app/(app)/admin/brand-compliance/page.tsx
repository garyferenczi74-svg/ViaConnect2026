'use client';

// Prompt #103 Phase 3: Admin brand-compliance queue.
// Default view: pending human review, highest severity first by status
// then chronological. Admin clicks a row -> detail page for actions.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, RefreshCw, AlertCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

type Status = 'pending_human_review' | 'approved' | 'rejected' | 'remediation_required';

interface QueueRow {
  review_id: string;
  product_id: string;
  product_name: string | null;
  severity: 'clean' | 'minor' | 'major' | 'critical';
  status: Status;
  created_at: string;
  reviewed_at: string | null;
}

const STATUSES: Array<{ id: Status; label: string }> = [
  { id: 'pending_human_review', label: 'Pending review' },
  { id: 'remediation_required', label: 'Remediation' },
  { id: 'approved',             label: 'Approved' },
  { id: 'rejected',             label: 'Rejected' },
];

const SEVERITY_CLASS: Record<QueueRow['severity'], string> = {
  clean:    'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
  minor:    'text-amber-300   border-amber-500/30   bg-amber-500/10',
  major:    'text-orange-300  border-orange-500/40  bg-orange-500/10',
  critical: 'text-rose-300    border-rose-500/40    bg-rose-500/10',
};

export default function BrandComplianceQueuePage() {
  const [status, setStatus] = useState<Status>('pending_human_review');
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/brand-compliance?status=${status}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setRows(json.rows ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, [status]);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Admin
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold inline-flex items-center gap-2">
              <ShieldCheck className="w-6 h-6" strokeWidth={1.5} />
              Brand Identity Compliance
            </h1>
            <p className="text-sm text-gray-400 mt-1">Every packaging proof is reviewed against the seven-category brand system. Critical issues auto-reject; everything else lands here for human review.</p>
          </div>
          <button onClick={reload} className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 self-start md:self-auto">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
          </button>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 mb-6">
        {STATUSES.map((s) => (
          <button
            key={s.id}
            onClick={() => setStatus(s.id)}
            className={`text-xs px-3 py-1.5 rounded border ${
              status === s.id ? 'border-copper text-copper bg-copper/10' : 'border-white/10 text-gray-300 hover:text-white'
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
          Nothing in this bucket yet.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="grid gap-3">
          {rows.map((r) => (
            <Link
              key={r.review_id}
              href={`/admin/brand-compliance/${r.review_id}`}
              className="block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 hover:border-copper"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <div className="font-medium">{r.product_name ?? r.product_id.slice(0, 8)}</div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">{r.product_id}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded border inline-flex items-center gap-1 ${SEVERITY_CLASS[r.severity]}`}>
                    {r.severity === 'critical' && <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />}
                    {r.severity}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
