'use client';

import { useState } from 'react';
import { FlaskConical, Info } from 'lucide-react';
import { PlasmaGauge } from '@/components/gauges/PlasmaGauge';
import { BentoTile } from '@/components/ui/BentoTile';
import {
  BIOLOGICAL_AGE_FRAMING_DRAFT,
  type BiologicalAgeResult,
} from '@/lib/body-tracker/biological-age';

interface BiologicalAgeHeroTileProps {
  result: BiologicalAgeResult | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

export function BiologicalAgeHeroTile({
  result,
  loading,
  error,
  onRetry,
  className,
}: BiologicalAgeHeroTileProps) {
  const [openContributors, setOpenContributors] = useState(false);
  const [openMethod, setOpenMethod] = useState(false);

  const estimated =
    result?.state === 'estimated'
    && result.biologicalAge !== null
    && result.biologicalAge > 0;
  const display = estimated ? result.biologicalAge : null;
  const confidence = estimated ? (result.confidencePct ?? 0) : 0;
  const chrono = result?.chronologicalAge ?? 0;
  const delta = estimated ? (result.deltaYears ?? 0) : 0;
  const insufficient = !estimated;

  const deltaLabel =
    insufficient || delta === 0
      ? 'Even with chronological age'
      : delta < 0
        ? `${Math.abs(delta)} years younger`
        : `${delta} years older`;

  return (
    <BentoTile
      className={`min-h-[280px] rounded-[20px] ${className ?? ''}`}
      contentClassName="gap-4"
      scrim={false}
      ariaLabel="Biological Age"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
            {BIOLOGICAL_AGE_FRAMING_DRAFT.title}
          </span>
          <span className="rounded-full border border-[#B75E18]/40 bg-[#B75E18]/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#F0A24E]">
            Draft
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpenMethod(true)}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white/50 hover:text-white"
          aria-label="How this is estimated"
        >
          <Info className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      {error ? (
        <div className="space-y-2">
          <p className="text-sm text-white/70">{error}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="min-h-[44px] rounded-lg border border-white/10 px-3 text-xs text-[#2DA5A0]"
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : loading && !result ? (
        <p className="text-sm text-white/50">Loading biological age...</p>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {display === null ? (
            <div
              className="flex h-[180px] w-[180px] flex-col items-center justify-center"
              aria-label="Biological Age UNKNOWN"
            >
              <span className="text-4xl font-bold text-white/40">--</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                UNKNOWN
              </span>
            </div>
          ) : (
            <PlasmaGauge
              metric="bioscore"
              variant="hero"
              size={180}
              value={Math.max(1, confidence)}
              max={100}
              displayValue={display}
              caption="YEARS"
              showUnit={false}
              ariaLabel={`Biological Age ${display} years`}
            />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-sm text-white/80">
              {insufficient
                ? BIOLOGICAL_AGE_FRAMING_DRAFT.insufficientPrompt
                : `Biological age ${display} versus your ${chrono}`}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/75">
                {deltaLabel}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/75">
                Confidence {confidence}%
              </span>
              {insufficient ? (
                <span className="rounded-full border border-[#B75E18]/30 bg-[#B75E18]/10 px-2.5 py-1 text-[11px] text-[#F0A24E]">
                  Developing
                </span>
              ) : null}
            </div>
            <p className="text-[11px] leading-relaxed text-white/45">
              {BIOLOGICAL_AGE_FRAMING_DRAFT.disclaimer}
            </p>
            <button
              type="button"
              onClick={() => setOpenContributors((v) => !v)}
              className="mt-1 self-start text-xs font-medium text-[#2DA5A0]"
            >
              {openContributors ? 'Hide contributors' : 'Score contributors'}
            </button>
            {openContributors && result ? (
              <ul className="mt-1 space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
                {result.contributors.map((c) => (
                  <li key={c.id} className="text-xs text-white/75">
                    <span className="font-medium text-white">{c.label}</span>
                    <span className="text-white/40"> · </span>
                    {c.detail}
                    {c.nextAction ? (
                      <span className="mt-0.5 block text-white/45">{c.nextAction}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      )}

      {openMethod ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={BIOLOGICAL_AGE_FRAMING_DRAFT.methodologyTitle}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => setOpenMethod(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#1A2744] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-white">
              {BIOLOGICAL_AGE_FRAMING_DRAFT.methodologyTitle}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-white/65">
              {BIOLOGICAL_AGE_FRAMING_DRAFT.methodologyIntro}
            </p>
            <ul className="mt-3 space-y-2 text-xs text-white/75">
              {(result?.inputsUsed?.length
                ? result.inputsUsed
                : ['No signals measured yet']
              ).map((label) => (
                <li key={label} className="rounded-lg border border-white/10 px-3 py-2">
                  {label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-[#F0A24E]">
              Framing DRAFT pending Marshall review.
            </p>
            <button
              type="button"
              className="mt-4 min-h-[44px] w-full rounded-xl bg-[#2DA5A0]/20 text-sm text-[#2DA5A0]"
              onClick={() => setOpenMethod(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </BentoTile>
  );
}
