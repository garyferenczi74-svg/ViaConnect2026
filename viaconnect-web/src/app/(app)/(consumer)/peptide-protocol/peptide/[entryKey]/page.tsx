import { notFound } from 'next/navigation';
import { PeptideProtocolHeroShell } from '@/components/peptide-protocol/PeptideProtocolHeroShell';
import { PeptideEducationTabs } from '@/components/peptide-protocol/converter/PeptideEducationTabs';
import { PeptideEducationEntryDetail } from '@/components/peptide-protocol/PeptideEducationEntryDetail';
import {
  isSafeEntryKey,
  loadConsumerEducationEntryByKey,
} from '@/lib/peptides/educationEntries';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ entryKey: string }>;
}

function readEntryKey(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const entryKey = readEntryKey(params.entryKey);
  const entry = isSafeEntryKey(entryKey)
    ? await loadConsumerEducationEntryByKey(entryKey)
    : null;
  if (!entry) {
    return { title: 'Peptide education | ViaConnect' };
  }
  return {
    title: `${entry.title} · Peptide Education`,
    description: `Educational reference for ${entry.title}. Not a product listing.`,
  };
}

export default async function PeptideEducationEntryPage(props: PageProps) {
  const params = await props.params;
  const entry = await loadConsumerEducationEntryByKey(readEntryKey(params.entryKey));
  if (!entry) notFound();

  return (
    <PeptideProtocolHeroShell>
      <PeptideEducationTabs />
      <PeptideEducationEntryDetail entry={entry} />
    </PeptideProtocolHeroShell>
  );
}
