'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  X,
  ChevronRight,
  FlaskConical,
  Info,
  ShieldAlert,
} from 'lucide-react';
import type { EducationEntry } from '@/lib/peptides/educationEntries';
import { matchesSearchPrefix } from '@/lib/peptides/peptideSearchMatch';

function EducationCard({ entry }: { entry: EducationEntry }) {
  return (
    <Link
      href={`/peptide-protocol/peptide/${encodeURIComponent(entry.entryKey)}`}
      data-testid={`kb-peptide-card-${entry.entryKey}`}
      aria-label={`Open ${entry.title} educational entry`}
      className="flex h-full min-h-[44px] flex-col rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1E3054]/45 backdrop-blur-md p-4 transition-colors hover:border-[#2DA5A0]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-sm font-semibold text-white">{entry.title}</h3>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
          {entry.evidenceGrade}
        </span>
      </div>
      {!entry.isPeptide ? (
        <span className="mt-2 self-start rounded-full border border-[rgba(183,94,24,0.35)] bg-[rgba(183,94,24,0.12)] px-2 py-0.5 text-[10px] text-[#B75E18]">
          Not a peptide
        </span>
      ) : null}
      <span className="mt-3 inline-flex min-h-[44px] items-center gap-1 text-[11px] text-[#2DA5A0]">
        Open entry
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
      </span>
    </Link>
  );
}

export function KbPeptideCatalogSection({
  entries,
  total,
}: {
  entries: EducationEntry[];
  total: number;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return entries;
    return entries.filter(
      (entry) =>
        matchesSearchPrefix(entry.title, q) ||
        matchesSearchPrefix(entry.entryKey, q),
    );
  }, [entries, query]);

  if (total === 0) {
    return (
      <section
        data-testid="kb-peptide-catalog-pending"
        className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-4 sm:p-5 space-y-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(45,165,160,0.30)] bg-gradient-to-br from-[#1A2744] to-[#2DA5A0]">
            <FlaskConical className="h-[18px] w-[18px] text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Peptide Education Database</h2>
            <p className="text-[11px] text-white/45">Educational reference</p>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-[rgba(183,94,24,0.25)] bg-[rgba(183,94,24,0.10)] p-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#B75E18]" strokeWidth={1.5} />
          <p className="text-xs text-white/70 leading-relaxed">
            Educational peptide entries are not available yet. Discuss peptide education
            with a licensed practitioner in the meantime.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="kb-peptide-catalog"
      className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-4 sm:p-5 space-y-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(45,165,160,0.30)] bg-gradient-to-br from-[#1A2744] to-[#2DA5A0]">
          <Search className="h-[18px] w-[18px] text-white" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-white">Search Peptides</h2>
          <p className="mt-0.5 text-[11px] text-white/45">
            {total} educational entries
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#1E3054]/45 backdrop-blur-md border border-white/15 focus-within:border-[#2DA5A0]">
        <Search className="w-4 h-4 text-white/35 shrink-0" strokeWidth={1.5} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search peptide information"
          className="flex-1 text-sm text-white placeholder:text-white/30 outline-none bg-transparent"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center"
          >
            <X className="w-4 h-4 text-white/35" strokeWidth={1.5} />
          </button>
        ) : null}
      </div>

      <p className="rounded-xl border border-[rgba(183,94,24,0.20)] bg-[rgba(183,94,24,0.08)] px-3 py-2 text-[11px] leading-relaxed text-white/65">
        Educational reference only. No retail peptide sales, dosing, reconstitution, or sourcing.
        Share with your licensed practitioner for clinical context.
      </p>

      {filtered.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-white/40">
          No peptides found{query ? ` matching "${query}"` : ''}.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <EducationCard key={entry.entryKey} entry={entry} />
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 text-[10px] text-white/40">
        <Info className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.5} />
        <p>
          Unverified sport-status and regulatory fields stay unknown and are not shown as
          cleared.
        </p>
      </div>
    </section>
  );
}
