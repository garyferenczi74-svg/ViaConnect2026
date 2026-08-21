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
          {CONVERTER_COPY.nonAllowlistedHeading}
        </h2>
        <p className="text-sm text-white/65 leading-relaxed">
          The converter only includes peptide drugs with verified FDA or Health Canada
          approval for injectable use, and an explicit Marshall eligibility flag. Research
          chemical and investigational compounds are not offered for conversion because there
          is no established dose for the platform to convert.
        </p>
        <p className="text-sm text-white/55 leading-relaxed">
          You can still open the educational monograph, review honesty-layer evidence counts,
          and discuss concentration principles with a licensed clinician. There is no
          free-text fallback that converts an arbitrary compound name.
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
