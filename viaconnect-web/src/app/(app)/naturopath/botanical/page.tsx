'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HerbalInteraction {
  herb_name: string;
  latin_name?: string;
  gene: string;
  interaction_type: 'Synergistic' | 'Antagonistic' | 'Caution' | 'Modifying';
  evidence_level: 'Strong' | 'Moderate' | 'Preliminary';
  description?: string;
  mechanism?: string;
  related_product?: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const INTERACTIONS: HerbalInteraction[] = [
  {
    herb_name: 'St. John\'s Wort',
    latin_name: 'Hypericum perforatum',
    gene: 'CYP2D6',
    interaction_type: 'Caution',
    evidence_level: 'Strong',
    description: 'Potent CYP2D6 inducer. May significantly reduce serum levels of CYP2D6-metabolized medications and supplements.',
    mechanism: 'Hyperforin activates PXR nuclear receptor, upregulating CYP2D6 expression',
    related_product: 'CLEAN+ Detox',
  },
  {
    herb_name: 'Turmeric/Curcumin',
    gene: 'COMT',
    interaction_type: 'Synergistic',
    evidence_level: 'Moderate',
    description: 'Curcumin inhibits COMT enzyme activity. May enhance effects of COMT-targeted supplements in slow COMT metabolizers.',
    mechanism: 'Competitive inhibition of catechol-O-methyltransferase',
    related_product: 'COMT+',
  },
  {
    herb_name: 'Ashwagandha',
    latin_name: 'Withania somnifera',
    gene: 'GAD1',
    interaction_type: 'Synergistic',
    evidence_level: 'Moderate',
    description: 'Supports GABAergic neurotransmission. May benefit individuals with GAD1 variants affecting GABA synthesis.',
    related_product: 'RELAX+',
  },
  {
    herb_name: 'Milk Thistle',
    latin_name: 'Silybum marianum',
    gene: 'CYP3A4',
    interaction_type: 'Caution',
    evidence_level: 'Strong',
    description: 'Silymarin inhibits CYP3A4 enzyme. May alter metabolism of CYP3A4 substrates.',
    related_product: 'CLEAN+',
  },
  {
    herb_name: 'Ginkgo Biloba',
    gene: 'CYP2C19',
    interaction_type: 'Caution',
    evidence_level: 'Moderate',
  },
  {
    herb_name: 'Valerian',
    latin_name: 'Valeriana officinalis',
    gene: 'GABA-A receptor',
    interaction_type: 'Synergistic',
    evidence_level: 'Moderate',
  },
  {
    herb_name: 'Echinacea',
    gene: 'TNF-alpha',
    interaction_type: 'Modifying',
    evidence_level: 'Preliminary',
  },
  {
    herb_name: 'Green Tea EGCG',
    gene: 'COMT',
    interaction_type: 'Antagonistic',
    evidence_level: 'Strong',
    description: 'EGCG is a potent COMT inhibitor. May counteract COMT+ supplement mechanism in fast COMT metabolizers.',
  },
];

// ─── Badge colors ────────────────────────────────────────────────────────────

const typeBadge: Record<string, { bg: string; text: string }> = {
  Synergistic: { bg: '#27AE6020', text: '#27AE60' },
  Antagonistic: { bg: '#E74C3C20', text: '#E74C3C' },
  Caution: { bg: '#C4944A20', text: '#C4944A' },
  Modifying: { bg: '#3B82F620', text: '#3B82F6' },
};

const evidenceBadge: Record<string, { bg: string; text: string }> = {
  Strong: { bg: '#27AE6015', text: '#27AE60' },
  Moderate: { bg: '#3B82F615', text: '#3B82F6' },
  Preliminary: { bg: '#C4944A15', text: '#C4944A' },
};

// ─── Filter options ──────────────────────────────────────────────────────────

const TYPE_FILTERS = ['All', 'Synergistic', 'Antagonistic', 'Caution'] as const;
const EVIDENCE_FILTERS = ['Strong Evidence', 'Moderate', 'Preliminary'] as const;

type FilterValue = (typeof TYPE_FILTERS)[number] | (typeof EVIDENCE_FILTERS)[number];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BotanicalGenomicPage() {
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<FilterValue>>(new Set());

  const toggleFilter = (f: FilterValue) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (f === 'All') {
        return new Set();
      }
      next.delete('All');
      if (next.has(f)) {
        next.delete(f);
      } else {
        next.add(f);
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return INTERACTIONS.filter((item) => {
      // Search filter
      if (q) {
        const matchesSearch =
          item.herb_name.toLowerCase().includes(q) ||
          (item.latin_name && item.latin_name.toLowerCase().includes(q)) ||
          item.gene.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Type / evidence filters
      if (activeFilters.size === 0) return true;

      const typeMatch =
        !Array.from(activeFilters).some((f) => TYPE_FILTERS.includes(f as typeof TYPE_FILTERS[number])) ||
        activeFilters.has(item.interaction_type as FilterValue);

      const evidenceFilterMap: Record<string, string> = {
        'Strong Evidence': 'Strong',
        Moderate: 'Moderate',
        Preliminary: 'Preliminary',
      };
      const activeEvidenceFilters = Array.from(activeFilters).filter((f) =>
        EVIDENCE_FILTERS.includes(f as typeof EVIDENCE_FILTERS[number])
      );
      const evidenceMatch =
        activeEvidenceFilters.length === 0 ||
        activeEvidenceFilters.some((f) => evidenceFilterMap[f] === item.evidence_level);

      return typeMatch && evidenceMatch;
    });
  }, [search, activeFilters]);

  const allFilters: FilterValue[] = ['All', ...TYPE_FILTERS.filter((f) => f !== 'All'), ...EVIDENCE_FILTERS];

  return (
    <div
      className="min-h-screen px-6 py-10"
      style={{ background: 'linear-gradient(180deg, #0D1520 0%, #121E1A 50%, #131D2E 100%)' }}
    >
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-heading-2" style={{ color: '#C4944A' }}>
            Herbal-Genomic Database
          </h1>
          <p className="text-body-sm text-secondary mt-1">
            Explore interactions between botanical medicines and genetic variants.
          </p>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div
            className="relative glass-v2 rounded-xl overflow-hidden"
          >
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by herb or gene name..."
              className="w-full h-11 pl-11 pr-4 text-sm text-white placeholder:text-secondary bg-transparent outline-none"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {allFilters.map((f) => {
            const isActive = f === 'All' ? activeFilters.size === 0 : activeFilters.has(f);
            return (
              <button
                key={f}
                onClick={() => toggleFilter(f)}
                className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                style={
                  isActive
                    ? { backgroundColor: '#7BAE7F26', color: '#7BAE7F' }
                    : { backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }
                }
              >
                {f}
              </button>
            );
          })}
        </div>

        {/* Results */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="glass-v2 p-6 rounded-xl text-center">
              <p className="text-secondary text-sm">No interactions found matching your criteria.</p>
            </div>
          )}
          {filtered.map((item, i) => {
            const tBadge = typeBadge[item.interaction_type];
            const eBadge = evidenceBadge[item.evidence_level];
            return (
              <div key={i} className="glass-v2 p-4 rounded-xl">
                {/* Top row: herb name, latin, type badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{item.herb_name}</span>
                    {item.latin_name && (
                      <span className="text-xs italic text-tertiary">{item.latin_name}</span>
                    )}
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: tBadge.bg, color: tBadge.text }}
                  >
                    {item.interaction_type}
                  </span>
                </div>

                {/* Gene target */}
                <p className="font-mono text-sm mb-1.5" style={{ color: '#7BAE7F' }}>
                  {item.gene}
                </p>

                {/* Evidence pill */}
                <span
                  className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full mb-2"
                  style={{ backgroundColor: eBadge.bg, color: eBadge.text }}
                >
                  {item.evidence_level} Evidence
                </span>

                {/* Description */}
                {item.description && (
                  <p className="text-body-sm text-secondary mb-1.5">{item.description}</p>
                )}

                {/* Mechanism */}
                {item.mechanism && (
                  <p className="text-xs italic text-tertiary mb-1.5">
                    Mechanism: {item.mechanism}
                  </p>
                )}

                {/* Related product + check button */}
                <div className="flex items-center justify-between mt-2">
                  {item.related_product ? (
                    <span className="text-xs" style={{ color: '#7BAE7F' }}>
                      Related: {item.related_product}
                    </span>
                  ) : (
                    <span />
                  )}
                  <a
                    href="#"
                    className="text-xs font-medium px-3 py-1 rounded-lg border transition-colors hover:bg-white/[0.04]"
                    style={{ borderColor: '#7BAE7F40', color: '#7BAE7F' }}
                  >
                    Check for Patient
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
