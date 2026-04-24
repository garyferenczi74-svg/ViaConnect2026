import Link from 'next/link';
import { ChevronLeft, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import FreshnessChip from '@/components/compliance/soc2/FreshnessChip';
import DispositionButtons from '@/components/compliance/soc2/DispositionButtons';
import { classifyFreshness } from '@/lib/soc2/manualEvidence/freshness';
import type { ManualEvidenceRow } from '@/lib/soc2/manualEvidence/types';

export const dynamic = 'force-dynamic';

export default async function ManualEvidenceDetailPage({ params }: { params: { id: string } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('soc2_manual_evidence')
    .select('id, title, storage_key, sha256, size_bytes, content_type, controls, valid_from, valid_until, source_description, uploaded_by, uploaded_at, signoff_by, signoff_at, superseded_by, archived, archived_at')
    .eq('id', params.id)
    .maybeSingle();
  if (!data) {
    return (
      <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
        <Link href="/admin/compliance/soc2/manual-evidence" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          Manual evidence
        </Link>
        <div className="mt-6 rounded-md border border-red-400/40 bg-red-500/10 text-red-200 text-sm px-3 py-2">
          Evidence row not found.
        </div>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data as any;
  const row: ManualEvidenceRow = {
    id: r.id, title: r.title, storageKey: r.storage_key, sha256: r.sha256, sizeBytes: r.size_bytes,
    contentType: r.content_type, controls: r.controls ?? [],
    validFrom: r.valid_from, validUntil: r.valid_until,
    sourceDescription: r.source_description, uploadedBy: r.uploaded_by, uploadedAt: r.uploaded_at,
    signoffBy: r.signoff_by, signoffAt: r.signoff_at, supersededBy: r.superseded_by,
    archived: r.archived, archivedAt: r.archived_at,
  };
  const { state, daysUntilExpiry } = classifyFreshness(row);

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/compliance/soc2/manual-evidence" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          Manual evidence
        </Link>
        <div className="flex items-start gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <FreshnessChip state={state} daysUntilExpiry={daysUntilExpiry} />
            </div>
            <h1 className="text-base md:text-lg font-semibold text-white mt-1">{row.title}</h1>
            <p className="text-xs text-white/50 font-mono">{row.id}</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 space-y-2">
          <div className="text-xs font-semibold text-white/80">Controls</div>
          <div className="flex flex-wrap gap-1">
            {row.controls.length === 0 ? (
              <span className="text-xs text-white/40 italic">none attached</span>
            ) : row.controls.map((c) => (
              <span key={c} className="text-[11px] font-mono rounded-md border border-white/[0.12] bg-white/[0.04] text-white px-1.5 py-0.5">{c}</span>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 space-y-1 text-xs text-white/70">
          <div>Uploaded: <span className="text-white">{row.uploadedAt.slice(0, 10)}</span></div>
          <div>Valid: <span className="text-white">{row.validFrom ?? '...'} → {row.validUntil ?? 'open'}</span></div>
          <div>Size: <span className="text-white tabular-nums">{formatBytes(row.sizeBytes)}</span></div>
          <div>Type: <span className="text-white font-mono">{row.contentType}</span></div>
          <div>SHA-256: <span className="text-white font-mono text-[10px] break-all">{row.sha256}</span></div>
          <div>Signoff: {row.signoffAt ? <span className="text-emerald-300">{row.signoffAt.slice(0, 10)}</span> : <span className="text-amber-300">pending</span>}</div>
          <div>Storage: <span className="text-white/80 font-mono text-[10px] break-all">{row.storageKey}</span></div>
        </section>

        <section className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 space-y-3">
          <div className="text-xs font-semibold text-white/80">Source description</div>
          <p className="text-sm text-white/80 whitespace-pre-wrap">{row.sourceDescription}</p>
          <div className="pt-3 border-t border-white/[0.08]">
            <DispositionButtons rowId={row.id} alreadySignedOff={row.signoffAt !== null} alreadyArchived={row.archived} />
          </div>
        </section>
      </div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
