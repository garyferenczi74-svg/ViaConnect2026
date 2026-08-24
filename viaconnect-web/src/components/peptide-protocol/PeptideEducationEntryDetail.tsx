import Link from 'next/link';
import { ArrowLeft, FlaskConical, Info } from 'lucide-react';
import {
  displayEducationField,
  type EducationEntry,
} from '@/lib/peptides/educationEntries';

function Field({
  label,
  value,
  testId,
}: {
  label: string;
  value: string | null;
  testId: string;
}) {
  return (
    <section className="space-y-2" data-testid={testId}>
      <h3 className="text-sm font-semibold text-white">{label}</h3>
      <p className="text-sm leading-relaxed text-white/65">
        {displayEducationField(value)}
      </p>
    </section>
  );
}

export function PeptideEducationEntryDetail({ entry }: { entry: EducationEntry }) {
  const pmidText = entry.pmids.length > 0 ? entry.pmids.join(', ') : null;

  return (
    <article
      data-testid={`peptide-education-entry-${entry.entryKey}`}
      className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-4 sm:p-5 space-y-4"
    >
      <Link
        href="/peptide-protocol/browse"
        className="inline-flex min-h-[44px] items-center gap-2 text-xs text-[#2DA5A0] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        Back to search
      </Link>

      <header className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(45,165,160,0.30)] bg-gradient-to-br from-[#1A2744] to-[#2DA5A0]">
          <FlaskConical className="h-[18px] w-[18px] text-white" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <h2 className="text-lg font-semibold text-white sm:text-xl">{entry.title}</h2>
            <span className="shrink-0 self-start rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
              {entry.evidenceGrade}
            </span>
          </div>
          {!entry.isPeptide ? (
            <span className="mt-2 inline-flex rounded-full border border-[rgba(183,94,24,0.35)] bg-[rgba(183,94,24,0.12)] px-2 py-0.5 text-[10px] text-[#B75E18]">
              Not a peptide
            </span>
          ) : null}
        </div>
      </header>

      <p className="rounded-xl border border-[rgba(183,94,24,0.20)] bg-[rgba(183,94,24,0.08)] px-3 py-2 text-[11px] leading-relaxed text-white/65">
        Educational reference only. No retail peptide sales, dosing, reconstitution
        how-to, or sourcing.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Used for" value={entry.mechanism} testId="entry-mechanism" />
        <Field label="Safety" value={entry.safetyContext} testId="entry-safety" />
        <Field
          label="Regulatory"
          value={entry.regulatoryStatus}
          testId="entry-regulatory"
        />
        <Field label="PMIDs" value={pmidText} testId="entry-pmids" />
      </div>

      <Field label="Provenance" value={entry.provenanceText} testId="entry-provenance" />

      <div className="flex items-start gap-2 text-[10px] text-white/40">
        <Info className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.5} />
        <p>
          Fields come from the live education row. Missing values stay Not available.
        </p>
      </div>
    </article>
  );
}
