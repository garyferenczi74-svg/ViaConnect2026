import Link from 'next/link';
import { PeptideProtocolHeroShell } from '@/components/peptide-protocol/PeptideProtocolHeroShell';
import { PeptideEducationTabs } from '@/components/peptide-protocol/converter/PeptideEducationTabs';
import { CONVERTER_COPY } from '@/lib/peptides/converterMath';

export const dynamic = 'force-dynamic';

export default function ConverterNotListedPage() {
  return (
    <PeptideProtocolHeroShell>
      <PeptideEducationTabs />
      <div
        className="rounded-2xl border border-white/10 bg-[#1E3054]/70 p-5 md:p-6 space-y-3"
        data-testid="converter-not-listed"
      >
        <h2 className="text-base font-semibold text-white">
          About the peptide catalog
        </h2>
        <p className="text-sm text-white/65 leading-relaxed">
          The converter and My Protocols lists include Collection 14 educational and restricted
          monographs. You enter any dose from your licensed clinician. ViaConnect converts
          units only and never recommends a dose.
        </p>
        <p className="text-sm text-white/55 leading-relaxed">
          Adverse-reference exclusions (for example Dermorphin) stay out of the picker. Open
          monographs for education and honesty-layer evidence counts.
        </p>
        <div className="flex flex-wrap gap-3 text-xs">
          <Link
            href="/peptide-protocol"
            className="rounded-xl px-3 py-2 border border-white/15 text-white/80"
          >
            Browse monographs
          </Link>
          <Link
            href="/peptide-protocol/converter"
            className="rounded-xl px-3 py-2 border border-[#2DA5A0]/40 text-[#2DA5A0]"
          >
            Back to converter
          </Link>
        </div>
      </div>
    </PeptideProtocolHeroShell>
  );
}
