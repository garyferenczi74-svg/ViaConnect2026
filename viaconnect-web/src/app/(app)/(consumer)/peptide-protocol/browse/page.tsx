import { PeptideProtocolHeroShell } from '@/components/peptide-protocol/PeptideProtocolHeroShell';
import { PeptideEducationTabs } from '@/components/peptide-protocol/converter/PeptideEducationTabs';
import { KbPeptideCatalogSection } from '@/components/peptide-protocol/KbPeptideCatalogSection';
import { loadConsumerPeptideCatalog } from '@/lib/kb/peptides/loadConsumerPeptides';

export const dynamic = 'force-dynamic';

/** Prompt 226e: thin destination for Search Peptides browse (catalog component unchanged). */
export default async function PeptideBrowsePage() {
  const catalog = await loadConsumerPeptideCatalog();

  return (
    <PeptideProtocolHeroShell>
      <PeptideEducationTabs />
      <KbPeptideCatalogSection
        categories={catalog.categories}
        total={catalog.total}
        marshallPending={catalog.marshallPending}
      />
    </PeptideProtocolHeroShell>
  );
}
