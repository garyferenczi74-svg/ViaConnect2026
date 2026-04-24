import Link from 'next/link';
import { ChevronLeft, ListTree } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ISO27001_CONTROL_POINTS } from '@/lib/compliance/frameworks/definitions/iso27001';
import SoaForm from '@/components/iso-admin/SoaForm';

export const dynamic = 'force-dynamic';

interface Row {
  id: string;
  control_ref: string;
  version: number;
  applicability: string;
  implementation_status: string;
  justification: string;
  effective_from: string;
  effective_until: string | null;
  approved_at: string | null;
  recorded_at: string;
}

export default async function SoaPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('iso_statements_of_applicability')
    .select('id, control_ref, version, applicability, implementation_status, justification, effective_from, effective_until, approved_at, recorded_at')
    .order('control_ref', { ascending: true })
    .order('version', { ascending: false })
    .limit(250);
  const rows: Row[] = (data as Row[] | null) ?? [];

  // Keep only the highest-version row per control_ref (the currently-effective SoA entry).
  const currentByControl = new Map<string, Row>();
  for (const r of rows) {
    if (!currentByControl.has(r.control_ref)) currentByControl.set(r.control_ref, r);
  }
  const currentRows = Array.from(currentByControl.values());

  const controlOptions = ISO27001_CONTROL_POINTS
    .filter((c) => c.id.startsWith('A.')) // SoA is about Annex A applicability
    .map((c) => ({ value: c.id, label: `${c.id}: ${c.name}` }));

  const applicable = currentRows.filter((r) => r.applicability === 'applicable').length;
  const excluded = currentRows.filter((r) => r.applicability === 'excluded').length;

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/frameworks/iso" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          ISO overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <ListTree className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Statement of Applicability</h1>
            <p className="text-xs text-white/40">Clause 6.1.3. One determination per Annex A control. Each change creates a new version.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Record a determination</h2>
          <SoaForm controls={controlOptions} />
        </section>

        <section>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <h2 className="text-sm font-semibold text-white">Current determinations ({currentRows.length} of 93)</h2>
            <span className="text-[11px] text-white/60">
              <span className="text-emerald-300">{applicable}</span> applicable, <span className="text-white/70">{excluded}</span> excluded
            </span>
          </div>
          {currentRows.length === 0 ? (
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-white/50">No SoA determinations on file.</div>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-auto pr-2">
              {currentRows.map((r) => (
                <article key={r.id} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="font-mono text-xs text-white">{r.control_ref}</span>
                    <ApplicabilityBadge applicability={r.applicability} />
                    <StatusBadge status={r.implementation_status} />
                    <span className="ml-auto text-[10px] text-white/40">v{r.version}</span>
                  </div>
                  <p className="mt-2 text-xs text-white/70 line-clamp-2">{r.justification}</p>
                  <div className="mt-1 text-[10px] text-white/40">from {r.effective_from}{r.effective_until ? ` to ${r.effective_until}` : ''}{r.approved_at ? ', approved' : ', pending approval'}</div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ApplicabilityBadge({ applicability }: { applicability: string }) {
  const map: Record<string, string> = {
    applicable: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200',
    excluded: 'bg-slate-500/15 border-slate-400/30 text-slate-200',
  };
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${map[applicability] ?? 'bg-white/[0.05] border-white/[0.12] text-white/70'}`}>
      {applicability}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    implemented: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200',
    in_progress: 'bg-amber-500/15 border-amber-400/30 text-amber-200',
    planned: 'bg-blue-500/15 border-blue-400/30 text-blue-200',
    not_applicable: 'bg-slate-500/15 border-slate-400/30 text-slate-200',
  };
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${map[status] ?? 'bg-white/[0.05] border-white/[0.12] text-white/70'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
