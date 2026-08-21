'use client';

import { useMemo, useState } from 'react';
import {
  Search,
  X,
  ChevronDown,
  FlaskConical,
  Info,
  ShieldAlert,
} from 'lucide-react';
import type { EducationPeptide, EducationPeptideCategory } from '@/lib/kb/peptides/types';
import { gradeToBadge } from '@/lib/kb/peptides/types';
import { matchesSearchPrefix } from '@/lib/peptides/peptideSearchMatch';

const EVIDENCE_STYLE = {
  strong:
    'bg-[rgba(34,197,94,0.12)] text-[#22C55E] border-[rgba(34,197,94,0.30)]',
  moderate:
    'bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border-[rgba(245,158,11,0.30)]',
  emerging:
    'bg-[rgba(168,85,247,0.12)] text-[#A855F7] border-[rgba(168,85,247,0.30)]',
} as const;

function EducationCard({ peptide }: { peptide: EducationPeptide }) {
  const badge = gradeToBadge(peptide.evidenceGrade);
  return (
    <div
      data-testid={`kb-peptide-card-${peptide.slug}`}
      className="flex h-full flex-col rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1E3054]/45 backdrop-blur-md p-4"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{peptide.displayName}</h3>
          <p className="text-[10px] text-white/45 truncate">{peptide.canonicalName}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${EVIDENCE_STYLE[badge]}`}>
          Grade {peptide.evidenceGrade}
        </span>
      </div>
      <p className="text-[11px] text-[#2DA5A0] mb-2">{peptide.category}</p>
      <p className="text-xs text-white/65 leading-relaxed line-clamp-4 flex-1">
        {peptide.mechanismSummary || 'Educational monograph pending Marshall review.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {!peptide.isPeptide && (
          <span className="rounded-full border border-[rgba(183,94,24,0.35)] bg-[rgba(183,94,24,0.12)] px-2 py-0.5 text-[10px] text-[#B75E18]">
            Not a peptide
          </span>
        )}
        {peptide.wadaStatus !== 'unknown' && peptide.wadaStatus !== 'not_prohibited' && (
          <span className="rounded-full border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.12)] px-2 py-0.5 text-[10px] text-[#F87171]">
            WADA: {peptide.wadaStatus.replace(/_/g, ' ')}
          </span>
        )}
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
          {peptide.molecularClass.replace(/_/g, ' ')}
        </span>
      </div>
      {peptide.misconceptionNotes ? (
        <p className="mt-2 text-[10px] text-white/40 leading-relaxed line-clamp-2">
          {peptide.misconceptionNotes}
        </p>
      ) : null}
    </div>
  );
}

export function KbPeptideCatalogSection({
  categories,
  total,
  marshallPending,
}: {
  categories: EducationPeptideCategory[];
  total: number;
  marshallPending: boolean;
}) {
  const [query, setQuery] = useState('');
  const [openCatId, setOpenCatId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return categories;
    return categories
      .map((cat) => ({
        ...cat,
        peptides: cat.peptides.filter(
          (p) =>
            matchesSearchPrefix(p.displayName, q) ||
            matchesSearchPrefix(p.canonicalName, q) ||
            matchesSearchPrefix(p.category, q),
          // mechanismSummary omitted: mid-word hits inside prose were false positives
        ),
      }))
      .filter((cat) => cat.peptides.length > 0);
  }, [categories, query]);

  const searching = query.trim() !== '';
  const toggleCategory = (id: string) =>
    setOpenCatId((prev) => (prev === id ? null : id));

  if (marshallPending || total === 0) {
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
            <p className="text-[11px] text-white/45">Collection 14 · Marshall-gated</p>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-[rgba(183,94,24,0.25)] bg-[rgba(183,94,24,0.10)] p-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#B75E18]" strokeWidth={1.5} />
          <p className="text-xs text-white/70 leading-relaxed">
            Consumer-safe monographs are pending Marshall review. The corpus is seeded and
            fail-closed: nothing is shown as approved until compliance flips consumer_safe.
            Discuss peptide education with a licensed practitioner in the meantime.
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
            {total} monographs · {categories.length} categories · educational reference
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
          <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
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
        <div className="space-y-2.5">
          {filtered.map((cat) => {
            const open = searching || openCatId === cat.id;
            return (
              <div key={cat.id} className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-[#1E3054]/40 p-2.5 text-left"
                >
                  <FlaskConical className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-semibold text-white sm:text-sm">{cat.label}</h3>
                    <p className="text-[10px] text-white/50">
                      {cat.peptides.length} monograph{cat.peptides.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-white/45 transition-transform ${open ? 'rotate-180' : ''}`}
                    strokeWidth={1.5}
                  />
                </button>
                {open ? (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {cat.peptides.map((p) => (
                      <EducationCard key={p.slug} peptide={p} />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-2 text-[10px] text-white/40">
        <Info className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.5} />
        <p>
          Collection 14 rows are Marshall-gated. Unverified WADA and regulatory fields remain
          unknown and are not rendered as cleared.
        </p>
      </div>
    </section>
  );
}
