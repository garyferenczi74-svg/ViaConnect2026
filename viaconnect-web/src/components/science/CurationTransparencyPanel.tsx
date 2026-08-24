'use client';

/**
 * Prompt 227b: Science & Authorities curation transparency (G62/G63/G65).
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ClipboardList,
  FilePlus2,
  History,
  SearchX,
  Timer,
} from 'lucide-react';
import type { CurationTransparencyBundle } from '@/lib/kb/curationTransparency227b';
import { CURATION_TRANSPARENCY_COPY_227B as COPY } from '@/lib/science/curationTransparencyCopy227b';

function formatHours(h: number | null): string {
  if (h === null || !Number.isFinite(h)) return COPY.reviewMedianUnknown;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} d`;
}

function CardShell({
  title,
  lead,
  icon,
  children,
  testId,
}: {
  title: string;
  lead: string;
  icon: ReactNode;
  children: ReactNode;
  testId: string;
}) {
  return (
    <section
      className="rounded-xl border border-white/[0.08] bg-[var(--card)]/70 p-4 space-y-3"
      data-testid={testId}
      aria-label={title}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 text-[#2DA5A0]">{icon}</div>
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-white/45">{lead}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function CurationTransparencyPanel() {
  const [data, setData] = useState<CurationTransparencyBundle | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [additionFilter, setAdditionFilter] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const res = await fetch('/api/kb/curation-transparency');
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || json.error === 'Unauthorized') {
          setError(COPY.signInRequired);
          return;
        }
        if (!json.ok) {
          setError(String(json.error ?? COPY.unavailable));
          return;
        }
        setData({
          reviewQueue: json.reviewQueue,
          recentAdditions: json.recentAdditions ?? [],
          corrections: json.corrections ?? [],
          negatives: json.negatives ?? [],
          census: json.census,
          lastCycle: json.lastCycle ?? null,
        });
      } catch {
        if (!cancelled) setError(COPY.unavailable);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredAdditions = useMemo(() => {
    const rows = data?.recentAdditions ?? [];
    if (additionFilter === 'all') return rows;
    return rows.filter((r) => String(r.changeClass) === additionFilter);
  }, [data?.recentAdditions, additionFilter]);

  return (
    <div
      className="space-y-4"
      data-testid="science-curation-transparency"
      aria-label={COPY.sectionTitle}
    >
      <div>
        <h2 className="text-base font-semibold text-white">{COPY.sectionTitle}</h2>
        <p className="mt-1 text-xs leading-relaxed text-white/45">
          {COPY.sectionLead}
        </p>
      </div>

      {busy ? (
        <p className="text-xs text-white/40">{COPY.loading}</p>
      ) : null}
      {error ? (
        <p
          className="text-xs text-amber-200"
          data-testid="science-curation-error"
        >
          {error}
        </p>
      ) : null}

      {!busy && !error && data ? (
        <>
          <CardShell
            title={COPY.reviewTitle}
            lead={COPY.reviewLead}
            testId="science-review-queue"
            icon={<ClipboardList className="h-4 w-4" strokeWidth={1.5} />}
          >
            <div className="flex flex-wrap items-baseline gap-3">
              <p className="text-2xl font-semibold text-white tabular-nums">
                {data.reviewQueue.total}
              </p>
              <p className="text-xs text-white/50">{COPY.reviewDepthLabel}</p>
            </div>
            {data.reviewQueue.total === 0 ? (
              <p className="text-[11px] text-white/40">{COPY.reviewEmpty}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(data.reviewQueue.byClass)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([k, n]) => (
                    <span
                      key={k}
                      className="rounded-full border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-2 py-0.5 text-[10px] text-[#2DA5A0]"
                    >
                      {COPY.classLabels[k] ?? `Class ${k}`}: {n}
                    </span>
                  ))}
              </div>
            )}
            <p className="text-[11px] text-white/40 flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5" strokeWidth={1.5} />
              {COPY.reviewMedianLabel}:{' '}
              {formatHours(data.reviewQueue.medianReviewHours)}
            </p>
          </CardShell>

          <CardShell
            title={COPY.additionsTitle}
            lead={COPY.additionsLead}
            testId="science-recent-additions"
            icon={<FilePlus2 className="h-4 w-4" strokeWidth={1.5} />}
          >
            <div className="flex flex-wrap gap-1.5">
              {['all', '0', '1', '2'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setAdditionFilter(f)}
                  className={`rounded-full border px-2.5 py-1 text-[10px] min-h-[32px] ${
                    additionFilter === f
                      ? 'border-[#2DA5A0]/40 bg-[#2DA5A0]/15 text-[#2DA5A0]'
                      : 'border-white/10 bg-white/5 text-white/40'
                  }`}
                >
                  {f === 'all' ? 'All' : COPY.classLabels[f] ?? `Class ${f}`}
                </button>
              ))}
            </div>
            {filteredAdditions.length === 0 ? (
              <p className="text-[11px] text-white/40">{COPY.additionsEmpty}</p>
            ) : (
              <ul className="space-y-2 list-none">
                {filteredAdditions.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    <p className="text-xs text-white">
                      {row.compoundSlug
                        ? row.compoundSlug
                        : `${row.targetTable}.${row.targetField}`}
                    </p>
                    <p className="mt-0.5 text-[10px] text-white/40">
                      {row.targetField} · Class {row.changeClass} · {row.status}
                      {row.sourceTier != null
                        ? ` · Tier ${row.sourceTier}`
                        : ''}
                      {' · '}
                      {new Date(row.occurredAt).toISOString().slice(0, 10)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardShell>

          <CardShell
            title={COPY.correctionsTitle}
            lead={COPY.correctionsLead}
            testId="science-corrections-log"
            icon={<History className="h-4 w-4" strokeWidth={1.5} />}
          >
            {data.corrections.length === 0 ? (
              <p className="text-[11px] text-white/40">{COPY.correctionsEmpty}</p>
            ) : (
              <ul className="space-y-2 list-none">
                {data.corrections.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    <p className="text-[10px] text-white/35">
                      {new Date(c.occurredAt).toISOString().slice(0, 10)}
                      {c.compoundSlug ? ` · ${c.compoundSlug}` : ''}
                      {` · ${c.direction}`}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-white/70">
                      {c.publicSummary}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardShell>

          <CardShell
            title={COPY.coverageTitle}
            lead={COPY.coverageLead}
            testId="science-coverage-negatives"
            icon={<SearchX className="h-4 w-4" strokeWidth={1.5} />}
          >
            {!data.census.hasCycle || !data.census.counts ? (
              <p className="text-[11px] text-white/40">{COPY.coverageUnknown}</p>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">
                  {COPY.censusLabel}
                  {data.census.computedAt
                    ? ` · ${new Date(data.census.computedAt).toISOString().slice(0, 10)}`
                    : ''}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(COPY.censusKeys).map(([key, label]) => {
                    const raw = data.census.counts?.[key];
                    const value =
                      typeof raw === 'number' && Number.isFinite(raw)
                        ? raw
                        : null;
                    return (
                      <span
                        key={key}
                        className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/55"
                      >
                        {label}: {value === null ? 'UNKNOWN' : value}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {data.negatives.length === 0 ? (
              <p className="text-[11px] text-white/40">
                {COPY.coverageEmptyNegatives}
              </p>
            ) : (
              <ul className="space-y-2 list-none">
                {data.negatives.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    <p className="text-[10px] text-white/35">
                      {new Date(n.createdAt).toISOString().slice(0, 10)} ·{' '}
                      {n.gapType}
                      {n.sourcesSearched.length > 0
                        ? ` · ${n.sourcesSearched.join(', ')}`
                        : ''}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-white/60">
                      {n.interpretation || 'Confirmed empty result.'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardShell>

          <div
            className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
            data-testid="science-last-cycle"
          >
            <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">
              {COPY.cycleTitle}
            </p>
            {!data.lastCycle ? (
              <p className="mt-2 text-[11px] text-white/40">{COPY.cycleEmpty}</p>
            ) : (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <p className="text-[10px] text-white/35">{COPY.cycleGapsClosed}</p>
                  <p className="text-sm text-white tabular-nums">
                    {data.lastCycle.gapsClosed}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-white/35">{COPY.cycleNegatives}</p>
                  <p className="text-sm text-white tabular-nums">
                    {data.lastCycle.negativeResultsCount}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-white/35">{COPY.cycleProposals}</p>
                  <p className="text-sm text-white">
                    {Object.entries(data.lastCycle.proposalsRaised)
                      .filter(([, n]) => Number(n) > 0)
                      .map(([k, n]) => `C${k}:${n}`)
                      .join(' · ') || 'none'}
                  </p>
                </div>
                <p className="sm:col-span-3 text-[10px] text-white/35">
                  {new Date(data.lastCycle.startedAt).toISOString()}
                  {data.lastCycle.endedAt
                    ? ` to ${new Date(data.lastCycle.endedAt).toISOString()}`
                    : ''}
                </p>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
