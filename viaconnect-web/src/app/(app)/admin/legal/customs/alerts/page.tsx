'use client';

// Prompt #114 P4a: IPRS alerts review surface.
//
// Lists customs_iprs_scan_results rows with filters (status + include-synthetic
// toggle). Each row exposes PATCH actions (confirm unauthorized, dismiss,
// re-flag for review) and an open-as-case action. Clone of the P2a
// recordations list pattern; no new UI conventions introduced.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Loader2,
  Radar,
  ExternalLink,
  CheckCircle2,
  XCircle,
  FolderPlus,
  Clock,
  FlaskConical,
} from 'lucide-react';
import {
  CUSTOMS_IPRS_RESULT_STATUSES,
  type CustomsIprsResultStatus,
} from '@/lib/customs/types';
import { formatCents } from '@/lib/customs/cbpFeeCalculator';

interface AlertRow {
  scan_result_id: string;
  case_id: string | null;
  recordation_id: string | null;
  scan_date: string;
  scanned_at: string;
  listing_title: string | null;
  listing_title_normalized: string | null;
  listing_url: string | null;
  listing_source: string | null;
  observed_price_cents: number | null;
  mark_distance_score: number | null;
  content_hash: string | null;
  status: CustomsIprsResultStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  is_synthetic: boolean;
  created_at: string;
  updated_at: string;
  recordation: {
    recordation_id: string;
    recordation_type: string;
    mark_text: string | null;
    copyright_registration_number: string | null;
  } | null;
}

const STATUS_TONE: Record<CustomsIprsResultStatus, string> = {
  new:                      'border-white/10 text-gray-300 bg-white/5',
  requires_review:          'border-[#B75E18]/60 text-[#B75E18] bg-[#B75E18]/15',
  confirmed_unauthorized:   'border-rose-500/50 text-rose-300 bg-rose-500/10',
  confirmed_authorized:     'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
  dismissed:                'border-white/5 text-gray-500 bg-white/[0.02]',
  case_opened:              'border-sky-500/50 text-sky-300 bg-sky-500/10',
};

export default function IprsAlertsPage() {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('requires_review');
  const [includeSynthetic, setIncludeSynthetic] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (includeSynthetic) params.set('includeSynthetic', '1');
      const r = await fetch(`/api/admin/legal/customs/alerts?${params.toString()}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setRows(json.rows ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, includeSynthetic]);

  useEffect(() => { reload(); }, [reload]);

  async function patchStatus(scanResultId: string, newStatus: CustomsIprsResultStatus, key: string) {
    if (actionBusy) return;
    setActionBusy(key);
    setError(null);
    try {
      const r = await fetch(`/api/admin/legal/customs/alerts/${scanResultId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionBusy(null);
    }
  }

  async function openAsCase(scanResultId: string) {
    if (actionBusy) return;
    setActionBusy(`open-${scanResultId}`);
    setError(null);
    try {
      const r = await fetch(
        `/api/admin/legal/customs/alerts/${scanResultId}/open-as-case`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority: 'p2_high' }),
        },
      );
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionBusy(null);
    }
  }

  async function seedSynthetic() {
    if (actionBusy) return;
    setActionBusy('seed');
    setError(null);
    try {
      const r = await fetch('/api/admin/legal/customs/iprs/test-insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_title: `Counterfeit ViaCura look-alike ${new Date().toISOString().slice(11, 19)}`,
          listing_url: 'https://example.test/listing/' + Math.random().toString(36).slice(2, 10),
          listing_source: 'amazon',
          observed_price_cents: 1999,
          mark_distance_score: 0.08,
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionBusy(null);
    }
  }

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
              <Radar className="w-6 h-6" strokeWidth={1.5} /> IPRS alerts
            </h1>
            <p className="text-sm text-gray-400 mt-1 max-w-3xl">
              Hits from the daily IPRS sweep against CBP recordations. Review, then confirm unauthorized, dismiss, or open a legal case. The scheduled scraper is gated by iprs_scan_config and arrives in P4b; until then, synthetic rows drive the review workflow end to end.
            </p>
          </div>
          <div className="flex gap-2 self-start md:self-auto">
            <button
              onClick={reload}
              className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 min-h-[44px] md:min-h-0"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
            </button>
            <button
              onClick={seedSynthetic}
              disabled={actionBusy === 'seed'}
              className="text-xs inline-flex items-center gap-1 px-3 py-1 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 min-h-[44px] md:min-h-0 disabled:opacity-50"
              title="Seed a synthetic test alert (requires ENABLE_IPRS_TEST_INSERT=true)"
            >
              {actionBusy === 'seed'
                ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} />
                : <FlaskConical className="w-3 h-3" strokeWidth={1.5} />}
              Seed test alert
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 mb-6 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-base md:text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1 min-h-[44px] md:min-h-0"
        >
          <option value="">All statuses</option>
          {CUSTOMS_IPRS_RESULT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={includeSynthetic}
            onChange={(e) => setIncludeSynthetic(e.target.checked)}
            className="accent-[#2DA5A0]"
          />
          Include synthetic rows
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
          No IPRS alerts match the current filter. Try the Seed test alert button if you need sample data.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="grid gap-3">
          {rows.map((r) => (
            <article
              key={r.scan_result_id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4 md:p-5"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_TONE[r.status]}`}>
                      {r.status}
                    </span>
                    {r.is_synthetic && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-300">
                        synthetic
                      </span>
                    )}
                    {r.recordation && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#2DA5A0]/40 text-[#2DA5A0] inline-flex items-center gap-1">
                        {r.recordation.mark_text ?? r.recordation.copyright_registration_number ?? r.recordation.recordation_type}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold truncate">
                    {r.listing_title ?? <span className="italic text-gray-500">untitled listing</span>}
                  </h3>
                  <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    {r.listing_source && <span>source: {r.listing_source}</span>}
                    {r.observed_price_cents !== null && (
                      <span>price: {formatCents(r.observed_price_cents)}</span>
                    )}
                    {r.mark_distance_score !== null && (
                      <span>mark distance: {r.mark_distance_score.toFixed(3)}</span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" strokeWidth={1.5} />
                      {new Date(r.scanned_at).toLocaleString()}
                    </span>
                  </div>
                  {r.listing_url && (
                    <a
                      href={r.listing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#2DA5A0] hover:underline mt-1 inline-flex items-center gap-1 break-all"
                    >
                      <ExternalLink className="w-3 h-3" strokeWidth={1.5} /> {r.listing_url}
                    </a>
                  )}
                  {r.review_notes && (
                    <p className="text-xs text-gray-400 mt-2 italic">{r.review_notes}</p>
                  )}
                  {r.case_id && (
                    <Link
                      href={`/admin/legal/cases/${r.case_id}`}
                      className="text-xs text-sky-300 hover:underline mt-2 inline-block"
                    >
                      Open linked case
                    </Link>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 md:self-start">
                  {r.status !== 'confirmed_unauthorized' && (
                    <AlertButton
                      Icon={XCircle}
                      tone="rose"
                      label="Unauthorized"
                      busy={actionBusy === `unauth-${r.scan_result_id}`}
                      onClick={() => patchStatus(r.scan_result_id, 'confirmed_unauthorized', `unauth-${r.scan_result_id}`)}
                    />
                  )}
                  {r.status !== 'confirmed_authorized' && (
                    <AlertButton
                      Icon={CheckCircle2}
                      tone="teal"
                      label="Authorized"
                      busy={actionBusy === `auth-${r.scan_result_id}`}
                      onClick={() => patchStatus(r.scan_result_id, 'confirmed_authorized', `auth-${r.scan_result_id}`)}
                    />
                  )}
                  {r.status !== 'dismissed' && (
                    <AlertButton
                      Icon={XCircle}
                      tone="muted"
                      label="Dismiss"
                      busy={actionBusy === `dismiss-${r.scan_result_id}`}
                      onClick={() => patchStatus(r.scan_result_id, 'dismissed', `dismiss-${r.scan_result_id}`)}
                    />
                  )}
                  {!r.case_id && r.status !== 'case_opened' && r.status !== 'dismissed' && (
                    <AlertButton
                      Icon={FolderPlus}
                      tone="orange"
                      label="Open as case"
                      busy={actionBusy === `open-${r.scan_result_id}`}
                      onClick={() => openAsCase(r.scan_result_id)}
                    />
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertButton({
  Icon,
  label,
  onClick,
  busy,
  tone,
}: {
  Icon: typeof CheckCircle2;
  label: string;
  onClick: () => void;
  busy: boolean;
  tone: 'teal' | 'rose' | 'muted' | 'orange';
}) {
  const classes =
    tone === 'teal'
      ? 'border-[#2DA5A0]/50 bg-[#2DA5A0]/15 text-[#2DA5A0] hover:bg-[#2DA5A0]/25'
      : tone === 'rose'
      ? 'border-rose-500/50 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
      : tone === 'orange'
      ? 'border-[#B75E18]/60 bg-[#B75E18]/20 text-[#B75E18] hover:bg-[#B75E18]/30'
      : 'border-white/10 text-gray-300 hover:text-white hover:border-white/20';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`text-xs px-3 py-2 rounded border min-h-[44px] md:min-h-0 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${classes}`}
    >
      {busy ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : <Icon className="w-3 h-3" strokeWidth={1.5} />}
      {label}
    </button>
  );
}
