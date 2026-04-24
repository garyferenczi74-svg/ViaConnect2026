import Link from 'next/link';
import { FileStack, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { classifyMany, countByFreshness } from '@/lib/soc2/manualEvidence/freshness';
import type { ManualEvidenceRow } from '@/lib/soc2/manualEvidence/types';
import ManualEvidenceList from '@/components/compliance/soc2/ManualEvidenceList';

export const dynamic = 'force-dynamic';

interface DbRow {
  id: string; title: string; storage_key: string; sha256: string; size_bytes: number;
  content_type: string; controls: string[]; valid_from: string | null; valid_until: string | null;
  source_description: string; uploaded_by: string; uploaded_at: string;
  signoff_by: string | null; signoff_at: string | null; superseded_by: string | null;
  archived: boolean; archived_at: string | null;
}

export default async function ManualEvidencePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('soc2_manual_evidence')
    .select('id, title, storage_key, sha256, size_bytes, content_type, controls, valid_from, valid_until, source_description, uploaded_by, uploaded_at, signoff_by, signoff_at, superseded_by, archived, archived_at')
    .order('uploaded_at', { ascending: false })
    .limit(500);

  const rawRows: ManualEvidenceRow[] = ((data as DbRow[] | null) ?? []).map(toCamel);
  const classified = classifyMany(rawRows);
  const counts = countByFreshness(classified);

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <Header />
      <div className="px-4 md:px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Stat label="Total" value={counts.total} tone="slate" />
          <Stat label="Fresh" value={counts.fresh} tone="emerald" />
          <Stat label="Needs signoff" value={counts.needs_signoff} tone="blue" />
          <Stat label="Expiring" value={counts.expiring_soon} tone="amber" />
          <Stat label="Expired" value={counts.expired} tone="red" />
          <Stat label="Stale" value={counts.stale} tone="amber" />
        </div>
        <ManualEvidenceList rows={classified} />
      </div>
    </div>
  );
}

function toCamel(r: DbRow): ManualEvidenceRow {
  return {
    id: r.id, title: r.title, storageKey: r.storage_key, sha256: r.sha256, sizeBytes: r.size_bytes,
    contentType: r.content_type, controls: r.controls ?? [],
    validFrom: r.valid_from, validUntil: r.valid_until,
    sourceDescription: r.source_description, uploadedBy: r.uploaded_by, uploadedAt: r.uploaded_at,
    signoffBy: r.signoff_by, signoffAt: r.signoff_at, supersededBy: r.superseded_by,
    archived: r.archived, archivedAt: r.archived_at,
  };
}

function Header() {
  return (
    <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
          <FileStack className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg md:text-xl font-bold text-white">SOC 2 manual evidence vault</h1>
          <p className="text-xs text-white/40">Signed policies, vendor BAAs, training certificates. Signed off by Steve Rica before bundling into live packets.</p>
        </div>
        <Link
          href="/admin/compliance/soc2/manual-evidence/upload"
          className="inline-flex items-center gap-2 rounded-md bg-[#B75E18] hover:bg-[#C96D1E] text-white text-sm font-medium px-3 py-2 transition"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} aria-hidden />
          Upload evidence
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'emerald' | 'blue' | 'amber' | 'red' }) {
  const classes: Record<typeof tone, string> = {
    slate:   'border-white/[0.12] bg-white/[0.04] text-white/80',
    emerald: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
    blue:    'border-blue-400/30 bg-blue-500/10 text-blue-200',
    amber:   'border-amber-400/30 bg-amber-500/10 text-amber-200',
    red:     'border-red-400/30 bg-red-500/10 text-red-200',
  };
  return (
    <div className={`rounded-lg border ${classes[tone]} p-3`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
    </div>
  );
}
