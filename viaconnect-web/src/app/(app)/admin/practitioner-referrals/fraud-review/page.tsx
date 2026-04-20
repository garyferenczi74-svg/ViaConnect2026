'use client';

// Prompt #98 Phase 6: Fraud review inbox (admin).

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface FraudFlagRow {
  id: string;
  flag_type: string;
  severity: 'low' | 'medium' | 'high' | 'blocking';
  status: 'pending_review' | 'confirmed_fraud' | 'cleared_benign' | 'admin_override';
  auto_detected: boolean;
  created_at: string;
  attribution_id: string | null;
  milestone_event_id: string | null;
  practitioner_id: string | null;
  practitioners?: { practice_name: string | null; display_name: string | null } | null;
}

type StatusFilter = 'pending_review' | 'confirmed_fraud' | 'cleared_benign' | 'admin_override' | 'all';

const STATUS_ORDER: StatusFilter[] = ['pending_review', 'confirmed_fraud', 'cleared_benign', 'admin_override', 'all'];

function severityPill(sev: FraudFlagRow['severity']) {
  const map: Record<FraudFlagRow['severity'], { cls: string; label: string }> = {
    low:      { cls: 'border-sky-500/30 bg-sky-500/10 text-sky-300',       label: 'low' },
    medium:   { cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300', label: 'medium' },
    high:     { cls: 'border-rose-500/40 bg-rose-500/10 text-rose-300',    label: 'high' },
    blocking: { cls: 'border-rose-500/60 bg-rose-500/20 text-rose-300',    label: 'blocking' },
  };
  const m = map[sev];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${m.cls}`}>{m.label}</span>;
}

export default function FraudReviewInboxPage() {
  const [rows, setRows] = useState<FraudFlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('pending_review');

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/admin/practitioner-referrals/fraud-flags?status=${filter}&limit=200`;
      const r = await fetch(url);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setRows((json.flags ?? []) as FraudFlagRow[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, [filter]);

  const counts = useMemo(() => ({
    total: rows.length,
    blocking: rows.filter((r) => r.severity === 'blocking').length,
    high: rows.filter((r) => r.severity === 'high').length,
  }), [rows]);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Admin
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Fraud review</h1>
            <p className="text-sm text-gray-400 mt-1">
              {counts.total} flags ; {counts.blocking} blocking ; {counts.high} high.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`text-xs px-2 py-1 rounded border capitalize ${
                  filter === s ? 'border-copper text-copper' : 'border-white/10 text-gray-300 hover:text-white'
                }`}
              >
                {s.replace(/_/g, ' ')}
              </button>
            ))}
            <button onClick={reload} className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10">
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
          <CheckCircle2 className="w-4 h-4 text-portal-green" strokeWidth={1.5} /> No flags in this view.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <>
        <p className="md:hidden text-xs text-gray-400 mb-2">Scroll horizontally to see all columns.</p>
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-400">
              <tr>
                <th className="text-left px-3 py-2">Referrer</th>
                <th className="text-left px-3 py-2">Flag type</th>
                <th className="text-left px-3 py-2">Severity</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Raised</th>
                <th className="text-right px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-white/5">
                  <td className="px-3 py-2">{row.practitioners?.practice_name ?? row.practitioners?.display_name ?? row.practitioner_id ?? 'n/a'}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="inline-flex items-center gap-1">
                      {row.flag_type === 'admin_manual_flag'
                        ? <ShieldAlert className="w-3 h-3 text-copper" strokeWidth={1.5} />
                        : <AlertTriangle className="w-3 h-3 text-amber-300" strokeWidth={1.5} />}
                      <span className="font-mono">{row.flag_type}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2">{severityPill(row.severity)}</td>
                  <td className="px-3 py-2 text-xs font-mono">{row.status}</td>
                  <td className="px-3 py-2 text-xs text-gray-400">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/practitioner-referrals/fraud-review/${row.id}`}
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
