'use client';

// Prompt #98 Phase 6: Fraud review detail + resolution.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';

interface DetailPayload {
  flag: {
    id: string;
    flag_type: string;
    severity: 'low' | 'medium' | 'high' | 'blocking';
    status: 'pending_review' | 'confirmed_fraud' | 'cleared_benign' | 'admin_override';
    evidence: Record<string, unknown>;
    auto_detected: boolean;
    created_at: string;
    attribution_id: string | null;
    milestone_event_id: string | null;
    referral_code_id: string | null;
    practitioner_id: string | null;
    reviewed_at: string | null;
    review_notes: string | null;
  };
  attribution: any;
  milestone_event: any;
  referral_code: any;
  referrer: { practice_name: string | null; display_name: string | null; account_status: string | null } | null;
  historic_flags: Array<{ id: string; flag_type: string; severity: string; status: string; created_at: string }>;
}

type Action = 'confirm_fraud' | 'clear_benign' | 'admin_override';

const REASON_MIN: Record<Action, number> = { confirm_fraud: 20, clear_benign: 20, admin_override: 50 };

export default function FraudReviewDetailPage({ params }: { params: { flagId: string } }) {
  const [data, setData] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [resolved, setResolved] = useState<{ action: Action; decision: Record<string, unknown> } | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/practitioner-referrals/fraud-flags/${params.flagId}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, [params.flagId]);

  async function resolve(action: Action) {
    const need = REASON_MIN[action];
    if (notes.trim().length < need) {
      setError(`${action.replace(/_/g, ' ')} requires a ${need}-char reason.`);
      return;
    }
    setSubmitting(action);
    setError(null);
    try {
      const r = await fetch(`/api/admin/practitioner-referrals/fraud-flags/${params.flagId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: notes.trim() }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setResolved({ action, decision: json.decision ?? {} });
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1A30] text-white p-8">
        <div className="text-sm text-gray-400 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
        </div>
      </div>
    );
  }
  if (!data) {
    return <div className="min-h-screen bg-[#0E1A30] text-white p-8 text-sm text-rose-300">{error ?? 'Flag not found.'}</div>;
  }

  const flag = data.flag;
  const evidenceJson = JSON.stringify(flag.evidence ?? {}, null, 2);
  const cannotResolve = flag.status !== 'pending_review';

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-4">
        <Link href="/admin/practitioner-referrals/fraud-review" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Fraud review
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <p className="text-xs text-gray-400">{flag.flag_type} ; {flag.severity} ; {flag.status}</p>
            <h1 className="text-xl md:text-2xl font-bold">
              {data.referrer?.practice_name ?? data.referrer?.display_name ?? 'Unknown referrer'}
            </h1>
          </div>
          <button onClick={reload} className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 self-start md:self-auto">
            <RefreshCw className="w-3 h-3" strokeWidth={1.5} /> Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> {error}
        </div>
      )}

      {resolved && (
        <div className="mb-4 rounded-lg border border-portal-green/30 bg-portal-green/10 p-3 text-sm text-portal-green">
          <p className="font-medium inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4" strokeWidth={1.5} /> Resolved: {resolved.action.replace(/_/g, ' ')}</p>
          <pre className="mt-2 text-xs font-mono text-portal-green/80">{JSON.stringify(resolved.decision, null, 2)}</pre>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Evidence</p>
            <pre className="text-xs font-mono whitespace-pre-wrap text-gray-300">{evidenceJson}</pre>
          </div>

          {data.attribution && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Attribution</p>
              <p>Status: <span className="font-mono">{data.attribution.status}</span></p>
              <p>Attributed: {new Date(data.attribution.attributed_at).toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">
                Referrer <span className="font-mono">{data.attribution.referring_practitioner_id?.slice(0, 8)}</span>
                {' ; '}Referred <span className="font-mono">{data.attribution.referred_practitioner_id?.slice(0, 8)}</span>
              </p>
            </div>
          )}

          {data.milestone_event && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Milestone event</p>
              <p>{data.milestone_event.milestone_id}</p>
              <p>Vesting: <span className="font-mono">{data.milestone_event.vesting_status}</span></p>
              {data.milestone_event.hold_expires_at && (
                <p className="text-xs text-gray-400 mt-1">Hold expires {new Date(data.milestone_event.hold_expires_at).toLocaleDateString()}</p>
              )}
            </div>
          )}

          {data.referral_code && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Referral code</p>
              <p className="font-mono">{data.referral_code.code}</p>
              <p className="text-xs text-gray-400 mt-1">Active: {String(data.referral_code.is_active)}</p>
            </div>
          )}

          {data.historic_flags.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Prior flags on this referrer</p>
              <ul className="space-y-1 text-xs">
                {data.historic_flags.map((h) => (
                  <li key={h.id} className="flex justify-between gap-2">
                    <span className="font-mono">{h.flag_type}</span>
                    <span className="text-gray-400">{h.severity} / {h.status}</span>
                    <span className="text-gray-500">{new Date(h.created_at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sticky top-4">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2 inline-flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" strokeWidth={1.5} /> Resolution
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Confirm / Clear = 20+ chars ; Override = 50+ chars (detailed)"
              className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm placeholder:text-gray-500"
              disabled={cannotResolve}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                disabled={!!submitting || cannotResolve}
                onClick={() => resolve('confirm_fraud')}
                className="text-sm px-3 py-2 rounded bg-rose-500/30 hover:bg-rose-500/50 inline-flex items-center gap-1 disabled:opacity-40"
              >
                {submitting === 'confirm_fraud' ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <XCircle className="w-4 h-4" strokeWidth={1.5} />}
                Confirm fraud
              </button>
              <button
                disabled={!!submitting || cannotResolve}
                onClick={() => resolve('clear_benign')}
                className="text-sm px-3 py-2 rounded bg-portal-green/30 hover:bg-portal-green/50 inline-flex items-center gap-1 disabled:opacity-40"
              >
                {submitting === 'clear_benign' ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />}
                Clear benign
              </button>
              <button
                disabled={!!submitting || cannotResolve}
                onClick={() => resolve('admin_override')}
                className="text-sm px-3 py-2 rounded bg-amber-500/30 hover:bg-amber-500/50 inline-flex items-center gap-1 disabled:opacity-40"
              >
                {submitting === 'admin_override' ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />}
                Admin override
              </button>
            </div>
            {cannotResolve && (
              <p className="text-xs text-gray-500 mt-3 italic">
                Flag is in status {flag.status}; only pending_review flags can be resolved. Review notes: {flag.review_notes ?? 'n/a'}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
