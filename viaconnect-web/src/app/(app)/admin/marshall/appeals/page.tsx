'use client';

// Prompt #123 §14.1 + §14.2: foundation queue view.
// Lists pending appeals with their analyzer recommendation + draft self-check
// status. Per-row actions deferred to detail-page (Phase 2).

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Gavel, ShieldCheck, AlertTriangle, ScanSearch } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface QueueRow {
  appeal_id: string;
  notice_id: string;
  rebuttal: string | null;
  claim_type: string;
  submitted_at: string;
  analysis: {
    id: string;
    recommendation: string;
    confidence: number;
    requires_dual_approval: boolean;
    drift_report: { drift_label?: string; good_faith_signal?: string } | null;
  } | null;
  latest_draft: {
    id: string;
    self_check_passed: boolean;
    version: number;
  } | null;
}

const RECOMMENDATION_LABELS: Record<string, string> = {
  uphold: 'Uphold',
  reverse: 'Reverse',
  partial: 'Partial',
  request_more_info: 'Request more info',
  manual_review: 'Manual review',
  escalate: 'Escalate',
};

export default function AppealsQueuePage() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: appeals } = await (supabase as any)
        .from('practitioner_notice_appeals')
        .select('id, notice_id, rebuttal, claim_type, submitted_at')
        .is('resolved_at', null)
        .order('submitted_at', { ascending: true });
      const list = (appeals ?? []) as Array<{
        id: string; notice_id: string; rebuttal: string | null;
        claim_type: string; submitted_at: string;
      }>;

      if (list.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: analyses } = await (supabase as any)
        .from('appeal_analyses')
        .select('id, appeal_id, recommendation, confidence, requires_dual_approval, drift_report')
        .in('appeal_id', list.map((a) => a.id));
      const analysesByAppeal = new Map<string, QueueRow['analysis']>();
      for (const a of (analyses ?? []) as Array<{
        id: string; appeal_id: string; recommendation: string; confidence: number;
        requires_dual_approval: boolean; drift_report: QueueRow['analysis'] extends infer R ? R : never;
      }>) {
        analysesByAppeal.set(a.appeal_id, {
          id: a.id,
          recommendation: a.recommendation,
          confidence: a.confidence,
          requires_dual_approval: a.requires_dual_approval,
          drift_report: a.drift_report as { drift_label?: string; good_faith_signal?: string } | null,
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: drafts } = await (supabase as any)
        .from('appeal_drafts')
        .select('id, appeal_id, version, self_check_passed')
        .in('appeal_id', list.map((a) => a.id))
        .order('version', { ascending: false });
      const draftsByAppeal = new Map<string, QueueRow['latest_draft']>();
      for (const d of (drafts ?? []) as Array<{
        id: string; appeal_id: string; version: number; self_check_passed: boolean;
      }>) {
        if (!draftsByAppeal.has(d.appeal_id)) {
          draftsByAppeal.set(d.appeal_id, {
            id: d.id,
            self_check_passed: d.self_check_passed,
            version: d.version,
          });
        }
      }

      setRows(list.map((a) => ({
        appeal_id: a.id,
        notice_id: a.notice_id,
        rebuttal: a.rebuttal,
        claim_type: a.claim_type,
        submitted_at: a.submitted_at,
        analysis: analysesByAppeal.get(a.id) ?? null,
        latest_draft: draftsByAppeal.get(a.id) ?? null,
      })));
      setLoading(false);
    })();
  }, []);

  async function runAnalyze(appealId: string) {
    await fetch(`/api/marshall/appeals/${appealId}/analyze`, { method: 'POST' });
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/admin/marshall" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Marshall
        </Link>

        <header>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <Gavel className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
            Appeals queue
          </h1>
          <p className="text-xs text-white/60 mt-1">
            {loading ? 'Loading...' : `${rows.length} pending`}
          </p>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center">
            <p className="text-sm text-white/40">Loading appeals...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center">
            <p className="text-sm text-white/60">No pending appeals.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.appeal_id}>
                <div className="rounded-2xl border border-white/[0.1] bg-white/[0.04] p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{r.claim_type}</span>
                        {r.analysis ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#2DA5A0]/15 text-[#2DA5A0] text-[10px] px-2 py-0.5 font-medium">
                            <Gavel className="h-2.5 w-2.5" strokeWidth={1.5} />
                            {RECOMMENDATION_LABELS[r.analysis.recommendation] ?? r.analysis.recommendation}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] text-white/60 text-[10px] px-2 py-0.5">
                            Not analyzed
                          </span>
                        )}
                        {r.analysis?.requires_dual_approval && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 text-amber-200 text-[10px] px-2 py-0.5 font-medium">
                            <AlertTriangle className="h-2.5 w-2.5" strokeWidth={1.5} />
                            Dual approval
                          </span>
                        )}
                        {r.analysis?.drift_report?.drift_label && r.analysis.drift_report.drift_label !== 'none' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 text-rose-200 text-[10px] px-2 py-0.5 font-medium">
                            <ShieldCheck className="h-2.5 w-2.5" strokeWidth={1.5} />
                            Drift: {r.analysis.drift_report.drift_label}
                          </span>
                        )}
                        {r.latest_draft && (
                          <span className={`inline-flex items-center gap-1 rounded-full text-[10px] px-2 py-0.5 font-medium ${
                            r.latest_draft.self_check_passed
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-rose-500/15 text-rose-200'
                          }`}>
                            Draft v{r.latest_draft.version}
                            {r.latest_draft.self_check_passed ? ' ok' : ' self-check failed'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/40 mt-1 font-mono truncate">{r.appeal_id}</p>
                      <p className="text-xs text-white/70 mt-2 line-clamp-2">
                        {r.rebuttal ?? 'No rebuttal text'}
                      </p>
                      {r.analysis && (
                        <p className="text-[11px] text-white/50 mt-1">
                          Confidence {(r.analysis.confidence * 100).toFixed(0)}%
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col sm:items-end gap-1.5">
                      <span className="text-[10px] text-white/40">
                        {new Date(r.submitted_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => runAnalyze(r.appeal_id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs font-medium text-white hover:bg-white/[0.08] min-h-[44px]"
                      >
                        <ScanSearch className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {r.analysis ? 'Re-analyze' : 'Run analyzer'}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4">
          <p className="text-xs text-white/60">
            Foundation phase: queue display + analyzer trigger only. Detail view, modify
            editor, manual response editor, escalate flow, agreement dashboard, pattern
            feed, and template editor ship in a follow-up phase. The send and cosign
            routes are wired (POST /api/marshall/appeals/[id]/send) for direct API use
            during operational testing.
          </p>
        </div>
      </div>
    </div>
  );
}
