import { Suspense } from 'react';
import { PeptideProtocolHeroShell } from '@/components/peptide-protocol/PeptideProtocolHeroShell';
import { PeptideEducationTabs } from '@/components/peptide-protocol/converter/PeptideEducationTabs';
import { ConcentrationConverterClient } from '@/components/peptide-protocol/converter/ConcentrationConverterClient';

export const dynamic = 'force-dynamic';

export default function PeptideConverterPage() {
  return (
    <PeptideProtocolHeroShell>
      <PeptideEducationTabs />
      <Suspense
        fallback={
          <div className="rounded-2xl border border-white/10 bg-[#1E3054]/60 p-6 text-sm text-white/50">
            Loading converter...
          </div>
        }
      >
        <ConcentrationConverterClient />
      </Suspense>
    </PeptideProtocolHeroShell>
  );
}
