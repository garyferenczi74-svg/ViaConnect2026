'use client';

// Prompt #104 Phase 4: Enforcement composer.
//
// Selects a bucket-compatible template, fills merge fields, creates a
// DRAFT enforcement action. Approval and send happen on the action
// detail page (a separate human step per the no-auto-send rule).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Loader2, AlertCircle, FileText, AlertTriangle, Sparkles,
} from 'lucide-react';

interface CaseDetail {
  case_id: string;
  case_label: string;
  bucket: string;
  state: string;
  legal_counterparties: { display_label: string } | null;
}

interface TemplateRow {
  template_id: string;
  template_family: string;
  version: string;
  applicable_buckets: string[];
  required_merge_fields: string[];
  status: 'draft' | 'active' | 'retired';
}

interface ExistingAction {
  action_id: string;
  action_type: string;
  status: string;
  drafted_at: string;
}

export default function EnforcementComposerPage() {
  const params = useParams<{ caseId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [existing, setExisting] = useState<ExistingAction[]>([]);

  const [templateId, setTemplateId] = useState<string>('');
  const [actionType, setActionType] = useState<string>('cease_and_desist_letter');
  const [signingOfficer, setSigningOfficer] = useState<string>('Steve Rica');
  const [responseDeadlineDays, setResponseDeadlineDays] = useState<number>(14);
  const [productName, setProductName] = useState('');
  const [evidenceSummary, setEvidenceSummary] = useState('');
  const [materialDifferences, setMaterialDifferences] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [caseRes, tplRes, actRes] = await Promise.all([
        fetch(`/api/admin/legal/cases/${params.caseId}`),
        fetch('/api/admin/legal/templates?status=active'),
        fetch(`/api/admin/legal/cases/${params.caseId}`),  // future: separate actions endpoint
      ]);
      const caseJson = await caseRes.json();
      const tplJson = await tplRes.json();
      void actRes;
      if (!caseRes.ok) throw new Error(caseJson.error ?? `HTTP ${caseRes.status}`);
      if (!tplRes.ok) throw new Error(tplJson.error ?? `HTTP ${tplRes.status}`);
      setCaseDetail(caseJson.case);
      setTemplates(tplJson.rows ?? []);
      setExisting([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [params.caseId]);

  useEffect(() => { reload(); }, [reload]);

  const compatibleTemplates = templates.filter((t) => caseDetail && t.applicable_buckets.includes(caseDetail.bucket));

  async function createDraft() {
    if (!templateId) {
      setError('Pick a template first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/legal/cases/${params.caseId}/enforcement-actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: actionType,
          template_id: templateId,
          signing_officer: signingOfficer,
          response_deadline_days: responseDeadlineDays,
          product_name: productName || undefined,
          evidence_summary: evidenceSummary || undefined,
          material_differences_summary: materialDifferences || undefined,
          documented_material_differences: caseDetail?.bucket === 'gray_market_material_differences' && materialDifferences
            ? [{ category: 'other', description: materialDifferences }]
            : undefined,
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      router.push(`/admin/legal/cases/${params.caseId}/enforce/${json.action.action_id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href={`/admin/legal/cases/${params.caseId}`} className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Case
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold mt-2 inline-flex items-center gap-2">
          <FileText className="w-6 h-6" strokeWidth={1.5} /> Enforcement composer
        </h1>
        {caseDetail && (
          <p className="text-sm text-gray-400 mt-1">
            <span className="font-mono">{caseDetail.case_label}</span> &middot; bucket <span className="font-mono">{caseDetail.bucket}</span>
            {caseDetail.legal_counterparties && <> &middot; counterparty {caseDetail.legal_counterparties.display_label}</>}
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

      {!loading && caseDetail && caseDetail.bucket === 'unclassified' && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300 inline-flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" strokeWidth={1.5} /> Case bucket is unclassified. Triage and classify the case before drafting any enforcement action.
        </div>
      )}

      {!loading && caseDetail && caseDetail.bucket !== 'unclassified' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <h2 className="text-sm font-semibold">Template (compatible with bucket)</h2>
            {compatibleTemplates.length === 0 ? (
              <div className="text-xs text-gray-500 italic">No active templates compatible with bucket {caseDetail.bucket}.</div>
            ) : (
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5 text-white"
              >
                <option value="">Choose template...</option>
                {compatibleTemplates.map((t) => (
                  <option key={t.template_id} value={t.template_id}>
                    {t.template_family} {t.version}
                  </option>
                ))}
              </select>
            )}

            <label className="text-xs text-gray-400 block">Action type</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5 text-white"
            >
              <option value="cease_and_desist_letter">cease_and_desist_letter</option>
              <option value="dmca_takedown">dmca_takedown</option>
              <option value="marketplace_ip_complaint">marketplace_ip_complaint</option>
              <option value="marketplace_tos_complaint">marketplace_tos_complaint</option>
              <option value="information_request">information_request</option>
            </select>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <h2 className="text-sm font-semibold">Merge fields</h2>

            <label className="text-xs text-gray-400 block">Signing officer</label>
            <input
              type="text"
              value={signingOfficer}
              onChange={(e) => setSigningOfficer(e.target.value)}
              className="w-full text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5 text-white"
            />

            <label className="text-xs text-gray-400 block">Response deadline (days)</label>
            <input
              type="number"
              min={1}
              max={90}
              value={responseDeadlineDays}
              onChange={(e) => setResponseDeadlineDays(Number(e.target.value))}
              className="w-full text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5 text-white"
            />

            <label className="text-xs text-gray-400 block">Product name (single SKU at issue)</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g., Replenish NAD+"
              className="w-full text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5 text-white"
            />

            <label className="text-xs text-gray-400 block">Evidence summary</label>
            <textarea
              rows={3}
              value={evidenceSummary}
              onChange={(e) => setEvidenceSummary(e.target.value)}
              placeholder="Bullet summary of supporting evidence."
              className="w-full text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5 text-white"
            />

            {caseDetail.bucket === 'gray_market_material_differences' && (
              <>
                <label className="text-xs text-gray-400 block">Material differences (required)</label>
                <textarea
                  rows={3}
                  value={materialDifferences}
                  onChange={(e) => setMaterialDifferences(e.target.value)}
                  placeholder="Document the material differences (warranty, labeling, formulation, etc.)"
                  className="w-full text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5 text-white"
                />
              </>
            )}
          </section>

          <section className="lg:col-span-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <button
              disabled={submitting || !templateId}
              onClick={createDraft}
              className="text-xs px-4 py-2 rounded border border-copper text-copper hover:bg-copper/10 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : <Sparkles className="w-3 h-3" strokeWidth={1.5} />}
              Create draft
            </button>
            <p className="text-[10px] text-gray-500 mt-2">
              Creates a DRAFT enforcement action with the rendered body and SHA-256 hash. Submit-for-approval, approve, and mark-sent are separate steps on the action detail page.
            </p>
          </section>
        </div>
      )}

      {existing.length > 0 && (
        <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-sm font-semibold mb-3">Existing enforcement actions</h2>
          <div className="grid gap-2">
            {existing.map((a) => (
              <Link
                key={a.action_id}
                href={`/admin/legal/cases/${params.caseId}/enforce/${a.action_id}`}
                className="block rounded border border-white/5 px-3 py-2 hover:border-copper text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono">{a.action_type}</span>
                  <span className="text-gray-400">{a.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
