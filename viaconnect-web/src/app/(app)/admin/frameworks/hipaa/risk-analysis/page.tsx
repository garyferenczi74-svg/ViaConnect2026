import Link from 'next/link';
import { ChevronLeft, BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import RiskAnalysisUploadForm from '@/components/hipaa-admin/RiskAnalysisUploadForm';

export const dynamic = 'force-dynamic';

interface Row {
  id: string;
  version: number;
  storage_key: string;
  sha256: string;
  valid_from: string;
  valid_until: string | null;
  scope_summary: string;
  approved_at: string | null;
  created_at: string;
}

export default async function RiskAnalysisPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('hipaa_risk_analyses')
    .select('id, version, storage_key, sha256, valid_from, valid_until, scope_summary, approved_at, created_at')
    .order('version', { ascending: false });
  const rows: Row[] = (data as Row[] | null) ?? [];

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/frameworks/hipaa" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          HIPAA overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Risk Analysis</h1>
            <p className="text-xs text-white/40">45 CFR 164.308(a)(1)(ii)(A). Required. Annual at minimum.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Upload new version</h2>
          <RiskAnalysisUploadForm />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-white mb-3">Versions ({rows.length})</h2>
          {rows.length === 0 ? (
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-white/50">No risk analyses on file.</div>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <article key={r.id} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="font-mono text-sm text-white">v{r.version}</span>
                    <span className={`inline-flex items-center text-[11px] rounded-md px-1.5 py-0.5 border ${r.approved_at ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200' : 'bg-amber-500/15 border-amber-400/30 text-amber-200'}`}>
                      {r.approved_at ? 'approved' : 'pending approval'}
                    </span>
                    <span className="ml-auto text-[11px] text-white/50">valid {r.valid_from} → {r.valid_until ?? 'open'}</span>
                  </div>
                  <p className="mt-2 text-xs text-white/80">{r.scope_summary}</p>
                  <div className="mt-1 text-[10px] text-white/40 font-mono break-all">{r.sha256.slice(0, 32)}… · {r.storage_key}</div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
