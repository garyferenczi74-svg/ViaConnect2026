'use client';

// Prompt #96 Phase 4: Compliance review interface.
//
// Left pane: LabelPreview rendering of the submitted design.
// Right pane: automated checklist results + decision controls
// (approve / request revision / reject) per reviewer role.

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { LabelPreview, type LabelPreviewBrand, type LabelPreviewDesign } from '@/components/white-label/LabelPreview';

interface DesignRow extends LabelPreviewDesign {
  id: string;
  status: string;
  version_number: number;
  practitioner_id: string;
}
interface BrandRow extends LabelPreviewBrand {
  id: string;
  brand_config_approved: boolean;
}

interface ChecklistItem {
  id: string;
  description: string;
  category: string;
  severity: 'blocker' | 'warning';
  passed: boolean;
  notes?: string;
}

interface AutomatedReview {
  id: string;
  decision: string;
  reviewed_at: string;
  checklist_results: { checks: ChecklistItem[] };
  decision_notes: string | null;
}

export default function ComplianceReviewPage({ params }: { params: { designId: string } }) {
  const searchParams = useSearchParams();
  const role = (searchParams.get('role') === 'medical_director' ? 'medical_director' : 'compliance_officer') as
    'compliance_officer' | 'medical_director';

  const [design, setDesign] = useState<DesignRow | null>(null);
  const [brand, setBrand] = useState<BrandRow | null>(null);
  const [product, setProduct] = useState<{ id: string; name: string; sku: string } | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<'approved' | 'revision_requested' | 'rejected' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [decided, setDecided] = useState<{ next_status: string; gate_outcome: string } | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      // Reuse the practitioner-facing GET; admin RLS lets us read any.
      const r = await fetch(`/api/practitioner/white-label/labels/${params.designId}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setDesign(json.design);
      setBrand(json.brand);
      setProduct(json.product);

      // The practitioner-facing GET does not return reviews; fetch them
      // directly via the table read (admin RLS allows it).
      const r2 = await fetch(`/api/admin/white-label/compliance/reviews?design_id=${params.designId}`);
      if (r2.ok) {
        const j2 = await r2.json();
        setReviews(j2.reviews ?? []);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, [params.designId]);

  const automated = useMemo<AutomatedReview | null>(
    () => (reviews.find((r) => r.review_type === 'automated_checklist') as AutomatedReview | undefined) ?? null,
    [reviews],
  );

  async function decide(decision: 'approved' | 'revision_requested' | 'rejected') {
    if (decision === 'rejected' && (notes.trim().length < 50)) {
      setError('Rejection requires a justification of at least 50 characters.');
      return;
    }
    if (decision === 'revision_requested' && (notes.trim().length < 20)) {
      setError('Revision request requires notes of at least 20 characters.');
      return;
    }
    setSubmitting(decision);
    setError(null);
    try {
      const r = await fetch(`/api/admin/white-label/compliance/decide/${params.designId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewer_role: role, decision, notes: notes.trim() || null }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      setDecided({ next_status: json.next_status, gate_outcome: json.gate_outcome });
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
  if (!design || !brand || !product) {
    return (
      <div className="min-h-screen bg-[#0E1A30] text-white p-8 text-sm text-rose-300">
        {error ?? 'Design not found.'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-4">
        <Link href="/admin/white-label/compliance/inbox" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Inbox
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <p className="text-xs text-gray-400">{product.name} ({product.sku}) ; v{design.version_number} ; reviewing as {role.replace('_', ' ')}</p>
            <h1 className="text-xl md:text-2xl font-bold">{design.display_product_name}</h1>
          </div>
          <button
            onClick={reload}
            className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 self-start md:self-auto"
          >
            <RefreshCw className="w-3 h-3" strokeWidth={1.5} /> Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> {error}
        </div>
      )}

      {decided && (
        <div className="mb-4 rounded-lg border border-portal-green/30 bg-portal-green/10 p-3 text-sm text-portal-green inline-flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
          Decision recorded. Design status: {decided.next_status} ; gate outcome: {decided.gate_outcome}.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section>
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Label preview</p>
          <LabelPreview brand={brand} design={design} />
        </section>

        <section className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Automated checklist</p>
            {!automated && <p className="text-xs text-gray-500 italic">Not yet run.</p>}
            {automated && (
              <ul className="space-y-1 text-xs">
                {(automated.checklist_results?.checks ?? []).map((c) => (
                  <li key={c.id} className="flex items-start gap-2">
                    {c.passed ? (
                      <CheckCircle2 className="w-3 h-3 text-portal-green shrink-0 mt-0.5" strokeWidth={1.5} />
                    ) : c.severity === 'blocker' ? (
                      <XCircle className="w-3 h-3 text-rose-300 shrink-0 mt-0.5" strokeWidth={1.5} />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-amber-300 shrink-0 mt-0.5" strokeWidth={1.5} />
                    )}
                    <span className={c.passed ? 'text-gray-300' : c.severity === 'blocker' ? 'text-rose-200' : 'text-amber-200'}>
                      {c.description}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Decision</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Notes (revision requests need 20+ chars; rejections need 50+ chars)"
              className="w-full bg-white/[0.06] border border-white/10 rounded px-3 py-2 text-sm placeholder:text-gray-500"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                disabled={!!submitting || design.status !== 'under_compliance_review'}
                onClick={() => decide('approved')}
                className="text-sm px-3 py-2 rounded bg-portal-green/30 hover:bg-portal-green/50 inline-flex items-center gap-1 disabled:opacity-40"
              >
                {submitting === 'approved' ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />}
                Approve
              </button>
              <button
                disabled={!!submitting || design.status !== 'under_compliance_review'}
                onClick={() => decide('revision_requested')}
                className="text-sm px-3 py-2 rounded bg-amber-500/30 hover:bg-amber-500/50 inline-flex items-center gap-1 disabled:opacity-40"
              >
                {submitting === 'revision_requested' ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />}
                Request revision
              </button>
              <button
                disabled={!!submitting || design.status !== 'under_compliance_review'}
                onClick={() => decide('rejected')}
                className="text-sm px-3 py-2 rounded bg-rose-500/30 hover:bg-rose-500/50 inline-flex items-center gap-1 disabled:opacity-40"
              >
                {submitting === 'rejected' ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <XCircle className="w-4 h-4" strokeWidth={1.5} />}
                Reject
              </button>
            </div>
            {design.status !== 'under_compliance_review' && (
              <p className="text-xs text-gray-500 mt-2 italic">
                This design is in status {design.status}; decisions can only be recorded while it is under_compliance_review.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Review history</p>
            <ul className="space-y-2 text-xs">
              {reviews.length === 0 && <li className="text-gray-500 italic">No reviews yet.</li>}
              {reviews.map((r) => (
                <li key={r.id} className="border-l-2 border-white/10 pl-2">
                  <p>
                    <span className="font-mono">{r.review_type}</span> ; {r.decision}
                    {r.reviewer_role && <> ; by {r.reviewer_role}</>}
                  </p>
                  <p className="text-gray-500">{new Date(r.reviewed_at).toLocaleString()}</p>
                  {r.decision_notes && <p className="text-gray-300 mt-1">{r.decision_notes}</p>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
