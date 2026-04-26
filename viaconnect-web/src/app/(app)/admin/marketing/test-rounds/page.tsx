'use client';

// Prompt #138a Phase 5a: stub for the test-rounds dashboard. The full
// dashboard (TestRoundDashboard, ImpressionConversionChart,
// WinnerDeclarationPanel) ships in Phase 5b. Linked from the marketing
// landing so admins reach a real page rather than a 404.

import Link from 'next/link';
import { ArrowLeft, FlaskConical } from 'lucide-react';

export default function TestRoundsStubPage() {
  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        <Link
          href="/admin/marketing"
          className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Marketing
        </Link>
        <header>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
            Test rounds
          </h1>
        </header>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <p className="text-sm text-white/70">
            The full test-rounds dashboard (round list, pause/resume controls,
            impression/conversion charts, winner declaration) ships in the next
            phase. The HTTP endpoints under <span className="font-mono text-xs">/api/marketing/test-rounds</span> are
            already live and can be exercised manually for now.
          </p>
        </div>
      </div>
    </div>
  );
}
