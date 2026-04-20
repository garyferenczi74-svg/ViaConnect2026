'use client';

// Prompt #96 Phase 4: Compliance reviewer inbox.
//
// Lists pending reviewer assignments for the calling admin's role(s).
// Sort = oldest first (FIFO). SLA bucket coloring (on_time / reminder /
// escalation). Click a row to open the review interface.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  AlertCircle,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface InboxRow {
  assignment_id: string;
  label_design_id: string;
  reviewer_role: 'compliance_officer' | 'medical_director';
  assigned_at: string;
  hours_pending: number;
  sla_status: 'on_time' | 'reminder_due' | 'escalation_due';
  display_product_name: string;
  version_number: number;
  label_status: string;
}

const ROLE_LABELS: Record<InboxRow['reviewer_role'], string> = {
  compliance_officer: 'Compliance officer',
  medical_director:   'Medical director',
};

function slaBadge(status: InboxRow['sla_status']) {
  if (status === 'escalation_due') {
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-rose-500/40 bg-rose-500/10 text-rose-300">
      <AlertTriangle className="w-3 h-3" strokeWidth={1.5} /> Escalation
    </span>;
  }
  if (status === 'reminder_due') {
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300">
      <Clock className="w-3 h-3" strokeWidth={1.5} /> Reminder
    </span>;
  }
  return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-portal-green/30 bg-portal-green/10 text-portal-green">
    <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} /> On time
  </span>;
}

export default function ComplianceInboxPage() {
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | InboxRow['reviewer_role']>('all');

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const url = filter === 'all'
        ? '/api/admin/white-label/compliance/inbox'
        : `/api/admin/white-label/compliance/inbox?role=${filter}`;
      const r = await fetch(url);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setRows((json.rows ?? []) as InboxRow[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, [filter]);

  const counts = useMemo(() => ({
    total: rows.length,
    escalation: rows.filter((r) => r.sla_status === 'escalation_due').length,
    reminder: rows.filter((r) => r.sla_status === 'reminder_due').length,
  }), [rows]);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin/white-label" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> White-label
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Compliance inbox</h1>
            <p className="text-sm text-gray-400 mt-1">
              {counts.total} pending ; {counts.escalation} escalation ; {counts.reminder} reminder.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(['all', 'compliance_officer', 'medical_director'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-2 py-1 rounded border ${
                  filter === f ? 'border-copper text-copper' : 'border-white/10 text-gray-300 hover:text-white'
                }`}
              >
                {f === 'all' ? 'All roles' : ROLE_LABELS[f as InboxRow['reviewer_role']]}
              </button>
            ))}
            <button
              onClick={reload}
              className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
            </button>
          </div>
        </div>
      </header>

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
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-gray-300 inline-flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-portal-green" strokeWidth={1.5} /> Inbox empty.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <>
        <p className="md:hidden text-xs text-gray-400 mb-2">Scroll horizontally to see all columns.</p>
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-400">
              <tr>
                <th className="text-left px-3 py-2">Product / version</th>
                <th className="text-left px-3 py-2">Role</th>
                <th className="text-left px-3 py-2">SLA</th>
                <th className="text-right px-3 py-2">Hours pending</th>
                <th className="text-right px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.assignment_id} className="border-t border-white/5">
                  <td className="px-3 py-2">
                    <p className="font-medium">{r.display_product_name}</p>
                    <p className="text-xs text-gray-500">v{r.version_number} ; {new Date(r.assigned_at).toLocaleString()}</p>
                  </td>
                  <td className="px-3 py-2 text-xs">{ROLE_LABELS[r.reviewer_role]}</td>
                  <td className="px-3 py-2">{slaBadge(r.sla_status)}</td>
                  <td className="px-3 py-2 text-right">{r.hours_pending.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/white-label/compliance/review/${r.label_design_id}?role=${r.reviewer_role}`}
                      className="inline-flex items-center gap-1 text-copper hover:text-amber-300 text-xs"
                    >
                      Review <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
