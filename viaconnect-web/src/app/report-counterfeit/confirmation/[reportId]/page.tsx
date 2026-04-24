// Prompt #124 P5: confirmation page after a successful consumer submission.

import Link from 'next/link';
import { CheckCircle2, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  params: { reportId: string };
}

export default function ReportConfirmationPage({ params }: Props) {
  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-12 md:py-20 space-y-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" strokeWidth={1.5} aria-hidden />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Report received</h1>
            <p className="text-sm text-white/70 mt-1">
              Thank you for taking the time to report this. Your submission is now in our compliance queue.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-white/[0.12] bg-white/[0.03] p-4 space-y-2">
          <div className="text-xs text-white/50">Your report ID</div>
          <div className="font-mono text-lg text-white">{params.reportId}</div>
          <p className="text-xs text-white/50">
            Save this ID to check status at any time.
          </p>
        </div>

        <div className="flex items-start gap-2 text-sm text-white/70">
          <Clock className="w-4 h-4 text-white/60 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
          <p>
            A compliance specialist will review your report. If we confirm the product is non-authentic, we will contact you about return or replacement options. Typical review timeline: 10 business days.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/report-counterfeit/status/${encodeURIComponent(params.reportId)}`}
            className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/[0.04] hover:bg-white/[0.08] transition px-3 py-2 text-sm text-white"
          >
            Check status
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md border border-white/20 hover:bg-white/[0.04] transition px-3 py-2 text-sm text-white/70"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}
