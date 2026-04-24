import Link from 'next/link';
import { ChevronLeft, Siren } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import BreachFourFactorForm from '@/components/hipaa-admin/BreachFourFactorForm';

export const dynamic = 'force-dynamic';

interface BreachRow {
  id: string;
  incident_id: string;
  assessment_date: string;
  determination: string;
  notification_required: boolean;
  individuals_affected_count: number | null;
  notification_sent_at: string | null;
  ocr_notification_sent_at: string | null;
  created_at: string;
}

interface IncidentRow { id: string; incident_id: string; title: string }

export default async function BreachesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const [breachRes, incidentRes] = await Promise.all([
    supabase
      .from('hipaa_breach_determinations')
      .select('id, incident_id, assessment_date, determination, notification_required, individuals_affected_count, notification_sent_at, ocr_notification_sent_at, created_at')
      .order('assessment_date', { ascending: false })
      .limit(100),
    supabase
      .from('compliance_incidents')
      .select('id, incident_id, title')
      .order('opened_at', { ascending: false })
      .limit(100),
  ]);
  const breaches: BreachRow[] = (breachRes.data as BreachRow[] | null) ?? [];
  const incidents: IncidentRow[] = (incidentRes.data as IncidentRow[] | null) ?? [];

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/frameworks/hipaa" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          HIPAA overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <Siren className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Breach determinations</h1>
            <p className="text-xs text-white/40">Four factor assessments per 45 CFR 164.402. A confirmed determination triggers legal counsel notification within 24 hours.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white mb-3">New determination</h2>
          <BreachFourFactorForm incidents={incidents} />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-white mb-3">Recorded determinations ({breaches.length})</h2>
          {breaches.length === 0 ? (
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-white/50">
              No breach determinations on file yet.
            </div>
          ) : (
            <div className="space-y-2">
              {breaches.map((b) => (
                <article key={b.id} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <DeterminationBadge determination={b.determination} />
                    <span className="text-[11px] text-white/40">{b.assessment_date}</span>
                    {b.notification_required ? (
                      <span className="inline-flex items-center gap-1 text-[11px] rounded-md border border-red-400/40 bg-red-500/15 text-red-200 px-1.5 py-0.5">
                        <Siren className="w-3 h-3" strokeWidth={1.5} aria-hidden />
                        notification required
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-white/60">
                    <span>Incident: <span className="font-mono">{b.incident_id.slice(0, 10)}…</span></span>
                    {b.individuals_affected_count !== null ? (
                      <span>Individuals: <span className="tabular-nums text-white">{b.individuals_affected_count}</span></span>
                    ) : null}
                    {b.notification_sent_at ? <span className="text-emerald-300">notified {b.notification_sent_at.slice(0, 10)}</span> : null}
                    {b.ocr_notification_sent_at ? <span className="text-emerald-300">OCR notified {b.ocr_notification_sent_at.slice(0, 10)}</span> : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DeterminationBadge({ determination }: { determination: string }) {
  const map: Record<string, string> = {
    not_applicable: 'bg-slate-500/15 border-slate-400/30 text-slate-200',
    low_probability_of_compromise: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200',
    breach_confirmed: 'bg-red-500/20 border-red-400/40 text-red-200',
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border ${map[determination] ?? 'bg-white/[0.05] border-white/[0.12] text-white/70'}`}>
      {determination.replace(/_/g, ' ')}
    </span>
  );
}
