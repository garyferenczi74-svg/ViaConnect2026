import Link from 'next/link';
import { ChevronLeft, Library, CheckCircle, Circle, Archive } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface CorpusRow {
  id: string;
  sku: string;
  artifact_kind: string;
  version: string;
  storage_key: string;
  approved: boolean;
  retired: boolean;
  approved_at: string | null;
  created_at: string;
}

export default async function CorpusPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const { data, error } = await supabase
    .from('counterfeit_reference_corpus')
    .select('id, sku, artifact_kind, version, storage_key, approved, retired, approved_at, created_at')
    .order('sku', { ascending: true })
    .order('artifact_kind', { ascending: true })
    .order('version', { ascending: false })
    .limit(2000);

  const rows: CorpusRow[] = (data as CorpusRow[] | null) ?? [];

  // Group by SKU for the grid.
  const bySku = new Map<string, CorpusRow[]>();
  for (const r of rows) {
    if (!bySku.has(r.sku)) bySku.set(r.sku, []);
    bySku.get(r.sku)!.push(r);
  }

  const totalSkus = bySku.size;
  const totalApproved = rows.filter((r) => r.approved && !r.retired).length;
  const totalUnapproved = rows.filter((r) => !r.approved && !r.retired).length;
  const totalRetired = rows.filter((r) => r.retired).length;

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/marshall/vision" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          Vision overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <Library className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Reference corpus</h1>
            <p className="text-xs text-white/40">Authentic FarmCeutica packaging artifacts. Steve approves before use.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="SKUs represented" value={totalSkus} />
          <Stat label="Approved artifacts" value={totalApproved} />
          <Stat label="Pending approval" value={totalUnapproved} />
          <Stat label="Retired" value={totalRetired} />
        </div>

        {error ? (
          <div className="rounded-md border border-red-400/40 bg-red-500/10 text-red-200 text-sm px-3 py-2">
            Query failed: {error.message}
          </div>
        ) : totalSkus === 0 ? (
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 text-center">
            <p className="text-sm text-white/60">
              No reference artifacts yet.
            </p>
            <p className="text-xs text-white/40 mt-2">
              Upload via /admin/marshall/vision/corpus/upload. Phase A marketing shoot covers all 169 SKUs.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(bySku.entries()).map(([sku, artifacts]) => (
              <SkuBlock key={sku} sku={sku} artifacts={artifacts} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/[0.12] bg-white/[0.04] p-3">
      <div className="text-xs text-white/60">{label}</div>
      <div className="text-2xl font-bold text-white mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function SkuBlock({ sku, artifacts }: { sku: string; artifacts: CorpusRow[] }) {
  const byKind = new Map<string, CorpusRow[]>();
  for (const a of artifacts) {
    if (!byKind.has(a.artifact_kind)) byKind.set(a.artifact_kind, []);
    byKind.get(a.artifact_kind)!.push(a);
  }
  return (
    <section className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="font-mono text-sm font-semibold text-white">{sku}</span>
        <span className="text-[11px] text-white/40">{artifacts.length} artifact{artifacts.length === 1 ? '' : 's'}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {Array.from(byKind.entries()).map(([kind, versions]) => {
          const latest = versions[0]; // already sorted DESC
          return (
            <div key={kind} className="rounded-md border border-white/[0.08] bg-black/20 p-2">
              <div className="flex items-center gap-1 mb-1">
                <StatusIcon approved={latest.approved} retired={latest.retired} />
                <span className="text-[10px] text-white/70 truncate" title={kind}>{kind}</span>
              </div>
              <div className="text-[10px] text-white/40 font-mono truncate">{latest.version}</div>
              <div className="text-[9px] text-white/30 truncate" title={latest.storage_key}>
                {latest.storage_key.split('/').pop()}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StatusIcon({ approved, retired }: { approved: boolean; retired: boolean }) {
  if (retired) return <Archive className="w-3 h-3 text-white/40" strokeWidth={1.5} aria-label="retired" />;
  if (approved) return <CheckCircle className="w-3 h-3 text-emerald-400" strokeWidth={1.5} aria-label="approved" />;
  return <Circle className="w-3 h-3 text-amber-400" strokeWidth={1.5} aria-label="pending approval" />;
}
