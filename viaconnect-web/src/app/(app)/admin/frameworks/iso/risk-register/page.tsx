import Link from 'next/link';
import { ChevronLeft, Gauge } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import RiskForm from '@/components/iso-admin/RiskForm';

export const dynamic = 'force-dynamic';

interface Row {
  id: string;
  risk_ref: string;
  threat: string;
  vulnerability: string;
  likelihood: number;
  impact: number;
  inherent_risk: number;
  treatment_option: string;
  residual_likelihood: number | null;
  residual_impact: number | null;
  residual_risk: number | null;
  status: string;
  identified_at: string;
  next_review_date: string | null;
}

export default async function RiskRegisterPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('iso_risk_register')
    .select('id, risk_ref, threat, vulnerability, likelihood, impact, inherent_risk, treatment_option, residual_likelihood, residual_impact, residual_risk, status, identified_at, next_review_date')
    .order('identified_at', { ascending: false })
    .limit(100);
  const rows: Row[] = (data as Row[] | null) ?? [];

  const open = rows.filter((r) => r.status === 'open').length;
  const treated = rows.filter((r) => r.status === 'treated').length;
  const high = rows.filter((r) => r.inherent_risk >= 15).length;

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/frameworks/iso" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          ISO overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <Gauge className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Risk register</h1>
            <p className="text-xs text-white/40">Clause 6.1, 8.2, 8.3. Each risk drives a treatment plan and maps to Annex A controls.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Record a risk</h2>
          <RiskForm />
        </section>

        <section>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <h2 className="text-sm font-semibold text-white">Risks ({rows.length})</h2>
            <span className="text-[11px] text-white/60">
              <span className="text-red-300">{open} open</span>, <span className="text-emerald-300">{treated} treated</span>, <span className="text-amber-300">{high} high severity</span>
            </span>
          </div>
          {rows.length === 0 ? (
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-white/50">No risks on file.</div>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-auto pr-2">
              {rows.map((r) => (
                <article key={r.id} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="font-mono text-xs text-white">{r.risk_ref}</span>
                    <StatusBadge status={r.status} />
                    <RiskScoreBadge score={r.inherent_risk} label="inherent" />
                    {r.residual_risk !== null ? <RiskScoreBadge score={r.residual_risk} label="residual" /> : null}
                    <span className="ml-auto text-[10px] text-white/40">{r.identified_at}</span>
                  </div>
                  <p className="mt-2 text-xs text-white/70 line-clamp-2">{r.threat}</p>
                  <div className="mt-1 text-[10px] text-white/50">Treatment: {r.treatment_option}{r.next_review_date ? `, review by ${r.next_review_date}` : ''}</div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: 'bg-red-500/15 border-red-400/30 text-red-200',
    treated: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200',
    accepted: 'bg-blue-500/15 border-blue-400/30 text-blue-200',
    closed: 'bg-slate-500/15 border-slate-400/30 text-slate-200',
    superseded: 'bg-slate-500/15 border-slate-400/30 text-slate-200',
  };
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${map[status] ?? 'bg-white/[0.05] border-white/[0.12] text-white/70'}`}>
      {status}
    </span>
  );
}

function RiskScoreBadge({ score, label }: { score: number; label: string }) {
  const tone = score >= 15 ? 'bg-red-500/20 border-red-400/40 text-red-200'
    : score >= 9 ? 'bg-amber-500/15 border-amber-400/30 text-amber-200'
    : 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${tone}`}>
      <span className="opacity-70">{label}</span>
      <span className="tabular-nums">{score}</span>
    </span>
  );
}
