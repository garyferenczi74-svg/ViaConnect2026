// Prompt #122 P8: Public auditor portal landing.

import { ShieldCheck } from 'lucide-react';
import AuditorLoginForm from '@/components/auditor/AuditorLoginForm';

export const dynamic = 'force-dynamic';

export default function AuditorLandingPage() {
  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      <div className="max-w-lg mx-auto px-4 md:px-6 py-12 md:py-20 space-y-8">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
            ViaConnect SOC 2 Evidence Portal
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Auditor sign, in</h1>
          <p className="text-sm md:text-base text-white/70 leading-relaxed">
            Enter the email address tied to your engagement and the firm name from your engagement letter. If your access grant is still active, we will email you a one, time secure link.
          </p>
        </header>
        <AuditorLoginForm />
      </div>
    </div>
  );
}
