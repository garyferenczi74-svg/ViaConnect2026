'use client';

// Prompt #104 Phase 5: Human-triage review.
//
// Steve Rica reviews the AI's bucket suggestion + rationale + evidence
// citations, then either confirms (transitions case to 'classified')
// or reclassifies. AI output is labeled AI-ASSISTED CLASSIFICATION:
// HUMAN REVIEW REQUIRED throughout.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Loader2, AlertCircle, ShieldAlert, Sparkles, CheckCircle, RotateCcw,
} from 'lucide-react';
import { LEGAL_CASE_BUCKETS, LEGAL_CASE_PRIORITIES } from '@/lib/legal/types';

interface CaseDetail {
  case_id: string;
  case_label: string;
  state: string;
  bucket: string;
  bucket_confidence_score: number | null;
  priority: string;
  has_medical_claim_flag: boolean;
  medical_director_reviewed_at: string | null;
  notes: string | null;
  metadata_json: { triage_ai?: TriageBlock } | null;
}

interface TriageBlock {
  bucket: string;
  confidence: number;
  rationale: string;
  evidence_citations: string[];
  suggested_template_family: string | null;
  suggested_priority: string;
  blocking_concerns: string[];
  medical_claim_quotes: string[];
  regex_scan_matches: string[];
  ran_at: string;
}

export default function TriagePage() {
  const params = useParams<{ caseId: string }>();
  const router = useRouter();
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrideBucket, setOverrideBucket] = useState<string>('');
  const [overridePriority, setOverridePriority] = useState<string>('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/legal/cases/${params.caseId}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setCaseDetail(json.case);
      setOverrideBucket(json.case?.bucket ?? '');
      setOverridePriority(json.case?.priority ?? '');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [params.caseId]);

  useEffect(() => { reload(); }, [reload]);

  async function runTriage() {
    setRunning(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/legal/cases/${params.caseId}/triage`, { method: 'POST' });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  async function confirmClassification() {
    setSubmitting(true);
    setError(null);
    try {
      // Move to classified, optionally overriding bucket/priority.
      const r = await fetch(`/api/admin/legal/cases/${params.caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'classified', bucket: overrideBucket, priority: overridePriority }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      router.push(`/admin/legal/cases/${params.caseId}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const triage = caseDetail?.metadata_json?.triage_ai;

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href={`/admin/legal/cases/${params.caseId}`} className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Case
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold mt-2 inline-flex items-center gap-2">
          <Sparkles className="w-6 h-6" strokeWidth={1.5} /> Triage
        </h1>
        {caseDetail && (
          <p className="text-sm text-gray-400 mt-1">
            <span className="font-mono">{caseDetail.case_label}</span> &middot; current state <span className="font-mono">{caseDetail.state}</span>
          </p>
        )}
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

      {!loading && caseDetail && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4" strokeWidth={1.5} /> AI-assisted classification
              </h2>
              {caseDetail.state === 'intake' && (
                <button
                  disabled={running}
                  onClick={runTriage}
                  className="text-xs px-2 py-1 rounded border border-copper text-copper hover:bg-copper/10 disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {running ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : <Sparkles className="w-3 h-3" strokeWidth={1.5} />}
                  Run triage
                </button>
              )}
            </div>

            {!triage && (
              <div className="text-xs text-gray-500 italic">
                {caseDetail.state === 'intake'
                  ? 'Click "Run triage" to invoke the AI classifier. The result is advisory; you confirm or reclassify.'
                  : 'No AI triage on file for this case.'}
              </div>
            )}

            {triage && (
              <div className="space-y-3 text-xs">
                <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-amber-300 inline-flex items-center gap-2">
                  <ShieldAlert className="w-3 h-3" strokeWidth={1.5} />
                  AI-ASSISTED CLASSIFICATION: HUMAN REVIEW REQUIRED
                </div>
                <dl className="grid grid-cols-2 gap-2">
                  <dt className="text-gray-400">Suggested bucket</dt>
                  <dd className="font-mono">{triage.bucket}</dd>
                  <dt className="text-gray-400">Confidence</dt>
                  <dd>{Math.round(triage.confidence * 100)}%</dd>
                  <dt className="text-gray-400">Suggested priority</dt>
                  <dd className="font-mono">{triage.suggested_priority}</dd>
                  <dt className="text-gray-400">Suggested template</dt>
                  <dd className="font-mono">{triage.suggested_template_family ?? '(none)'}</dd>
                </dl>

                <div>
                  <div className="text-gray-400">Rationale</div>
                  <div className="text-gray-200 mt-1 whitespace-pre-wrap">{triage.rationale}</div>
                </div>

                {triage.evidence_citations.length > 0 && (
                  <div>
                    <div className="text-gray-400">Evidence cited</div>
                    <ul className="list-disc ml-4 mt-1 text-gray-300">
                      {triage.evidence_citations.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}

                {triage.blocking_concerns.length > 0 && (
                  <div className="rounded border border-rose-500/40 bg-rose-500/10 p-2">
                    <div className="text-rose-300 font-medium">Blocking concerns</div>
                    <ul className="list-disc ml-4 mt-1 text-rose-200">
                      {triage.blocking_concerns.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}

                {(triage.medical_claim_quotes.length > 0 || triage.regex_scan_matches.length > 0) && (
                  <div className="rounded border border-rose-500/40 bg-rose-500/10 p-2">
                    <div className="text-rose-300 font-medium inline-flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" strokeWidth={1.5} /> Medical claim flagged
                    </div>
                    {triage.medical_claim_quotes.length > 0 && (
                      <ul className="list-disc ml-4 mt-1 text-rose-200">
                        {triage.medical_claim_quotes.map((q, i) => <li key={i}>"{q}"</li>)}
                      </ul>
                    )}
                    {triage.regex_scan_matches.length > 0 && (
                      <div className="mt-1 text-[10px] text-rose-200/80">
                        Regex pre-check matched: {triage.regex_scan_matches.join(', ')}
                      </div>
                    )}
                    <div className="mt-2 text-[10px] text-amber-300">
                      Case routes to Dr. Fadi Dagher (Medical Director) before any enforcement action.
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-gray-500">Ran {new Date(triage.ran_at).toLocaleString()}</div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <h2 className="text-sm font-semibold inline-flex items-center gap-2">
              <CheckCircle className="w-4 h-4" strokeWidth={1.5} /> Human reviewer decision
            </h2>

            {caseDetail.has_medical_claim_flag && !caseDetail.medical_director_reviewed_at && (
              <div className="rounded border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-300 inline-flex items-center gap-2">
                <ShieldAlert className="w-3 h-3" strokeWidth={1.5} />
                Medical Director review required before classification can proceed.
              </div>
            )}

            <label className="text-xs text-gray-400 block">Confirmed bucket</label>
            <select
              value={overrideBucket}
              onChange={(e) => setOverrideBucket(e.target.value)}
              className="w-full text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5 text-white"
            >
              {LEGAL_CASE_BUCKETS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>

            <label className="text-xs text-gray-400 block">Priority</label>
            <select
              value={overridePriority}
              onChange={(e) => setOverridePriority(e.target.value)}
              className="w-full text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5 text-white"
            >
              {LEGAL_CASE_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>

            <button
              disabled={submitting || overrideBucket === 'unclassified' || (caseDetail.has_medical_claim_flag && !caseDetail.medical_director_reviewed_at)}
              onClick={confirmClassification}
              className="w-full text-xs px-3 py-2 rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50 inline-flex items-center justify-center gap-1"
            >
              {submitting ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : <CheckCircle className="w-3 h-3" strokeWidth={1.5} />}
              Confirm and classify
            </button>

            <p className="text-[10px] text-gray-500">
              Confirming transitions the case to the `classified` state, ready for enforcement composition. AI suggestion remains on the case record for audit.
            </p>

            {caseDetail.bucket && caseDetail.bucket !== 'unclassified' && triage && caseDetail.bucket !== triage.bucket && (
              <div className="text-[10px] text-amber-300 inline-flex items-center gap-1">
                <RotateCcw className="w-3 h-3" strokeWidth={1.5} />
                Reclassifying from AI suggestion {triage.bucket} → {caseDetail.bucket}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
