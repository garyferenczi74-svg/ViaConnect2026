'use client';

/**
 * Prompt 227c: Jeffery ACC Collection 14 curation ops panel.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  OctagonX,
  RefreshCw,
  ShieldOff,
  XCircle,
} from 'lucide-react';

type ProposalRow = {
  id: string;
  gap_type: string;
  target_table: string;
  target_field: string;
  change_class: number;
  direction: string;
  rationale: string;
  status: string;
  source_tier: number | null;
  confidence: number | null;
  created_at: string;
  review_note?: string | null;
};

type OpsPayload = {
  ok: boolean;
  killSwitch: {
    is_halted: boolean;
    set_by: string | null;
    set_at: string | null;
    reason: string;
  };
  lastCycle: {
    id: string;
    started_at: string;
    ended_at: string | null;
    gaps_closed: number;
    proposals_raised: Record<string, number>;
    negative_results_count: number;
    yield_by_source_tier: Record<string, number>;
    budget: Record<string, unknown>;
    kill_switch_hit: boolean;
  } | null;
  census: { computed_at: string; counts: Record<string, number> } | null;
  queue: ProposalRow[];
  queueDepth: number;
  queueDepthByClass: Record<string, number>;
  escalated: ProposalRow[];
  rejections: Array<{
    id: string;
    fingerprint: string;
    reason: string;
    created_at: string;
  }>;
  reProposalRate: number | null;
  reProposalRateUnknown: boolean;
  yieldBySourceTier: Record<string, number>;
  budget: Record<string, unknown>;
  pendingCorrections: Array<{
    id: string;
    compound_slug: string | null;
    public_summary: string | null;
    occurred_at: string;
  }>;
  class3ApproveNote: string;
  recentAutoApplied: Array<{
    id: string;
    target_table: string;
    target_field: string;
    change_class: number;
    applied_at: string | null;
  }>;
  budgetCeiling?: {
    maxClass3PerCycle: number;
    maxClass0FreshnessPerCycle: number;
    maxNegativeSamplesPerCycle: number;
    measuredCycleCount: number;
    notes: string;
  };
};

export default function CurationOpsPanel() {
  const [data, setData] = useState<OpsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string>('all');
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/jeffery/curation-ops', {
        credentials: 'same-origin',
      });
      if (!res.ok) {
        setError(
          res.status === 401 || res.status === 403
            ? 'Admin only'
            : 'Load failed',
        );
        setData(null);
        return;
      }
      const body = (await res.json()) as OpsPayload;
      if (!body.ok) {
        setError('Load failed');
        setData(null);
        return;
      }
      setData(body);
    } catch {
      setError('Network error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function postAction(payload: Record<string, unknown>): Promise<boolean> {
    const key = String(payload.action ?? 'action');
    setBusy(key);
    try {
      const res = await fetch('/api/admin/jeffery/curation-ops', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(String(json.error ?? 'Action failed'));
        return false;
      }
      await load();
      return true;
    } catch {
      setError('Network error');
      return false;
    } finally {
      setBusy(null);
    }
  }

  const filteredQueue = useMemo(() => {
    const rows = data?.queue ?? [];
    if (classFilter === 'all') return rows;
    return rows.filter((r) => String(r.change_class) === classFilter);
  }, [data?.queue, classFilter]);

  if (loading && !data) {
    return (
      <div className="px-4 md:px-8 py-8 flex items-center gap-2 text-white/50 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
        Loading curation ops...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="px-4 md:px-8 py-8 text-amber-200 text-sm">{error}</div>
    );
  }

  if (!data) return null;

  const halted = data.killSwitch.is_halted === true;

  return (
    <div
      className="px-4 md:px-8 py-6 space-y-6 max-w-5xl"
      data-testid="jeffery-curation-ops"
    >
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">
            Collection 14 curation ops
          </h2>
          <p className="text-xs text-white/40 mt-1">
            Sherlock proposes. Thanos applies Class 0/1. Jeffery and Lex gate the
            rest. Public view:{' '}
            <Link
              href="/science"
              className="text-[#2DA5A0] inline-flex items-center gap-1"
            >
              Science transparency
              <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="min-h-[44px] px-3 rounded-lg border border-white/10 text-xs text-white/70 inline-flex items-center gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
          Refresh
        </button>
      </div>

      {error ? (
        <p className="text-xs text-amber-200">{error}</p>
      ) : null}

      {/* Kill switch */}
      <section
        className={`rounded-xl border p-4 ${
          halted
            ? 'border-[#B75E18]/50 bg-[#B75E18]/10'
            : 'border-white/[0.08] bg-[#1E3054]'
        }`}
        data-testid="curation-kill-switch"
      >
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-start gap-2">
            <ShieldOff
              className={`h-4 w-4 mt-0.5 ${halted ? 'text-[#B75E18]' : 'text-white/40'}`}
              strokeWidth={1.5}
            />
            <div>
              <p className="text-sm font-semibold text-white">
                Kill switch {halted ? 'HALTED' : 'running'}
              </p>
              <p className="text-[11px] text-white/45 mt-1">
                {halted
                  ? `Set by ${data.killSwitch.set_by ?? 'UNKNOWN'} · ${data.killSwitch.reason || 'no reason'}`
                  : 'Curation cycle may run. Toggle to halt server-side.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy === 'kill_switch'}
            onClick={() => {
              const next = !halted;
              if (
                next &&
                !window.confirm('Halt Sherlock Collection 14 curation loop?')
              ) {
                return;
              }
              void postAction({
                action: 'kill_switch',
                halted: next,
                reason: next ? 'halted_from_acc' : 'resumed_from_acc',
              });
            }}
            className={`min-h-[44px] px-4 rounded-lg text-xs font-semibold ${
              halted
                ? 'bg-[#2DA5A0]/20 text-[#2DA5A0] border border-[#2DA5A0]/40'
                : 'bg-[#B75E18]/20 text-[#B75E18] border border-[#B75E18]/40'
            }`}
          >
            {halted ? 'Resume loop' : 'Halt loop'}
          </button>
        </div>
      </section>

      {/* Cycle + budget */}
      <section className="rounded-xl border border-white/[0.08] bg-[#1E3054] p-4 space-y-3">
        <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">
          Last cycle and budget
        </p>
        {!data.lastCycle ? (
          <p className="text-xs text-white/40">No curation cycles recorded yet</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-[10px] text-white/35">Gaps closed</p>
              <p className="text-sm text-white tabular-nums">
                {data.lastCycle.gaps_closed}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-white/35">Negatives</p>
              <p className="text-sm text-white tabular-nums">
                {data.lastCycle.negative_results_count}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-white/35">Queue depth</p>
              <p className="text-sm text-white tabular-nums">{data.queueDepth}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/35">Re-proposal rate (7d)</p>
              <p className="text-sm text-white">
                {data.reProposalRateUnknown
                  ? 'UNKNOWN'
                  : data.reProposalRate}
              </p>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(data.yieldBySourceTier).map(([tier, n]) => (
            <span
              key={tier}
              className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/55"
            >
              Tier {tier}: {n}
            </span>
          ))}
          {Object.keys(data.yieldBySourceTier).length === 0 ? (
            <span className="text-[10px] text-white/35">
              yield_by_source_tier empty
            </span>
          ) : null}
        </div>
        <p className="text-[10px] text-white/35">
          Last cycle budget: {JSON.stringify(data.budget)}
        </p>
        {data.budgetCeiling ? (
          <p className="text-[10px] text-[#2DA5A0]/80">
            G64 ceiling: Class3≤{data.budgetCeiling.maxClass3PerCycle}, Class0≤
            {data.budgetCeiling.maxClass0FreshnessPerCycle}, negatives≤
            {data.budgetCeiling.maxNegativeSamplesPerCycle} (from{' '}
            {data.budgetCeiling.measuredCycleCount} cycles) ·{' '}
            {data.budgetCeiling.notes}
          </p>
        ) : (
          <p className="text-[10px] text-white/35">
            G64 ceiling UNKNOWN until measured
          </p>
        )}
      </section>

      {/* Proposal queue */}
      <section
        className="rounded-xl border border-white/[0.08] bg-[#1E3054] p-4 space-y-3"
        data-testid="curation-proposal-queue"
      >
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <p className="text-sm font-semibold text-white">
            Proposal queue ({filteredQueue.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {['all', '5', '4', '3', '2', '1', '0'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setClassFilter(f)}
                className={`min-h-[36px] px-2.5 rounded-full text-[10px] border ${
                  classFilter === f
                    ? 'border-[#2DA5A0]/40 bg-[#2DA5A0]/15 text-[#2DA5A0]'
                    : 'border-white/10 text-white/40'
                }`}
              >
                {f === 'all' ? 'All' : `C${f}`}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-white/40">{data.class3ApproveNote}</p>
        {filteredQueue.length === 0 ? (
          <p className="text-xs text-white/40">Queue empty</p>
        ) : (
          <ul className="space-y-2 list-none">
            {filteredQueue.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() =>
                    setExpanded(expanded === row.id ? null : row.id)
                  }
                >
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                      Class {row.change_class}
                    </span>
                    <span className="text-[10px] text-white/40">
                      {row.status}
                    </span>
                    <span className="text-xs text-white">
                      {row.target_table}.{row.target_field}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-white/50 line-clamp-2">
                    {row.rationale}
                  </p>
                </button>
                {expanded === row.id ? (
                  <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
                    <p className="text-[11px] text-white/60 whitespace-pre-wrap">
                      {row.rationale}
                    </p>
                    <p className="text-[10px] text-white/35">
                      gap={row.gap_type} · direction={row.direction} · tier=
                      {row.source_tier ?? 'UNKNOWN'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() =>
                          void postAction({
                            action: 'approve',
                            proposalId: row.id,
                          })
                        }
                        className="min-h-[44px] px-3 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Approve
                      </button>
                      <input
                        value={rejectReason[row.id] ?? ''}
                        onChange={(e) =>
                          setRejectReason((s) => ({
                            ...s,
                            [row.id]: e.target.value,
                          }))
                        }
                        placeholder="Reject reason required"
                        className="min-h-[44px] flex-1 min-w-[160px] rounded-lg bg-[#1A2744] border border-white/10 px-3 text-xs text-white"
                      />
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() =>
                          void postAction({
                            action: 'reject',
                            proposalId: row.id,
                            reason: rejectReason[row.id] ?? '',
                          })
                        }
                        className="min-h-[44px] px-3 rounded-lg bg-red-500/20 text-red-300 text-xs inline-flex items-center gap-1"
                      >
                        <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Reject
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Escalations */}
      <section className="rounded-xl border border-white/[0.08] bg-[#1E3054] p-4 space-y-2">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-300" strokeWidth={1.5} />
          G61 escalations ({data.escalated.length})
        </p>
        {data.escalated.length === 0 ? (
          <p className="text-xs text-white/40">No cumulative-effect escalations</p>
        ) : (
          <ul className="space-y-1 list-none">
            {data.escalated.slice(0, 10).map((e) => (
              <li key={e.id} className="text-[11px] text-white/55">
                {e.target_table}.{e.target_field} · {e.review_note || e.rationale}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Rejections + pending corrections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="rounded-xl border border-white/[0.08] bg-[#1E3054] p-4 space-y-2">
          <p className="text-sm font-semibold text-white flex items-center gap-2">
            <OctagonX className="h-4 w-4" strokeWidth={1.5} />
            Rejection ledger
          </p>
          {data.rejections.length === 0 ? (
            <p className="text-xs text-white/40">No rejections yet</p>
          ) : (
            <ul className="space-y-2 list-none">
              {data.rejections.map((r) => (
                <li key={r.id} className="text-[11px] text-white/55">
                  <span className="text-white/30 font-mono">
                    {r.fingerprint.slice(0, 12)}…
                  </span>{' '}
                  {r.reason}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-white/[0.08] bg-[#1E3054] p-4 space-y-2">
          <p className="text-sm font-semibold text-white">
            Pending corrections (Marshall)
          </p>
          {data.pendingCorrections.length === 0 ? (
            <p className="text-xs text-white/40">No pending corrections</p>
          ) : (
            <ul className="space-y-2 list-none">
              {data.pendingCorrections.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap gap-2 items-start justify-between"
                >
                  <p className="text-[11px] text-white/60 flex-1">
                    {c.compound_slug ? `${c.compound_slug}: ` : ''}
                    {(c.public_summary ?? '').slice(0, 120)}
                  </p>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      void postAction({
                        action: 'approve_correction',
                        correctionId: c.id,
                      })
                    }
                    className="min-h-[44px] px-3 rounded-lg border border-[#2DA5A0]/40 text-[#2DA5A0] text-[10px]"
                  >
                    Approve public
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {data.recentAutoApplied.length > 0 ? (
        <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">
            Recent auto-applied
          </p>
          <ul className="mt-2 space-y-1 list-none">
            {data.recentAutoApplied.map((a) => (
              <li key={a.id} className="text-[11px] text-white/45">
                Class {a.change_class} · {a.target_table}.{a.target_field} ·{' '}
                {a.applied_at
                  ? new Date(a.applied_at).toISOString().slice(0, 19)
                  : 'UNKNOWN'}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
