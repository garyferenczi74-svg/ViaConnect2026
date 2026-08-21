import { PeptideProtocolHeroShell } from '@/components/peptide-protocol/PeptideProtocolHeroShell';
import { PeptideEducationTabs } from '@/components/peptide-protocol/converter/PeptideEducationTabs';
import { ConcentrationConverterClient } from '@/components/peptide-protocol/converter/ConcentrationConverterClient';

export const dynamic = 'force-dynamic';

export default function PeptideConverterPage() {
  return (
    <PeptideProtocolHeroShell>
      <PeptideEducationTabs />
      <ConcentrationConverterClient />
    </PeptideProtocolHeroShell>
  );
}
