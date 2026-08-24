import Link from 'next/link';
import {
  ArrowLeft,
  FlaskConical,
  Info,
  ShieldAlert,
} from 'lucide-react';
import type { ConsumerPeptideMonograph } from '@/lib/kb/peptides/types';
import { gradeToBadge } from '@/lib/kb/peptides/types';

const EVIDENCE_STYLE = {
  strong:
    'bg-[rgba(34,197,94,0.12)] text-[#22C55E] border-[rgba(34,197,94,0.30)]',
  moderate:
    'bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border-[rgba(245,158,11,0.30)]',
  emerging:
    'bg-[rgba(168,85,247,0.12)] text-[#A855F7] border-[rgba(168,85,247,0.30)]',
} as const;

function honestyLabel(value: number | string | null): string {
  if (value === null || value === '') return 'UNKNOWN';
  return String(value);
}

export function KbPeptideMonograph({ peptide }: { peptide: ConsumerPeptideMonograph }) {
  const badge = gradeToBadge(peptide.evidenceGrade);
  const showWada =
    peptide.wadaStatus !== 'unknown' && peptide.wadaStatus !== 'not_prohibited';
  const halfLife =
    peptide.halfLifeClass &&
    peptide.halfLifeClass !== 'unknown' &&
    peptide.halfLifeClass !== 'not_applicable'
      ? peptide.halfLifeClass.replace(/_/g, ' ')
      : null;
  const preparation =
    peptide.preparationClass &&
    peptide.preparationClass !== 'not_applicable' &&
    peptide.preparationClass !== 'unknown'
      ? peptide.preparationClass.replace(/_/g, ' ')
      : null;

  return (
    <article
      data-testid={`kb-peptide-monograph-${peptide.slug}`}
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
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white sm:text-xl">
                {peptide.displayName}
              </h2>
              <p className="text-[11px] text-white/45">{peptide.canonicalName}</p>
            </div>
            <span
              className={`shrink-0 self-start rounded-full border px-2 py-0.5 text-[10px] font-medium ${EVIDENCE_STYLE[badge]}`}
            >
              Grade {peptide.evidenceGrade}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#2DA5A0]">{peptide.category}</p>
        </div>
      </header>

      <p className="rounded-xl border border-[rgba(183,94,24,0.20)] bg-[rgba(183,94,24,0.08)] px-3 py-2 text-[11px] leading-relaxed text-white/65">
        Educational reference only. No retail peptide sales, dosing, reconstitution
        how-to, or sourcing. Share with your licensed practitioner for clinical context.
      </p>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-white">Mechanism</h3>
        <p className="text-sm leading-relaxed text-white/70">
          {peptide.mechanismSummary || 'Educational summary is not available yet.'}
        </p>
        {peptide.mechanismDetail ? (
          <p className="text-sm leading-relaxed text-white/60">{peptide.mechanismDetail}</p>
        ) : null}
      </section>

      {peptide.evidenceSummary ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-white">Evidence notes</h3>
          <p className="text-sm leading-relaxed text-white/65">{peptide.evidenceSummary}</p>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {!peptide.isPeptide ? (
          <span className="rounded-full border border-[rgba(183,94,24,0.35)] bg-[rgba(183,94,24,0.12)] px-2 py-0.5 text-[10px] text-[#B75E18]">
            Not a peptide
          </span>
        ) : null}
        {showWada ? (
          <span className="rounded-full border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.12)] px-2 py-0.5 text-[10px] text-[#F87171]">
            WADA: {peptide.wadaStatus.replace(/_/g, ' ')}
          </span>
        ) : null}
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
          {peptide.molecularClass.replace(/_/g, ' ')}
        </span>
        {preparation ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
            Preparation class: {preparation}
          </span>
        ) : null}
        {halfLife ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
            Half-life class (educational, not a schedule): {halfLife}
          </span>
        ) : null}
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
          Human data in sources we hold:{' '}
          {peptide.humanDataExists ? 'yes' : 'not established'}
        </span>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-white">Honesty layer</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <span className="rounded-xl border border-white/10 bg-[#1E3054]/40 px-3 py-2 text-[11px] text-white/60">
            Trials registered: {honestyLabel(peptide.honesty.trialsRegistered)}
          </span>
          <span className="rounded-xl border border-white/10 bg-[#1E3054]/40 px-3 py-2 text-[11px] text-white/60">
            Completed: {honestyLabel(peptide.honesty.trialsCompleted)}
          </span>
          <span className="rounded-xl border border-white/10 bg-[#1E3054]/40 px-3 py-2 text-[11px] text-white/60">
            Results posted: {honestyLabel(peptide.honesty.trialsWithResultsPosted)}
          </span>
          <span className="rounded-xl border border-white/10 bg-[#1E3054]/40 px-3 py-2 text-[11px] text-white/60">
            Human pubs: {honestyLabel(peptide.honesty.publicationsHuman)}
          </span>
        </div>
      </section>

      {peptide.provenanceDisclosure ? (
        <p className="text-[11px] leading-relaxed text-amber-100/80">
          {peptide.provenanceDisclosure}
        </p>
      ) : null}

      {peptide.misconceptionNotes ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-white">Common misconceptions</h3>
          <p className="text-sm leading-relaxed text-white/60">{peptide.misconceptionNotes}</p>
        </section>
      ) : null}

      <div className="flex items-start gap-2 text-[10px] text-white/40">
        <Info className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.5} />
        <p>
          Unverified sport-status and regulatory fields stay unknown and are not shown as
          cleared. This page does not convert syringe units or list catalog doses.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-[rgba(183,94,24,0.25)] bg-[rgba(183,94,24,0.10)] p-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#B75E18]" strokeWidth={1.5} />
        <p className="text-xs leading-relaxed text-white/70">
          For reconstitution and syringe concepts, open Protocol Literacy. The converter
          only uses numbers you already have from a licensed clinician.
        </p>
      </div>
    </article>
  );
}
