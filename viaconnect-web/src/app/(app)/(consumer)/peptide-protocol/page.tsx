import { PeptideDisclaimerBanner } from '@/components/peptide-protocol/PeptideDisclaimerBanner';
import { PeptideEducationBento } from '@/components/peptide-protocol/PeptideEducationBento';
import { PeptideProtocolHeroShell } from '@/components/peptide-protocol/PeptideProtocolHeroShell';
import { PeptideEducationTabs } from '@/components/peptide-protocol/converter/PeptideEducationTabs';
import { loadConsumerEducationEntries } from '@/lib/peptides/educationEntries';

export const dynamic = 'force-dynamic';

/**
 * Prompt 226e: Peptide Education index (bento hub).
 * Destination pages are linked, not embedded.
 */
export default async function PeptideProtocolRoute() {
  const catalog = await loadConsumerEducationEntries();
  const countsOk = catalog.ok && catalog.total > 0;

  return (
    <PeptideProtocolHeroShell>
      <PeptideEducationTabs />
      <PeptideDisclaimerBanner />
      <PeptideEducationBento
        entryCount={countsOk ? catalog.total : 0}
        countsOk={countsOk}
      />
    </PeptideProtocolHeroShell>
  );
}
