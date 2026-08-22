'use client';

/**
 * Prompt 226h Wave B: Collection 14 evidence view for Research Hub Evidence tab.
 */

import { useEffect, useState } from 'react';
import { BookOpen, ExternalLink, FlaskConical } from 'lucide-react';
import type { PeptideEvidenceBundle } from '@/lib/kb/unifiedEvidence226h';

export function PeptideEvidencePanel() {
  const [query, setQuery] = useState('epitalon');
  const [bundle, setBundle] = useState<PeptideEvidenceBundle | null>(null);
  const [recordIds, setRecordIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function runSearch(nextQuery: string) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(
        `/api/kb/peptide-evidence?q=${encodeURIComponent(nextQuery)}&limit=24`,
      );
      const json = await res.json();
      if (!res.ok || json.error === 'Unauthorized') {
        setError('Sign in to view Collection 14 evidence.');
        setBundle(null);
        return;
      }
      if (!json.ok) {
        setError(String(json.error ?? 'Evidence unavailable'));
        setBundle(null);
        return;
      }
      setBundle(json.bundle ?? null);
      setRecordIds(json.recordIds ?? []);
    } catch {
      setError('Evidence unavailable');
      setBundle(null);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void runSearch(query);
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      className="space-y-4"
      data-testid="research-hub-peptide-evidence"
      aria-label="Collection 14 peptide evidence"
    >
      <div>
        <h2 className="text-base font-semibold text-white">
          Collection 14 evidence
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-white/45">
          Trials and publications linked to educational peptides. Same record
          ids Hannah cites. Sherlock media feed stays on the Media tab.
        </p>
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch(query);
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-[12rem] flex-1 rounded-xl border border-white/15 bg-[var(--card)] px-3 py-2 text-sm text-white"
          placeholder="Peptide name or slug"
          aria-label="Evidence search"
          data-testid="peptide-evidence-query"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/15 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Searching...' : 'Search evidence'}
        </button>
      </form>

      {error ? (
        <p className="text-xs text-amber-200" data-testid="peptide-evidence-error">
          {error}
        </p>
      ) : null}

      {bundle?.ingestStatus?.length ? (
        <div className="flex flex-wrap gap-2">
          {bundle.ingestStatus.map((s) => (
            <span
              key={s.sourceSystem}
              className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] text-white/55"
              data-testid={`evidence-freshness-${s.sourceSystem}`}
            >
              {s.sourceSystem}: {s.status}
              {s.lastSuccessfulRun
                ? ` · ${new Date(s.lastSuccessfulRun).toISOString().slice(0, 16)}Z`
                : ' · UNKNOWN'}
            </span>
          ))}
        </div>
      ) : null}

      {bundle?.provenanceSummary ? (
        <p
          className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[11px] leading-relaxed text-white/55"
          data-testid="peptide-evidence-provenance-summary"
        >
          {bundle.provenanceSummary}
        </p>
      ) : null}

      {bundle?.peptides?.map((p) => (
        <article
          key={p.peptideId}
          className="rounded-xl border border-white/[0.08] bg-[var(--card)]/80 p-3 space-y-2"
          data-testid={`evidence-peptide-${p.slug}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-white">{p.displayName}</h3>
              <p className="text-[10px] text-white/40">{p.slug}</p>
            </div>
            <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/55">
              {p.preparationClass}
            </span>
          </div>
          {p.derivedFromSlug ? (
            <p className="text-[11px] text-white/45">
              Derived from extract: {p.derivedFromSlug}
            </p>
          ) : null}
          {p.provenanceDisclosure ? (
            <p className="text-[11px] leading-relaxed text-amber-100/80">
              {p.provenanceDisclosure}
            </p>
          ) : null}
        </article>
      ))}

      <div className="space-y-2">
        {(bundle?.records ?? []).map((r) => (
          <article
            key={`${r.recordType}-${r.recordId}`}
            className="rounded-xl border border-white/[0.08] bg-[#1E3054]/50 p-3"
            data-testid={`evidence-record-${r.recordType}-${r.recordId}`}
            data-record-id={`${r.recordType}:${r.recordId}`}
          >
            <div className="flex items-start gap-2">
              {r.recordType === 'trial' ? (
                <FlaskConical
                  className="h-4 w-4 text-[#2DA5A0] mt-0.5"
                  strokeWidth={1.5}
                />
              ) : (
                <BookOpen
                  className="h-4 w-4 text-[#2DA5A0] mt-0.5"
                  strokeWidth={1.5}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white font-medium leading-snug">
                  {r.title}
                </p>
                <p className="mt-1 text-[10px] text-white/40">
                  {r.recordType} · {r.peptideDisplayName} · tier{' '}
                  {r.sourceTier ?? 'UNKNOWN'} · {r.freshnessLabel}
                </p>
                {r.sourceUrl ? (
                  <a
                    href={r.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#2DA5A0]"
                  >
                    Open source
                    <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                  </a>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      {recordIds.length > 0 ? (
        <p
          className="text-[10px] text-white/30"
          data-testid="peptide-evidence-record-ids"
        >
          Record ids: {recordIds.join(', ')}
        </p>
      ) : null}
    </section>
  );
}
