'use client';

// Prompt #103 Phase 3: Admin brand-compliance review detail.
// Shows the packaging proof image alongside the detected-issues list.
// Admin approves, rejects, or requests remediation.

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, AlertTriangle, CheckCircle, XCircle, RotateCcw,
} from 'lucide-react';

interface Issue {
  code: string;
  severity: 'minor' | 'major' | 'critical';
  message: string;
  bbox?: { x: number; y: number; w: number; h: number };
}

interface Review {
  review_id: string;
  product_id: string;
  packaging_proof_path: string;
  detected_issues_json: Issue[];
  severity: 'clean' | 'minor' | 'major' | 'critical';
  status: string;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  products: { name: string } | null;
}

const SEVERITY_CLASS: Record<Issue['severity'], string> = {
  minor:    'text-amber-300   border-amber-500/30   bg-amber-500/10',
  major:    'text-orange-300  border-orange-500/40  bg-orange-500/10',
  critical: 'text-rose-300    border-rose-500/40    bg-rose-500/10',
};

export default function ReviewDetailPage() {
  const router = useRouter();
  const params = useParams<{ reviewId: string }>();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/brand-compliance/${params.reviewId}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setReview(json.review);
      setNotes(json.review?.reviewer_notes ?? '');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, [params.reviewId]);

  async function act(action: 'approve' | 'reject' | 'request_remediation') {
    setSubmitting(action);
    setError(null);
    try {
      const r = await fetch(`/api/admin/brand-compliance/${params.reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      router.push('/admin/brand-compliance');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin/brand-compliance" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Queue
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold mt-2">Review detail</h1>
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

      {!loading && review && (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs text-gray-400 mb-2">Product</div>
            <div className="font-medium">{review.products?.name ?? review.product_id.slice(0, 8)}</div>
            <div className="text-xs text-gray-500 font-mono mt-0.5">{review.product_id}</div>

            <div className="mt-4 text-xs text-gray-400">Packaging proof path</div>
            <div className="text-xs font-mono break-all mt-1">{review.packaging_proof_path}</div>

            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs text-gray-400">Overall severity</span>
              <span className={`text-xs px-2 py-0.5 rounded border inline-flex items-center gap-1 ${review.severity === 'critical' ? SEVERITY_CLASS.critical : review.severity === 'major' ? SEVERITY_CLASS.major : review.severity === 'minor' ? SEVERITY_CLASS.minor : 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'}`}>
                {review.severity === 'critical' && <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />}
                {review.severity}
              </span>
              <span className="text-xs text-gray-500">{new Date(review.created_at).toLocaleString()}</span>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs text-gray-400 mb-2">Detected issues</div>
            {review.detected_issues_json.length === 0 ? (
              <div className="text-sm text-emerald-300 inline-flex items-center gap-1">
                <CheckCircle className="w-3 h-3" strokeWidth={1.5} /> No issues detected.
              </div>
            ) : (
              <ul className="space-y-2">
                {review.detected_issues_json.map((i, idx) => (
                  <li key={idx} className={`text-xs px-2 py-1.5 rounded border ${SEVERITY_CLASS[i.severity]}`}>
                    <div className="font-mono text-[11px] opacity-80">{i.code}</div>
                    <div className="mt-0.5">{i.message}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="lg:col-span-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <label className="block text-xs text-gray-400 mb-1" htmlFor="review-notes">Reviewer notes</label>
            <textarea
              id="review-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded bg-[#0E1A30] border border-white/10 px-3 py-2 text-sm text-white"
              placeholder="Required for reject; optional for approve and remediation."
            />

            <div className="flex flex-col md:flex-row gap-2 mt-3">
              <button
                disabled={submitting !== null}
                onClick={() => act('approve')}
                className="text-xs px-3 py-2 rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 inline-flex items-center gap-1"
              >
                {submitting === 'approve' ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : <CheckCircle className="w-3 h-3" strokeWidth={1.5} />} Approve
              </button>
              <button
                disabled={submitting !== null}
                onClick={() => act('request_remediation')}
                className="text-xs px-3 py-2 rounded border border-orange-500/40 text-orange-300 hover:bg-orange-500/10 inline-flex items-center gap-1"
              >
                {submitting === 'request_remediation' ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : <RotateCcw className="w-3 h-3" strokeWidth={1.5} />} Request remediation
              </button>
              <button
                disabled={submitting !== null}
                onClick={() => act('reject')}
                className="text-xs px-3 py-2 rounded border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 inline-flex items-center gap-1"
              >
                {submitting === 'reject' ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : <XCircle className="w-3 h-3" strokeWidth={1.5} />} Reject
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
