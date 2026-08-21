import { PeptideProtocolHeroShell } from '@/components/peptide-protocol/PeptideProtocolHeroShell';
import { PeptideEducationTabs } from '@/components/peptide-protocol/converter/PeptideEducationTabs';
import { PeptideSuggestionsClient } from '@/components/peptide-protocol/PeptideSuggestionsClient';

export const dynamic = 'force-dynamic';

/** Prompt 226e: thin destination for Hannah suggestions (component unchanged). */
export default function PeptideSuggestionsPage() {
  return (
    <PeptideProtocolHeroShell>
      <PeptideEducationTabs />
      <PeptideSuggestionsClient />
    </PeptideProtocolHeroShell>
  );
}
