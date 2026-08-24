import { PeptideProtocolHeroShell } from '@/components/peptide-protocol/PeptideProtocolHeroShell';
import { PeptideEducationTabs } from '@/components/peptide-protocol/converter/PeptideEducationTabs';
import { KbPeptideCatalogSection } from '@/components/peptide-protocol/KbPeptideCatalogSection';
import { loadConsumerEducationEntries } from '@/lib/peptides/educationEntries';

export const dynamic = 'force-dynamic';

export default async function PeptideBrowsePage() {
  const catalog = await loadConsumerEducationEntries();

  return (
    <PeptideProtocolHeroShell>
      <PeptideEducationTabs />
      <KbPeptideCatalogSection entries={catalog.entries} total={catalog.total} />
    </PeptideProtocolHeroShell>
  );
}
