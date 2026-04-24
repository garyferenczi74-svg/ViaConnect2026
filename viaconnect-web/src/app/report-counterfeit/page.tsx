// Prompt #124 P5: Public /report-counterfeit page.
//
// Anonymous-friendly intake. Posts multipart form-data to
// /api/marshall/vision/consumer-reports. Honeypot field traps basic bots.
//
// Privacy notice surfaced in plain language per spec §15.2 + §15.5. PHI
// pre-filter applied server-side; the form copy mentions it up front so the
// consumer isn't surprised by blurred images in any follow-up correspondence.

import ReportCounterfeitForm from '@/components/consumer-counterfeit/ReportCounterfeitForm';
import PrivacyNotice from '@/components/consumer-counterfeit/PrivacyNotice';
import { ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function ReportCounterfeitPage() {
  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-14 space-y-8">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
            FarmCeutica Compliance
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Report a suspected counterfeit product</h1>
          <p className="text-sm md:text-base text-white/70 leading-relaxed">
            If you bought something that looked like a FarmCeutica product and you are not sure it is authentic, tell us here. A compliance specialist reviews every report. You will hear back within ten business days if you share contact info.
          </p>
        </header>

        <PrivacyNotice />

        <ReportCounterfeitForm />
      </div>
    </div>
  );
}
