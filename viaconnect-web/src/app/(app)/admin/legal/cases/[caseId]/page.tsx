'use client';

// Prompt #104 Phase 2: Case detail.
// Surfaces metadata, evidence list (with hash badges), and a Phase
// 2 placeholder for the timeline + enforcement composer (those land
// in Phase 4). Evidence upload is the primary action available here.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Loader2, AlertCircle, RefreshCw, Upload, ShieldCheck, ShieldAlert,
} from 'lucide-react';
import { EVIDENCE_ARTIFACT_TYPES } from '@/lib/legal/types';

interface EvidenceRow {
  evidence_id: string;
  artifact_type: string;
  storage_path: string;
  content_sha256: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  captured_at: string;
  captured_via: string | null;
  description: string | null;
}

interface CaseDetail {
  case_id: string;
  case_label: string;
  state: string;
  bucket: string;
  bucket_confidence_score: number | null;
  priority: string;
  has_medical_claim_flag: boolean;
  intake_at: string;
  classified_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  notes: string | null;
  legal_counterparties: { counterparty_id: string; display_label: string; identity_confidence: number; disputed_identity: boolean } | null;
}

export default function CaseDetailPage() {
  const params = useParams<{ caseId: string }>();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [evidence, setEvidence] = useState<EvidenceRow[]>([]);
  const [artifactType, setArtifactType] = useState<string>('page_screenshot');
  const [description, setDescription] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [caseRes, evRes] = await Promise.all([
        fetch(`/api/admin/legal/cases/${params.caseId}`),
        fetch(`/api/admin/legal/cases/${params.caseId}/evidence`),
      ]);
      const caseJson = await caseRes.json();
      const evJson = await evRes.json();
      if (!caseRes.ok) throw new Error(caseJson.error ?? `HTTP ${caseRes.status}`);
      if (!evRes.ok) throw new Error(evJson.error ?? `HTTP ${evRes.status}`);
      setCaseDetail(caseJson.case);
      setEvidence(evJson.rows ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [params.caseId]);

  useEffect(() => { reload(); }, [reload]);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('Choose a file first.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('artifact_type', artifactType);
      if (description) fd.append('description', description);
      const r = await fetch(`/api/admin/legal/cases/${params.caseId}/evidence`, { method: 'POST', body: fd });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
      if (fileRef.current) fileRef.current.value = '';
      setDescription('');
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin/legal/cases" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Cases
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <h1 className="text-2xl md:text-3xl font-bold font-mono">
            {caseDetail?.case_label ?? params.caseId.slice(0, 8)}
          </h1>
          <button onClick={reload} className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 self-start md:self-auto">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
          </button>
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

      {!loading && caseDetail && (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-semibold mb-3">Case</h2>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <dt className="text-gray-400">State</dt>     <dd className="font-mono">{caseDetail.state}</dd>
              <dt className="text-gray-400">Bucket</dt>    <dd className="font-mono">{caseDetail.bucket}</dd>
              <dt className="text-gray-400">Priority</dt>  <dd className="font-mono">{caseDetail.priority}</dd>
              <dt className="text-gray-400">Intake</dt>    <dd>{new Date(caseDetail.intake_at).toLocaleString()}</dd>
              {caseDetail.classified_at && (
                <>
                  <dt className="text-gray-400">Classified</dt>
                  <dd>{new Date(caseDetail.classified_at).toLocaleString()}</dd>
                </>
              )}
              {caseDetail.resolved_at && (
                <>
                  <dt className="text-gray-400">Resolved</dt>
                  <dd>{new Date(caseDetail.resolved_at).toLocaleString()}</dd>
                </>
              )}
              <dt className="text-gray-400">Medical claim</dt>
              <dd>
                {caseDetail.has_medical_claim_flag ? (
                  <span className="text-rose-300 inline-flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" strokeWidth={1.5} /> flagged
                  </span>
                ) : (
                  <span className="text-gray-500">no</span>
                )}
              </dd>
            </dl>
            {caseDetail.notes && (
              <div className="mt-4 text-xs text-gray-300 whitespace-pre-wrap border-t border-white/5 pt-3">{caseDetail.notes}</div>
            )}
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-semibold mb-3">Counterparty</h2>
            {caseDetail.legal_counterparties ? (
              <Link
                href={`/admin/legal/counterparties/${caseDetail.legal_counterparties.counterparty_id}`}
                className="block hover:opacity-90"
              >
                <div className="font-medium">{caseDetail.legal_counterparties.display_label}</div>
                <div className="text-xs text-gray-400 mt-1">
                  Identity confidence {Math.round(caseDetail.legal_counterparties.identity_confidence * 100)}%
                  {caseDetail.legal_counterparties.disputed_identity && (
                    <span className="ml-2 text-rose-300">disputed</span>
                  )}
                </div>
              </Link>
            ) : (
              <div className="text-xs text-gray-500 italic">No counterparty linked. Open a counterparty record and PATCH this case.</div>
            )}
          </section>

          <section className="lg:col-span-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-semibold mb-3">Evidence ({evidence.length})</h2>
            <div className="grid gap-2 mb-4">
              {evidence.length === 0 && (
                <div className="text-xs text-gray-500 italic">No evidence yet. Upload below.</div>
              )}
              {evidence.map((e) => (
                <div key={e.evidence_id} className="border border-white/10 rounded px-3 py-2 text-xs flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="font-mono">{e.artifact_type}</div>
                    <div className="text-gray-400 mt-0.5 break-all">{e.storage_path}</div>
                    {e.description && <div className="text-gray-300 mt-0.5">{e.description}</div>}
                  </div>
                  <div className="text-[10px] text-gray-400 inline-flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-emerald-300">
                      <ShieldCheck className="w-3 h-3" strokeWidth={1.5} /> SHA-256
                    </span>
                    <span className="font-mono break-all">{e.content_sha256.slice(0, 16)}...</span>
                    {e.file_size_bytes !== null && <span>{(e.file_size_bytes / 1024).toFixed(1)} KB</span>}
                    <span>{new Date(e.captured_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-white/5 pt-4">
              <div className="text-xs text-gray-400 mb-2">Upload evidence</div>
              <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-end">
                <select
                  value={artifactType}
                  onChange={(e) => setArtifactType(e.target.value)}
                  className="text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5"
                >
                  {EVIDENCE_ARTIFACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                  ref={fileRef}
                  type="file"
                  className="text-xs text-gray-300 file:mr-2 file:px-2 file:py-1 file:rounded file:border file:border-white/10 file:bg-white/5 file:text-white file:hover:bg-white/10"
                />
                <input
                  type="text"
                  placeholder="Optional description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-xs bg-[#0E1A30] border border-white/10 rounded px-2 py-1.5 flex-1 text-white"
                />
                <button
                  disabled={uploading}
                  onClick={upload}
                  className="text-xs px-3 py-1.5 rounded border border-copper text-copper hover:bg-copper/10 disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : <Upload className="w-3 h-3" strokeWidth={1.5} />} Upload
                </button>
              </div>
              <div className="text-[10px] text-gray-500 mt-2">
                File is uploaded to private bucket legal-evidence and SHA-256 hashed at capture. Hash recorded on the evidence row for chain-of-custody verification on every read.
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
