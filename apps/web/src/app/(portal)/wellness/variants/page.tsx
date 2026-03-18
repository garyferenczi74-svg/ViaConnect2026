"use client";

import { useState, useMemo } from "react";
import {
  Sparkles,
  AlertTriangle,
  Search,
  Filter,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

/* ────────────────────────────────────────────
   TypeScript Interfaces
   ──────────────────────────────────────────── */

type RiskLevel = "high" | "moderate" | "low";
type VariantCategory = "methylation" | "neurotransmitter" | "nutrient" | "metabolic" | "cardiovascular";

interface GeneVariant {
  gene: string;
  rsId: string;
  genotype: string;
  risk: RiskLevel;
  description: string;
  category: VariantCategory;
  recommendations: number;
  slug: string;
}

/* ────────────────────────────────────────────
   Sample Data
   ──────────────────────────────────────────── */

const variants: GeneVariant[] = [
  {
    gene: "MTHFR",
    rsId: "rs1801133",
    genotype: "TT",
    risk: "high",
    description:
      "Reduced MTHFR enzyme activity up to 70%. Significantly impaired folate metabolism requiring methylated B-vitamin supplementation and homocysteine monitoring.",
    category: "methylation",
    recommendations: 5,
    slug: "mthfr",
  },
  {
    gene: "COMT",
    rsId: "rs4680",
    genotype: "AA",
    risk: "high",
    description:
      "Slow COMT — 3-4x slower dopamine breakdown. Increased sensitivity to stress and stimulants. May benefit from magnesium, adaptogens, and catechol-reducing dietary strategies.",
    category: "neurotransmitter",
    recommendations: 5,
    slug: "comt",
  },
  {
    gene: "VDR",
    rsId: "rs731236",
    genotype: "AA",
    risk: "moderate",
    description:
      "Slightly reduced vitamin D receptor efficiency. Higher baseline supplementation may be needed to maintain optimal serum 25(OH)D levels above 50 ng/mL.",
    category: "nutrient",
    recommendations: 5,
    slug: "vdr",
  },
  {
    gene: "APOE",
    rsId: "rs429358",
    genotype: "e3/e3",
    risk: "low",
    description:
      "Neutral risk profile. Most common genotype with standard lipid metabolism and no elevated Alzheimer's or cardiovascular risk from this locus.",
    category: "cardiovascular",
    recommendations: 5,
    slug: "apoe",
  },
  {
    gene: "FTO",
    rsId: "rs9939609",
    genotype: "AA",
    risk: "high",
    description:
      "Reduced satiety signaling. Associated with increased appetite drive and higher BMI risk. Responsive to high-protein dietary patterns and structured meal timing.",
    category: "metabolic",
    recommendations: 6,
    slug: "fto",
  },
  {
    gene: "MTR",
    rsId: "rs1805087",
    genotype: "AG",
    risk: "moderate",
    description:
      "Methionine synthase variant affecting B12-dependent homocysteine remethylation. Monitor B12 status and consider methylcobalamin supplementation.",
    category: "methylation",
    recommendations: 4,
    slug: "mtr",
  },
  {
    gene: "MAOA",
    rsId: "rs6323",
    genotype: "TT",
    risk: "moderate",
    description:
      "Reduced monoamine oxidase A activity. Slower serotonin and norepinephrine breakdown may affect mood regulation and stress recovery timelines.",
    category: "neurotransmitter",
    recommendations: 4,
    slug: "maoa",
  },
  {
    gene: "CYP1A2",
    rsId: "rs762551",
    genotype: "AA",
    risk: "low",
    description:
      "Fast caffeine metabolizer. Coffee consumption may confer cardiovascular benefit. No need to restrict caffeine intake if consumed before 2 PM.",
    category: "metabolic",
    recommendations: 3,
    slug: "cyp1a2",
  },
];

/* ────────────────────────────────────────────
   Filter Categories
   ──────────────────────────────────────────── */

const FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Methylation", value: "methylation" },
  { label: "Neuro", value: "neurotransmitter" },
  { label: "Nutrients", value: "nutrient" },
  { label: "Metabolic", value: "metabolic" },
  { label: "Cardiovascular", value: "cardiovascular" },
];

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

const riskStyles = {
  high: {
    border: "border-l-red-400",
    badge: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  moderate: {
    border: "border-l-yellow-400",
    badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    icon: null,
  },
  low: {
    border: "border-l-green-400",
    badge: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: null,
  },
} as const;

const categoryLabels: Record<VariantCategory, string> = {
  methylation: "Methylation",
  neurotransmitter: "Neurotransmitter",
  nutrient: "Nutrient",
  metabolic: "Metabolic",
  cardiovascular: "Cardiovascular",
};

const NAV_TABS = [
  { label: "Dashboard", href: "/wellness" },
  { label: "Genetics", href: "/wellness/genetics" },
  { label: "Variants", href: "/wellness/variants" },
  { label: "Bio", href: "/wellness/biomarkers" },
  { label: "Plans", href: "/wellness/plans" },
  { label: "Track", href: "/wellness/track" },
  { label: "Share", href: "/wellness/share" },
  { label: "Insights", href: "/wellness/insights" },
  { label: "Learn", href: "/wellness/learn" },
  { label: "Research", href: "/wellness/research" },
];

/* ────────────────────────────────────────────
   Page Component
   ──────────────────────────────────────────── */

export default function VariantsPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const filtered = useMemo(() => {
    return variants.filter((v) => {
      const matchesCategory =
        activeFilter === "all" || v.category === activeFilter;
      const matchesSearch =
        search === "" ||
        v.gene.toLowerCase().includes(search.toLowerCase()) ||
        v.rsId.toLowerCase().includes(search.toLowerCase()) ||
        v.description.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [search, activeFilter]);

  return (
    <div className="min-h-screen bg-[#111827] text-white font-sans antialiased">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-[#111827]/90 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/wellness"
              className="px-3 py-1.5 rounded-full bg-gray-800 text-xs text-gray-300 border border-gray-700 hover:bg-gray-700 transition-colors"
            >
              &larr; Return to Main Menu
            </Link>
            <div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center text-gray-900">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold leading-tight">
                Personal Wellness Portal
              </h1>
              <p className="text-[10px] text-gray-400">
                ViaConnect&trade; AI-Powered Health
              </p>
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <nav className="max-w-6xl mx-auto px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {NAV_TABS.map((tab) => {
            const isActive = tab.label === "Variants";
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={`whitespace-nowrap px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-green-400 text-gray-900 font-bold"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* ── 1. Title ── */}
        <section>
          <h2 className="text-2xl font-bold">Genetic Variant Analysis</h2>
          <p className="text-sm text-gray-400 mt-1">
            Detailed single-nucleotide polymorphism (SNP) analysis across key
            health-related genes. Each variant includes risk classification,
            clinical interpretation, and personalized recommendations.
          </p>
        </section>

        {/* ── 2. Search + Filters ── */}
        <section className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Search */}
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search genes, rsIDs, or keywords..."
              className="w-full bg-gray-800/50 border border-green-400/15 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-green-400/40 focus:outline-none focus:ring-0 backdrop-blur-sm"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
            {FILTER_OPTIONS.map((f) => {
              const isActive = activeFilter === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => setActiveFilter(f.value)}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-white text-gray-900"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── 3. Variant Cards Grid ── */}
        <section>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-gray-600" />
              </div>
              <h3 className="text-gray-400 font-medium">No variants found</h3>
              <p className="text-gray-600 text-sm mt-1">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map((v) => {
                const styles = riskStyles[v.risk];
                return (
                  <Link
                    key={v.slug}
                    href={`/wellness/variants/${v.slug}`}
                    className={`group bg-gray-800/50 border border-green-400/15 border-l-4 ${styles.border} rounded-xl backdrop-blur-sm p-5 flex flex-col gap-3 hover:bg-gray-800/80 transition-colors cursor-pointer`}
                  >
                    {/* Top row: gene name + risk badge */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-green-400 flex-shrink-0" />
                        <div>
                          <h3 className="font-bold text-base">{v.gene}</h3>
                          <p className="text-[11px] text-gray-500">
                            {v.rsId} &middot;{" "}
                            <span className="text-gray-400 font-medium">
                              {v.genotype}
                            </span>
                          </p>
                        </div>
                      </div>
                      <span
                        className={`${styles.badge} border text-[10px] px-2 py-0.5 rounded uppercase font-bold flex items-center gap-1`}
                      >
                        {styles.icon}
                        {v.risk}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {v.description}
                    </p>

                    {/* Bottom row: category + recs */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-gray-900/60 border border-gray-700 text-[10px] text-gray-400 px-2.5 py-0.5 rounded-full">
                          {categoryLabels[v.category]}
                        </span>
                        <span className="bg-green-400/10 border border-green-400/20 text-[10px] text-green-400 px-2.5 py-0.5 rounded-full">
                          {v.recommendations} recommendations
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-600 group-hover:text-green-400 transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Results count ── */}
        <p className="text-[11px] text-gray-600 text-center">
          Showing {filtered.length} of {variants.length} analyzed variants
        </p>
      </main>
    </div>
  );
}
