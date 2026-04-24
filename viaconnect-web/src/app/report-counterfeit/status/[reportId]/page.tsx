// Prompt #124 P5: Consumer-facing status page for a submitted report.
//
// Returns only the public-safe status phase + submitted_at timestamp. Does
// not expose determination internals (no Marshall verdicts, no evaluation
// IDs, no cited references). RLS on consumer_counterfeit_reports already
// allows the submitter OR any compliance_reader to SELECT their own rows;
// for anonymous submissions we rely on the report_id being the unguessable
// secret.

import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { ShieldCheck, ShieldAlert, CircleDashed, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  params: { reportId: string };
}

interface ReportRow {
  report_id: string;
  status: string;
  submitted_at: string;
  consumer_notified_at: string | null;
  determination_summary: string | null;
}

export default async function ReportStatusPage({ params }: Props) {
  // Use the admin client intentionally: the report_id is the shared
  // secret that authorizes this lookup for anonymous consumers.
  const sb = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sbAny = sb as any;
  const { data, error } = await sbAny
    .from('consumer_counterfeit_reports')
    .select('report_id, status, submitted_at, consumer_notified_at, determination_summary')
    .eq('report_id', params.reportId)
    .maybeSingle();

  const report = (data as ReportRow | null) ?? null;

  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-12 md:py-20 space-y-6">
        <h1 className="text-xl md:text-2xl font-bold">Report status</h1>
        <div className="rounded-lg border border-white/[0.12] bg-white/[0.03] p-4 space-y-3">
          <div>
            <div className="text-xs text-white/50">Report ID</div>
            <div className="font-mono text-base text-white">{params.reportId}</div>
          </div>
          {error || !report ? (
            <div className="text-sm text-amber-200">
              We could not find a report with that ID. Double-check the ID from your confirmation page.
            </div>
          ) : (
            <>
              <div>
                <div className="text-xs text-white/50">Submitted</div>
                <div className="text-sm text-white">{new Date(report.submitted_at).toISOString().slice(0, 10)}</div>
              </div>
              <div className="flex items-start gap-2">
                <StatusIcon status={report.status} />
                <div>
                  <div className="text-sm font-semibold text-white">{publicStatusLabel(report.status)}</div>
                  <p className="text-xs text-white/60 mt-0.5 leading-relaxed">
                    {publicStatusDescription(report.status)}
                  </p>
                </div>
              </div>
              {report.determination_summary ? (
                <div className="rounded-md border border-white/[0.08] bg-white/[0.02] p-3 text-sm text-white/80">
                  {report.determination_summary}
                </div>
              ) : null}
            </>
          )}
        </div>

        <Link
          href="/report-counterfeit"
          className="inline-flex items-center gap-2 rounded-md border border-white/20 hover:bg-white/[0.04] transition px-3 py-2 text-sm text-white/70"
        >
          Submit another report
        </Link>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'submitted':
    case 'evaluating':
    case 'in_review':
      return <Clock className="w-5 h-5 text-amber-300 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />;
    case 'confirmed_counterfeit':
      return <ShieldAlert className="w-5 h-5 text-red-300 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />;
    case 'confirmed_authentic':
      return <ShieldCheck className="w-5 h-5 text-emerald-300 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />;
    default:
      return <CircleDashed className="w-5 h-5 text-white/60 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />;
  }
}

function publicStatusLabel(status: string): string {
  switch (status) {
    case 'submitted':            return 'Received';
    case 'evaluating':           return 'Under review';
    case 'in_review':            return 'Under review';
    case 'confirmed_counterfeit': return 'Investigation confirmed non, authentic product';
    case 'confirmed_authentic':  return 'Product appears authentic';
    case 'closed_other':         return 'Closed';
    default:                     return 'Pending';
  }
}

function publicStatusDescription(status: string): string {
  switch (status) {
    case 'submitted':
      return 'We have your report in the compliance queue and will begin review shortly.';
    case 'evaluating':
    case 'in_review':
      return 'A compliance specialist is comparing your submitted photos against FarmCeutica authentic packaging references.';
    case 'confirmed_counterfeit':
      return 'Our review found the product you reported is not an authentic FarmCeutica item. We will contact you about return or replacement options if you shared contact info.';
    case 'confirmed_authentic':
      return 'Our review indicates the product you reported is an authentic FarmCeutica item. If you have further concerns, please contact us.';
    case 'closed_other':
      return 'Your report has been closed. See any follow-up notes above.';
    default:
      return 'Status not yet assigned.';
  }
}
