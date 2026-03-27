"use client";

import { useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Dna,
  Sparkles,
  ArrowRight,
} from "lucide-react";

/* ───────────────────────── types ───────────────────────── */

interface Panel {
  code: string;
  name: string;
  category: string;
  price: string;
  status: "complete" | "incomplete" | "partial";
  partialLabel?: string;
}

interface SNPVariant {
  gene: string;
  variant: string;
  rsId: string;
  genotype: string;
  impact: "Low" | "Moderate" | "High";
  category: string;
  insight?: string;
  product?: string;
}

/* ───────────────────────── data ───────────────────────── */

const panels: Panel[] = [
  { code: "GENEX-M", name: "Methylation", category: "Methylation", price: "$288.88", status: "complete" },
  { code: "GENEX-C", name: "Cardiovascular", category: "Cardiovascular", price: "$388.88", status: "complete" },
  { code: "PeptideIQ", name: "Peptide Response", category: "Peptide Response", price: "$488.88", status: "incomplete" },
  { code: "CannabisIQ", name: "Cannabis Wellness", category: "Cannabis Wellness", price: "$288.88", status: "incomplete" },
  { code: "GENEX-N", name: "Neurological", category: "Neurological", price: "$388.88", status: "incomplete" },
  { code: "GeneX360 Complete", name: "All 6 Panels", category: "Complete", price: "$988.88", status: "partial", partialLabel: "2/6" },
];

const categories = [
  "All",
  "Methylation",
  "Mood & Cognition",
  "Sleep",
  "Recovery",
  "Metabolism",
  "Detox",
  "Inflammation",
];

const snpVariants: SNPVariant[] = [
  {
    gene: "MTHFR C677T",
    variant: "C677T",
    rsId: "rs1801133",
    genotype: "CT",
    impact: "Moderate",
    category: "Methylation",
    insight:
      "Your heterozygous variant reduces methylfolate conversion by ~35%. The active L-methylfolate in MTHFR+ bypasses this enzymatic bottleneck.",
    product: "MTHFR+",
  },
  {
    gene: "COMT Val158Met",
    variant: "Val158Met",
    rsId: "rs4680",
    genotype: "AG",
    impact: "Moderate",
    category: "Mood & Cognition",
    insight:
      "Intermediate COMT activity. You metabolize catecholamines (dopamine, norepinephrine) at a moderate rate.",
    product: "COMT+",
  },
  {
    gene: "APOE E3/E4",
    variant: "E3/E4",
    rsId: "rs429358",
    genotype: "CT",
    impact: "High",
    category: "Cardiovascular",
    insight:
      "One copy of APOE4 allele. Associated with increased cardiovascular and neurological risk. Omega-3 and anti-inflammatory support recommended.",
    product: "APOE+",
  },
  {
    gene: "CYP1A2 *1F",
    variant: "*1F",
    rsId: "rs762551",
    genotype: "AA",
    impact: "Low",
    category: "Metabolism",
    insight:
      "Fast caffeine metabolizer. You can process caffeine efficiently.",
  },
  {
    gene: "VDR BsmI",
    variant: "BsmI",
    rsId: "rs1544410",
    genotype: "CT",
    impact: "Moderate",
    category: "Recovery",
    product: "RISE+",
  },
  {
    gene: "MAOA 3R/4R",
    variant: "3R/4R",
    rsId: "rs6323",
    genotype: "AG",
    impact: "Moderate",
    category: "Mood & Cognition",
    product: "RELAX+",
  },
  {
    gene: "CLOCK rs1801260",
    variant: "rs1801260",
    rsId: "rs1801260",
    genotype: "TC",
    impact: "Moderate",
    category: "Sleep",
    insight:
      "Your CLOCK variant may shift your circadian rhythm later. You may be a natural night owl.",
  },
  {
    gene: "FTO rs9939609",
    variant: "rs9939609",
    rsId: "rs9939609",
    genotype: "AT",
    impact: "Moderate",
    category: "Metabolism",
    product: "SHRED+",
  },
  {
    gene: "BDNF Val66Met",
    variant: "Val66Met",
    rsId: "rs6265",
    genotype: "AG",
    impact: "Moderate",
    category: "Mood & Cognition",
    product: "FOCUS+",
  },
  {
    gene: "GSTT1",
    variant: "null/present",
    rsId: "null",
    genotype: "null",
    impact: "High",
    category: "Detox",
    insight:
      "GSTT1 null genotype. Reduced glutathione S-transferase activity affects Phase II detoxification.",
    product: "CLEAN+",
  },
];

/* ───────────────────────── helpers ───────────────────────── */

function impactColor(impact: string): string {
  switch (impact) {
    case "Low":
      return "bg-emerald-500/20 text-emerald-400";
    case "Moderate":
      return "bg-amber-500/20 text-amber-400";
    case "High":
      return "bg-red-500/20 text-red-400";
    default:
      return "bg-white/10 text-white/60";
  }
}

/* ───────────────────────── component ───────────────────────── */

export default function GeneticsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const filtered = snpVariants.filter((v) => {
    const matchesCategory =
      activeCategory === "All" || v.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      v.gene.toLowerCase().includes(q) ||
      v.variant.toLowerCase().includes(q) ||
      v.rsId.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div
      className="min-h-screen w-full px-4 py-8 sm:px-6 lg:px-10"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="mx-auto max-w-5xl space-y-8">
        {/* ─── Header ─── */}
        <header>
          <h1
            className="text-heading-1 font-bold"
            style={{ color: "#B75E18", fontSize: "36px" }}
          >
            Your Genome
          </h1>
          <p className="text-body-sm text-secondary mt-1">
            Explore your genetic blueprint — powered by GeneX360
          </p>
        </header>

        {/* ─── GeneX360 Panel Status ─── */}
        <section className="space-y-4">
          <p
            className="text-overline font-semibold uppercase tracking-widest"
            style={{ color: "#B75E18" }}
          >
            GeneX360 Panels
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {panels.map((p) => {
              const isComplete = p.status === "complete";
              const isPartial = p.status === "partial";

              let borderStyle: React.CSSProperties = {};
              let extraClasses = "";

              if (isComplete) {
                borderStyle = {
                  border: "1px solid rgba(45,165,160,0.3)",
                  boxShadow: "0 0 18px rgba(45,165,160,0.12)",
                };
              } else if (isPartial) {
                borderStyle = {
                  border: "1px solid rgba(245,158,11,0.4)",
                };
              } else {
                borderStyle = {
                  border: "1px dashed rgba(255,255,255,0.15)",
                };
                extraClasses = "opacity-70";
              }

              return (
                <div
                  key={p.code}
                  className={`glass-v2 p-4 text-center rounded-xl ${extraClasses}`}
                  style={borderStyle}
                >
                  <p className="text-sm font-bold text-white">{p.code}</p>
                  <p className="text-xs text-secondary mt-0.5">{p.name}</p>
                  <p className="text-xs text-secondary/60 mt-1">{p.price}</p>

                  {isComplete && (
                    <p className="text-xs mt-2" style={{ color: "#2DA5A0" }}>
                      ✅ Complete
                    </p>
                  )}
                  {isPartial && (
                    <p className="text-xs mt-2 text-amber-400">
                      Partial ({p.partialLabel})
                    </p>
                  )}
                  {!isComplete && !isPartial && (
                    <p
                      className="text-xs mt-2 cursor-pointer hover:underline"
                      style={{ color: "#B75E18" }}
                    >
                      Order Panel →
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── Category Filter ─── */}
        <section className="space-y-4">
          <p
            className="text-overline font-semibold uppercase tracking-widest"
            style={{ color: "#B75E18" }}
          >
            Your Variants
          </p>

          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? "text-[#2DA5A0]"
                      : "text-secondary hover:text-white"
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: "rgba(45,165,160,0.15)" }
                      : { backgroundColor: "rgba(255,255,255,0.06)" }
                  }
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </section>

        {/* ─── Search ─── */}
        <div
          className="glass-v2 flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <Search className="h-4 w-4 shrink-0 text-secondary" />
          <input
            type="text"
            placeholder="Search by gene name or rs number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder:text-secondary/50 outline-none"
          />
        </div>

        {/* ─── SNP Results ─── */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="glass-v2 rounded-xl p-8 text-center">
              <Dna className="mx-auto mb-3 h-8 w-8 text-secondary/40" />
              <p className="text-sm text-secondary">
                No variants match your search or filter.
              </p>
            </div>
          )}

          {filtered.map((v, idx) => {
            const isOpen = expandedIndex === idx;
            return (
              <div
                key={`${v.rsId}-${idx}`}
                className="glass-v2 rounded-xl overflow-hidden"
                style={{ border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {/* Collapsed row */}
                <button
                  onClick={() => setExpandedIndex(isOpen ? null : idx)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
                >
                  {/* Gene name */}
                  <span className="text-sm font-bold text-white shrink-0">
                    {v.gene}
                  </span>

                  {/* Variant + rs ID */}
                  <span
                    className="font-mono text-xs shrink-0"
                    style={{ color: "rgb(134,239,230)" }}
                  >
                    {v.variant}
                  </span>
                  <span
                    className="font-mono text-xs shrink-0"
                    style={{ color: "rgb(134,239,230)" }}
                  >
                    {v.rsId}
                  </span>

                  {/* Genotype badge */}
                  <span className="font-mono text-xs text-white bg-[#1e2a4a] rounded px-2 py-0.5 shrink-0">
                    {v.genotype}
                  </span>

                  {/* Impact badge */}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${impactColor(v.impact)}`}
                  >
                    {v.impact}
                  </span>

                  {/* Category pill */}
                  <span className="text-xs text-secondary bg-[#1e2a4a] rounded-full px-2 py-0.5 shrink-0 hidden sm:inline-block">
                    {v.category}
                  </span>

                  <span className="ml-auto shrink-0 text-secondary">
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </span>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/[0.04]">
                    {v.insight && (
                      <p className="text-body-sm text-secondary leading-relaxed">
                        {v.insight}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      {v.product && (
                        <button
                          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                          style={{
                            background:
                              "linear-gradient(135deg, #2DA5A0 0%, #1b7d79 100%)",
                          }}
                        >
                          View {v.product}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                        style={{ color: "#2DA5A0" }}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Ask AI About This →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ─── Bottom CTA ─── */}
        <div
          className="glass-v2 glass-v2-insight rounded-xl p-6 text-center space-y-4"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-body-sm text-secondary leading-relaxed">
            🧬 Want deeper insights? Order additional GeneX360 panels to unlock
            more of your genetic blueprint.
          </p>
          <button
            className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{
              background:
                "linear-gradient(135deg, #B75E18 0%, #934a12 100%)",
            }}
          >
            Explore Panels
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
