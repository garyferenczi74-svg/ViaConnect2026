import { PeptideDisclaimerBanner } from '@/components/peptide-protocol/PeptideDisclaimerBanner';
import { PeptideSuggestionsClient } from '@/components/peptide-protocol/PeptideSuggestionsClient';
import { KbPeptideCatalogSection } from '@/components/peptide-protocol/KbPeptideCatalogSection';
import { PeptidePractitionerAccess } from '@/components/peptide-protocol/PeptidePractitionerAccess';
import { PeptideProtocolHeroShell } from '@/components/peptide-protocol/PeptideProtocolHeroShell';
import { PeptideEducationTabs } from '@/components/peptide-protocol/converter/PeptideEducationTabs';
import { loadConsumerPeptideCatalog } from '@/lib/kb/peptides/loadConsumerPeptides';

export const dynamic = 'force-dynamic';

export default async function PeptideProtocolRoute() {
  const catalog = await loadConsumerPeptideCatalog();

  return (
    <PeptideProtocolHeroShell>
      <PeptideEducationTabs />
      <PeptideDisclaimerBanner />
      {/* Prompt 226d Wave B: evidence-matched suggestions (replaces Ultrathink stack UI). */}
      <PeptideSuggestionsClient />
      <KbPeptideCatalogSection
        categories={catalog.categories}
        total={catalog.total}
        marshallPending={catalog.marshallPending}
      />
      <PeptidePractitionerAccess />

      <div
        data-testid="discuss-with-practitioner-pathway"
        className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/50 p-4"
      >
        <p className="text-sm font-medium text-white">Discuss with your practitioner</p>
        <p className="text-xs text-white/50 mt-1 leading-relaxed">
          Educational peptide material only. Clinical context, monitoring considerations, and
          contraindication classes are available to authenticated practitioners. Ask your
          qualified practitioner to review frameworks with you. No dosing, reconstitution, or
          sourcing guidance is provided on ViaConnect.
        </p>
      </div>
    </PeptideProtocolHeroShell>
  );
}
