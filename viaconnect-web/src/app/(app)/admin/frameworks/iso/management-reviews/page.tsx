import Link from 'next/link';
import { ChevronLeft, Users2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import HipaaQuickForm, { type QuickFieldSpec } from '@/components/hipaa-admin/HipaaQuickForm';

export const dynamic = 'force-dynamic';

interface Row {
  id: string;
  review_date: string;
  attendees: string;
  inputs_summary: string;
  signed_off_at: string | null;
  storage_key: string | null;
}

const FIELDS: QuickFieldSpec[] = [
  { name: 'reviewDate', label: 'Review date', type: 'date', required: true },
  { name: 'attendees', label: 'Attendees', type: 'textarea', required: true, minLength: 5,
    placeholder: 'Names, roles; top management plus ISMS Manager' },
  { name: 'inputsSummary', label: 'Inputs summary', type: 'textarea', required: true, minLength: 20,
    placeholder: 'Risk status, audit results, nonconformities, performance data, opportunities for improvement' },
];

export default async function ManagementReviewsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('iso_management_reviews')
    .select('id, review_date, attendees, inputs_summary, signed_off_at, storage_key')
    .order('review_date', { ascending: false })
    .limit(50);
  const rows: Row[] = (data as Row[] | null) ?? [];
  const signed = rows.filter((r) => r.signed_off_at).length;

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/frameworks/iso" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          ISO overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <Users2 className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Management reviews</h1>
            <p className="text-xs text-white/40">Clause 9.3. Top management review of the ISMS at planned intervals.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Record a review</h2>
          <HipaaQuickForm apiPath="/api/iso/management-reviews" fields={FIELDS} submitLabel="Record review" />
        </section>

        <section>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <h2 className="text-sm font-semibold text-white">Recent reviews ({rows.length})</h2>
            <span className="text-[11px] text-white/60">{signed} signed off</span>
          </div>
          {rows.length === 0 ? (
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-white/50">No management reviews on file.</div>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <article key={r.id} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="font-mono text-xs text-white">{r.review_date}</span>
                    {r.signed_off_at ? (
                      <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border border-emerald-400/30 bg-emerald-500/15 text-emerald-200">signed off</span>
                    ) : (
                      <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border border-amber-400/30 bg-amber-500/15 text-amber-200">pending sign off</span>
                    )}
                    {r.storage_key ? <span className="text-[10px] text-white/40">minutes attached</span> : null}
                  </div>
                  <div className="mt-2 text-xs text-white/80 line-clamp-1"><span className="text-white/50">Attendees:</span> {r.attendees}</div>
                  <div className="mt-1 text-xs text-white/70 line-clamp-2"><span className="text-white/50">Inputs:</span> {r.inputs_summary}</div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
