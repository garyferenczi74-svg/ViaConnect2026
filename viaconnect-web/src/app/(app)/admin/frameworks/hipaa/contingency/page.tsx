import Link from 'next/link';
import { ChevronLeft, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import HipaaQuickForm, { type QuickFieldSpec } from '@/components/hipaa-admin/HipaaQuickForm';

export const dynamic = 'force-dynamic';

interface Row {
  id: string;
  test_date: string;
  test_kind: string;
  scope: string;
  outcome_summary: string;
  recorded_at: string;
}

const FIELDS: QuickFieldSpec[] = [
  { name: 'testDate', label: 'Test date', type: 'date', required: true },
  { name: 'testKind', label: 'Test kind', type: 'select', required: true, options: [
    { value: 'data_backup_test', label: 'Data backup test' },
    { value: 'disaster_recovery_test', label: 'Disaster recovery test' },
    { value: 'emergency_mode_test', label: 'Emergency mode operation test' },
    { value: 'full_tabletop_exercise', label: 'Full tabletop exercise' },
    { value: 'live_drill', label: 'Live drill' },
  ]},
  { name: 'scope', label: 'Scope', type: 'textarea', required: true, minLength: 10,
    placeholder: 'Systems, data, locations covered by this test' },
  { name: 'outcomeSummary', label: 'Outcome summary', type: 'textarea', required: true, minLength: 20,
    placeholder: 'Results, gaps identified, success criteria met' },
];

export default async function ContingencyPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('hipaa_contingency_plan_tests')
    .select('id, test_date, test_kind, scope, outcome_summary, recorded_at')
    .order('test_date', { ascending: false })
    .limit(50);
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
            <Shield className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Contingency plan tests</h1>
            <p className="text-xs text-white/40">45 CFR 164.308(a)(7)(ii)(D). Addressable. Testing and revision of the contingency plan.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Record a test</h2>
          <HipaaQuickForm apiPath="/api/hipaa/contingency-tests" fields={FIELDS} submitLabel="Record test" />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-white mb-3">Recent tests ({rows.length})</h2>
          {rows.length === 0 ? (
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-white/50">No contingency tests on file.</div>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <article key={r.id} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border border-white/[0.12] bg-white/[0.05] text-white/80">
                      {r.test_kind.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-white/50">{r.test_date}</span>
                  </div>
                  <div className="mt-2 text-xs text-white/80"><span className="text-white/50">Scope:</span> {r.scope}</div>
                  <div className="mt-1 text-xs text-white/80"><span className="text-white/50">Outcome:</span> {r.outcome_summary}</div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
