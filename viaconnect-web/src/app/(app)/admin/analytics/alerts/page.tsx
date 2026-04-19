'use client';

// Prompt #94 Phase 7.5: Unit economics alerts admin page.
// Lists rows from unit_economics_alerts. Founder can acknowledge each
// alert with an optional note; acknowledged alerts are hidden by default
// but a toggle reveals the full audit trail.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';

const supabase = createClient();

interface AlertRow {
  id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  snapshot_month: string;
  segment_type: string;
  segment_value: string;
  threshold_value: number | null;
  current_value: number | null;
  message: string;
  is_acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  acknowledgement_note: string | null;
  created_at: string;
}

const sevColor = (s: AlertRow['severity']) =>
  s === 'critical' ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' :
  s === 'warning'  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' :
                     'border-sky-500/40 bg-sky-500/10 text-sky-300';

const sevIcon = (s: AlertRow['severity']) =>
  s === 'critical' ? 'text-rose-300' :
  s === 'warning'  ? 'text-amber-300' :
                     'text-sky-300';

const fmtMonth = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short' });

export default function AlertsPage() {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAcked, setShowAcked] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteByAlert, setNoteByAlert] = useState<Record<string, string>>({});

  async function reload() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('unit_economics_alerts')
      .select('id, alert_type, severity, snapshot_month, segment_type, segment_value, threshold_value, current_value, message, is_acknowledged, acknowledged_at, acknowledged_by, acknowledgement_note, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    setRows((data ?? []) as AlertRow[]);
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  const visible = useMemo(
    () => showAcked ? rows : rows.filter((r) => !r.is_acknowledged),
    [rows, showAcked],
  );

  async function ack(id: string) {
    setBusyId(id);
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase as any)
      .from('unit_economics_alerts')
      .update({
        is_acknowledged: true,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user?.id ?? null,
        acknowledgement_note: noteByAlert[id]?.trim() || null,
      })
      .eq('id', id);
    setBusyId(null);
    reload();
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin/analytics" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Analytics
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Alerts</h1>
            <p className="text-sm text-gray-400 mt-1">
              Threshold breaches written by the monthly snapshot tick.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-400 inline-flex items-center gap-2">
              <input type="checkbox" checked={showAcked} onChange={(e) => setShowAcked(e.target.checked)} />
              Show acknowledged
            </label>
            <button
              onClick={reload}
              className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
            </button>
          </div>
        </div>
      </header>

      {loading && (
        <div className="text-sm text-gray-400 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
        </div>
      )}

      {!loading && visible.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-gray-300 inline-flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-portal-green" strokeWidth={1.5} />
          {showAcked ? 'No alerts at all.' : 'No active alerts.'}
        </div>
      )}

      {!loading && visible.length > 0 && (
        <ul className="space-y-3">
          {visible.map((a) => (
            <li key={a.id} className={`rounded-xl border p-4 ${sevColor(a.severity)}`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${sevIcon(a.severity)}`} strokeWidth={1.5} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">{a.message}</p>
                  <p className="text-xs text-gray-300 mt-1">
                    Type: <span className="font-mono">{a.alert_type}</span> ;
                    severity: <span className="font-mono">{a.severity}</span> ;
                    month: {fmtMonth(a.snapshot_month)} ;
                    segment: {a.segment_type === 'overall' ? 'overall' : `${a.segment_type}=${a.segment_value}`}
                  </p>
                  {a.current_value != null && a.threshold_value != null && (
                    <p className="text-xs text-gray-400 mt-1">
                      Current: <span className="text-white">{a.current_value}</span> ;
                      threshold: <span className="text-white">{a.threshold_value}</span>
                    </p>
                  )}
                  {a.is_acknowledged ? (
                    <div className="mt-3 text-xs text-gray-300">
                      <span className="inline-flex items-center gap-1 text-portal-green">
                        <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} /> Acknowledged
                      </span>
                      {a.acknowledged_at && <span className="ml-2 text-gray-400">at {new Date(a.acknowledged_at).toLocaleString()}</span>}
                      {a.acknowledgement_note && <p className="mt-1 italic text-gray-300">{a.acknowledgement_note}</p>}
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-col md:flex-row md:items-center gap-2">
                      <input
                        type="text"
                        value={noteByAlert[a.id] ?? ''}
                        onChange={(e) => setNoteByAlert((s) => ({ ...s, [a.id]: e.target.value }))}
                        placeholder="Optional note: why is this acknowledged?"
                        className="flex-1 bg-white/[0.06] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder:text-gray-500"
                      />
                      <button
                        disabled={busyId === a.id}
                        onClick={() => ack(a.id)}
                        className="text-xs px-3 py-1 rounded bg-portal-green/30 hover:bg-portal-green/50 text-white inline-flex items-center gap-1 disabled:opacity-40"
                      >
                        {busyId === a.id ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} />}
                        Acknowledge
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
