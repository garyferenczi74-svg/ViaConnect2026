import { PeptideProtocolHeroShell } from '@/components/peptide-protocol/PeptideProtocolHeroShell';
import { PeptideEducationTabs } from '@/components/peptide-protocol/converter/PeptideEducationTabs';
import { PeptideSuggestionsClient } from '@/components/peptide-protocol/PeptideSuggestionsClient';
import { HannahAIGuidedByChip } from '@/components/hannah/HannahAIGuidedByChip';
import { HannahAIChatCard } from '@/components/hannah/HannahAIChatCard';

export const dynamic = 'force-dynamic';

/** Prompt 226e: thin destination for Hannah suggestions (component unchanged). */
export default function PeptideSuggestionsPage() {
  return (
    <PeptideProtocolHeroShell>
      <div className="flex justify-end">
        <HannahAIGuidedByChip />
      </div>
      <PeptideEducationTabs />
      <HannahAIChatCard />
      <PeptideSuggestionsClient />
    </PeptideProtocolHeroShell>
  );
}
