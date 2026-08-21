import { PeptideProtocolHeroShell } from '@/components/peptide-protocol/PeptideProtocolHeroShell';
import { PeptideEducationTabs } from '@/components/peptide-protocol/converter/PeptideEducationTabs';
import { ProtocolLiteracyClient } from '@/components/peptide-protocol/literacy/ProtocolLiteracyClient';

export const dynamic = 'force-dynamic';

export default function ProtocolLiteracyPage() {
  return (
    <PeptideProtocolHeroShell>
      <PeptideEducationTabs />
      <ProtocolLiteracyClient />
    </PeptideProtocolHeroShell>
  );
}
