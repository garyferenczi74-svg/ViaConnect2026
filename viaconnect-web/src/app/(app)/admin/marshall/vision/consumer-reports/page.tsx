import Link from 'next/link';
import { ChevronLeft, MessageSquareWarning } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface ReportRow {
  id: string;
  report_id: string;
  purchase_location: string | null;
  status: string;
  phi_redaction_applied: boolean;
  submitted_at: string;
  image_storage_keys: string[];
  concern_description: string;
}

export default async function ConsumerReportsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('consumer_counterfeit_reports')
    .select('id, report_id, purchase_location, status, phi_redaction_applied, submitted_at, image_storage_keys, concern_description')
    .order('submitted_at', { ascending: false })
    .limit(200);
  const rows: ReportRow[] = (data as ReportRow[] | null) ?? [];

  const stats = {
    submitted: rows.filter((r) => r.status === 'submitted').length,
    inReview:  rows.filter((r) => r.status === 'in_review').length,
    confirmed: rows.filter((r) => r.status === 'confirmed_counterfeit').length,
    closed:    rows.filter((r) => r.status === 'confirmed_authentic' || r.status === 'closed_other').length,
  };

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/marshall/vision" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          Vision overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <MessageSquareWarning className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Consumer reports</h1>
            <p className="text-xs text-white/40">Suspect-product reports from /report-counterfeit, with PHI pre-filter applied.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Submitted" value={stats.submitted} />
          <Stat label="In review" value={stats.inReview} />
          <Stat label="Confirmed counterfeit" value={stats.confirmed} />
          <Stat label="Closed" value={stats.closed} />
        </div>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-white/50">
            No consumer reports yet. The /report-counterfeit page opens in Phase D once the privacy notice is approved.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <article key={r.id} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3">
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="font-mono text-xs text-white">{r.report_id}</span>
                  <StatusBadge status={r.status} />
                  {r.phi_redaction_applied ? (
                    <span className="text-[11px] rounded-md border border-purple-400/30 bg-purple-500/15 text-purple-200 px-1.5 py-0.5">
                      PHI redacted
                    </span>
                  ) : null}
                  <span className="ml-auto text-[10px] text-white/40">
                    {new Date(r.submitted_at).toISOString().slice(0, 16).replace('T', ' ')}
                  </span>
                </div>
                <p className="text-sm text-white/80 mt-2 line-clamp-3">{r.concern_description}</p>
                <div className="mt-2 text-[11px] text-white/50 flex flex-wrap gap-3">
                  {r.purchase_location ? <span>Purchased at: {r.purchase_location}</span> : null}
                  <span>{r.image_storage_keys.length} image{r.image_storage_keys.length === 1 ? '' : 's'}</span>
                </div>
              </article>
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    submitted: 'bg-amber-500/15 border-amber-400/30 text-amber-200',
    evaluating: 'bg-blue-500/15 border-blue-400/30 text-blue-200',
    in_review: 'bg-blue-500/15 border-blue-400/30 text-blue-200',
    confirmed_counterfeit: 'bg-red-500/15 border-red-400/30 text-red-200',
    confirmed_authentic: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200',
    closed_other: 'bg-slate-500/15 border-slate-400/30 text-slate-200',
  };
  const cls = map[status] ?? 'bg-white/[0.05] border-white/[0.12] text-white/70';
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
