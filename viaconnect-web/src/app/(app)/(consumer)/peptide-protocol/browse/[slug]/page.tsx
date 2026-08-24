import { notFound } from 'next/navigation';
import { PeptideProtocolHeroShell } from '@/components/peptide-protocol/PeptideProtocolHeroShell';
import { PeptideEducationTabs } from '@/components/peptide-protocol/converter/PeptideEducationTabs';
import { KbPeptideMonograph } from '@/components/peptide-protocol/KbPeptideMonograph';
import { loadConsumerPeptideBySlug } from '@/lib/kb/peptides/loadConsumerPeptides';
import { isSafePeptideSlug } from '@/lib/kb/peptides/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const peptide = isSafePeptideSlug(params.slug)
    ? await loadConsumerPeptideBySlug(params.slug)
    : null;
  if (!peptide) {
    return { title: 'Peptide education | ViaConnect' };
  }
  return {
    title: `${peptide.displayName} · Peptide Education`,
    description:
      peptide.mechanismSummary ||
      `Educational reference for ${peptide.displayName}. Not a product listing.`,
  };
}

export default async function PeptideMonographPage(props: PageProps) {
  const params = await props.params;
  const peptide = await loadConsumerPeptideBySlug(params.slug);
  if (!peptide) notFound();

  return (
    <PeptideProtocolHeroShell>
      <PeptideEducationTabs />
      <KbPeptideMonograph peptide={peptide} />
    </PeptideProtocolHeroShell>
  );
}
