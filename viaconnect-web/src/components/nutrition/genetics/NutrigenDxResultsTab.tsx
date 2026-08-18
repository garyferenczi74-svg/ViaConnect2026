'use client';

// NutrigenDX Results tab: wires GeneX360 NutrigenDX (user_variants panel_key=
// nutrition) + nutrition_genetic_findings into the Prompt 188 result contract.
// PENDING / EMPTY / RESULTS states. Educational only; never fabricates genotypes.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Dna, FlaskConical, Loader2, Upload } from 'lucide-react';
import { useSetNutritionTab } from '@/components/nutrition/NutritionTabs';
import { relatedFindingsForGene } from '@/lib/nutrition/genetics/nutrigenDxCrossRef';
import type { NutrigenDxResultSet } from '@/lib/nutrition/genetics/types';

export interface NutrigenDxResultsTabProps {
  readonly nutrigenDxPending: boolean;
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | {
      kind: 'ready';
      resultSet: NutrigenDxResultSet;
      summary: {
        marker_count: number;
        marker_total: number;
        finding_count: number;
        has_any_data: boolean;
        missing_genes: string[];
      };
      genetics_href: string;
    }
  | { kind: 'error'; message: string };

export function NutrigenDxResultsTab({ nutrigenDxPending }: NutrigenDxResultsTabProps) {
  const setTab = useSetNutritionTab();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });

  const load = useCallback(async () => {
    setPhase({ kind: 'loading' });
    try {
      const res = await fetch('/api/nutrition/genetics/nutrigendx');
      if (res.status === 401) {
        setPhase({ kind: 'error', message: 'Sign in to view NutrigenDX results.' });
        return;
      }
      const data = (await res.json()) as {
        resultSet?: NutrigenDxResultSet;
        summary?: Phase extends { kind: 'ready' } ? never : {
          marker_count: number;
          marker_total: number;
          finding_count: number;
          has_any_data: boolean;
          missing_genes: string[];
        };
        genetics_href?: string;
        error?: string;
      };
      if (!data.resultSet || !data.summary) {
        setPhase({ kind: 'error', message: data.error ?? 'We could not load NutrigenDX results.' });
        return;
      }
      if (!data.summary.has_any_data) {
        setPhase({ kind: 'empty' });
        return;
      }
      setPhase({
        kind: 'ready',
        resultSet: data.resultSet,
        summary: data.summary,
        genetics_href: data.genetics_href ?? '/genetics',
      });
    } catch {
      setPhase({ kind: 'error', message: 'We could not load NutrigenDX results.' });
    }
  }, []);

  useEffect(() => {
    if (nutrigenDxPending) return;
    void load();
  }, [nutrigenDxPending, load]);

  if (nutrigenDxPending) {
    return (
      <div className="rounded-2xl border border-[#2DA5A0]/30 bg-[#1E3054] p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10"
          >
            <FlaskConical className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold leading-tight text-white md:text-base">
              Your NutrigenDX results are processing
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-white/[0.62]">
              Your sample is with the lab. Your results will appear here as soon as they are
              ready.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (phase.kind === 'loading') {
    return (
      <div className="flex min-h-[120px] items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-[#1E3054] p-5 text-white/70">
        <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
        Loading NutrigenDX results
      </div>
    );
  }

  if (phase.kind === 'error') {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054] p-5 md:p-6">
        <p className="text-sm text-white/70">{phase.message}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 inline-flex min-h-[44px] items-center rounded-xl border border-white/20 px-4 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (phase.kind === 'empty') {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054] p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]"
          >
            <Dna className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold leading-tight text-white md:text-base">
              No NutrigenDX results yet
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-white/[0.62]">
              Your NutrigenDX results will appear here once your GeneX360 nutrition panel
              variants are available.
            </p>

            <button
              type="button"
              onClick={() => setTab('upload')}
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/[0.18] px-4 py-2.5 text-[13px] font-semibold text-white backdrop-blur-md transition-all duration-200 hover:border-[#2DA5A0]/60 hover:bg-[#2DA5A0]/[0.28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
            >
              <Upload aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
              <span>Have results from another company? Upload them here.</span>
            </button>

            <div className="mt-4 flex flex-col gap-2 text-[12px] sm:flex-row sm:items-center sm:gap-4">
              <Link
                href="/genetics"
                className="text-white/55 underline-offset-2 transition-colors hover:text-white hover:underline"
              >
                See NutrigenDX panels
              </Link>
              <Link
                href="/nutrition/guide"
                className="text-white/55 underline-offset-2 transition-colors hover:text-white hover:underline"
              >
                Review Nutrition Results
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { resultSet, summary, genetics_href } = phase;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-semibold leading-tight text-white md:text-base">
              NutrigenDX results
            </h2>
            <p className="mt-1 text-[13px] text-white/[0.62]">
              GeneX360 nutrition genetics cross-referenced with your nutrition findings.
              Educational only.
            </p>
          </div>
          <Link
            href={genetics_href}
            className="inline-flex min-h-[44px] items-center text-sm text-[#2DA5A0]"
          >
            Open My Genetics
          </Link>
        </div>
        <p className="mt-3 text-sm text-white/70">
          Markers {summary.marker_count} of {summary.marker_total}
          {" · "}
          Findings {summary.finding_count}
        </p>
      </div>

      {resultSet.markers.length > 0 ? (
        <ul className="space-y-3">
          {resultSet.markers.map((m) => {
            const related = relatedFindingsForGene(m.gene, resultSet.findings);
            return (
              <li
                key={`${m.gene}-${m.rsid}`}
                className="rounded-2xl border border-white/[0.08] bg-[#1E3054] p-4 text-sm"
              >
                <div className="font-medium text-white">
                  {m.gene}{' '}
                  <span className="text-white/55">{m.rsid}</span>
                  <span className="ml-2 text-xs uppercase tracking-wide text-white/45">
                    {m.category}
                  </span>
                </div>
                <div className="mt-1 text-white/70">
                  Genotype: {m.genotype}
                  {m.confidence ? ` · confidence ${m.confidence}` : ''}
                </div>
                <p className="mt-2 text-white/70">{m.impactSummary}</p>
                {related.length > 0 ? (
                  <div className="mt-2 text-xs text-white/55">
                    Related findings:{' '}
                    {related
                      .map((f) => `${f.itemName} (${f.direction})`)
                      .join('; ')}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {resultSet.findings.length > 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#1E3054] p-4">
          <h3 className="text-sm font-medium text-white">NutrigenDX nutrition findings</h3>
          <ul className="mt-2 space-y-2 text-sm text-white/70">
            {resultSet.findings.map((f) => (
              <li key={f.itemSlug}>
                <span className="font-medium text-white">{f.itemName}</span>
                {' · '}
                {f.direction}
                {' · '}
                {f.category}
                {f.rationale ? (
                  <span className="block text-xs text-white/55">{f.rationale}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {summary.missing_genes.length > 0 && summary.marker_count > 0 ? (
        <p className="text-xs text-white/45">
          NutrigenDX genes not in your results yet:{' '}
          {summary.missing_genes.slice(0, 12).join(', ')}
          {summary.missing_genes.length > 12 ? '…' : ''}
        </p>
      ) : null}
    </div>
  );
}

export default NutrigenDxResultsTab;
