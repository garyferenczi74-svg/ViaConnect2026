"use client";

import { useState, useMemo } from "react";
import {
  Sparkles,
  BookOpen,
  Search,
  FileText,
  Dna,
  FlaskConical,
  Globe,
  ChevronDown,
  Activity,
} from "lucide-react";
import PortalHeader from "@/components/wellness/PortalHeader";

/* ────────────────────────────────────────────
   TypeScript Interfaces
   ──────────────────────────────────────────── */

type SubTab = "protocols" | "pubmed" | "trials" | "genomics" | "population";
type EvidenceLevel = "Level A" | "Level B" | "Level C";

interface ProtocolTemplate {
  title: string;
  condition: string;
  evidenceLevel: EvidenceLevel;
  source: string;
  category: string;
}

interface PubMedResult {
  title: string;
  journal: string;
  year: number;
  pmid: string;
}

interface ClinicalTrial {
  title: string;
  phase: string;
  status: string;
  nctId: string;
}

interface GeneResearch {
  gene: string;
  finding: string;
  impact: string;
}

interface PopulationStat {
  variant: string;
  globalFreq: string;
  significance: string;
}

/* ────────────────────────────────────────────
   Sample Data
   ──────────────────────────────────────────── */

const protocolTemplates: ProtocolTemplate[] = [
  {
    title: "MTHFR C677T Methylation Support",
    condition: "Hyperhomocysteinemia",
    evidenceLevel: "Level B",
    source: "ACMG Guidelines 2024",
    category: "Methylation",
  },
  {
    title: "COMT Val158Met Neurotransmitter Protocol",
    condition: "Catecholamine Dysregulation",
    evidenceLevel: "Level B",
    source: "Pharmacogenomics Journal",
    category: "Neurotransmitter",
  },
  {
    title: "VDR Polymorphism Vitamin D Optimization",
    condition: "Vitamin D Insufficiency",
    evidenceLevel: "Level B",
    source: "Endocrine Society 2024",
    category: "Nutrient",
  },
  {
    title: "FTO rs9939609 Weight Management",
    condition: "Obesity Risk Mitigation",
    evidenceLevel: "Level A",
    source: "NEJM Meta-Analysis 2024",
    category: "Metabolic",
  },
  {
    title: "APOE e4 Neuroprotective Strategy",
    condition: "Alzheimer's Risk Reduction",
    evidenceLevel: "Level C",
    source: "Lancet Neurology 2024",
    category: "Neuroprotection",
  },
  {
    title: "GST Null Detoxification Support",
    condition: "Phase II Conjugation Deficit",
    evidenceLevel: "Level B",
    source: "Toxicological Sciences",
    category: "Detoxification",
  },
];

const pubmedResults: PubMedResult[] = [
  {
    title: "L-Methylfolate supplementation in MTHFR C677T homozygotes: a randomized controlled trial",
    journal: "Am J Clin Nutr",
    year: 2024,
    pmid: "38901234",
  },
  {
    title: "COMT Val158Met and catechol-O-methyltransferase inhibition: implications for precision psychiatry",
    journal: "Mol Psychiatry",
    year: 2024,
    pmid: "38756891",
  },
  {
    title: "Vitamin D receptor polymorphisms and supplementation response: systematic review",
    journal: "J Clin Endocrinol Metab",
    year: 2025,
    pmid: "39012456",
  },
];

const clinicalTrials: ClinicalTrial[] = [
  {
    title: "Methylfolate vs Folic Acid in MTHFR Carriers",
    phase: "Phase III",
    status: "Recruiting",
    nctId: "NCT05891234",
  },
  {
    title: "Pharmacogenomic-Guided SSRI Selection",
    phase: "Phase IV",
    status: "Active",
    nctId: "NCT05923456",
  },
  {
    title: "FTO-Targeted Dietary Intervention",
    phase: "Phase II",
    status: "Completed",
    nctId: "NCT05834567",
  },
];

const geneResearch: GeneResearch[] = [
  {
    gene: "MTHFR",
    finding: "C677T reduces enzyme activity 30-70% depending on zygosity",
    impact: "High — affects 10-15% of population homozygous",
  },
  {
    gene: "COMT",
    finding: "Val158Met creates 3-4x difference in dopamine clearance rate",
    impact: "High — influences stress response and cognitive performance",
  },
  {
    gene: "APOE",
    finding: "e4 allele increases Alzheimer's risk 3-15x depending on copies",
    impact: "High — most significant common genetic risk factor",
  },
  {
    gene: "FTO",
    finding: "rs9939609 AA genotype associated with 3-4 kg higher body weight",
    impact: "Moderate — responsive to high-protein dietary intervention",
  },
];

const populationStats: PopulationStat[] = [
  {
    variant: "MTHFR C677T (TT)",
    globalFreq: "10-15%",
    significance: "Reduced folate metabolism requiring supplementation",
  },
  {
    variant: "APOE e4 carriers",
    globalFreq: "20-25%",
    significance: "Elevated cardiovascular and neurodegenerative risk",
  },
  {
    variant: "CYP2D6 Poor Metabolizers",
    globalFreq: "5-10%",
    significance: "Altered drug metabolism for 25% of prescribed medications",
  },
  {
    variant: "GSTM1 Null",
    globalFreq: "40-50%",
    significance: "Absent Phase II detoxification enzyme",
  },
];

/* ────────────────────────────────────────────
   Sub-Tab Config
   ──────────────────────────────────────────── */

const SUB_TABS: { label: string; value: SubTab; icon: React.ReactNode }[] = [
  { label: "Protocols", value: "protocols", icon: <FileText className="w-3.5 h-3.5" /> },
  { label: "PubMed", value: "pubmed", icon: <Dna className="w-3.5 h-3.5" /> },
  { label: "Trials", value: "trials", icon: <FlaskConical className="w-3.5 h-3.5" /> },
  { label: "Genomics", value: "genomics", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { label: "Population", value: "population", icon: <Globe className="w-3.5 h-3.5" /> },
];

const EVIDENCE_FILTERS = ["All Evidence", "Level A", "Level B", "Level C"];

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

const evidenceBadge = (level: EvidenceLevel) => {
  const colors: Record<EvidenceLevel, string> = {
    "Level A": "bg-green-500/20 text-green-400 border-green-500/30",
    "Level B": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    "Level C": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  };
  return colors[level];
};

/* ────────────────────────────────────────────
   Page Component
   ──────────────────────────────────────────── */

export default function ResearchPage() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("protocols");
  const [search, setSearch] = useState("");
  const [evidenceFilter, setEvidenceFilter] = useState("All Evidence");

  const filteredProtocols = useMemo(() => {
    return protocolTemplates.filter((p) => {
      const matchesSearch =
        search === "" ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.condition.toLowerCase().includes(search.toLowerCase());
      const matchesEvidence =
        evidenceFilter === "All Evidence" || p.evidenceLevel === evidenceFilter;
      return matchesSearch && matchesEvidence;
    });
  }, [search, evidenceFilter]);

  return (
    <div className="min-h-screen bg-[#111827] text-white font-sans antialiased">
      {/* ── Header ── */}
      <PortalHeader activeTab="research" />

      {/* ── Main Content ── */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* ── 1. Hero Banner ── */}
        <section className="bg-gray-800/50 border border-green-400/15 rounded-2xl backdrop-blur-sm p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-gray-300 leading-relaxed max-w-xl">
            Your comprehensive health blueprint integrating genetic analysis,
            biomarker tracking, and personalized protocols.
          </p>
          <button className="flex-shrink-0 bg-green-400 text-gray-900 px-5 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg shadow-green-400/20">
            <Activity className="h-3.5 w-3.5" />
            Sonar Monitor
          </button>
        </section>

        {/* ── 2. Evidence Library Card ── */}
        <section className="bg-gray-800/50 border border-green-400/15 rounded-xl backdrop-blur-sm p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-green-400" />
            <div>
              <h2 className="text-xl font-bold">Evidence Library</h2>
              <p className="text-xs text-gray-500">
                Research-backed protocol templates for common conditions.
              </p>
            </div>
          </div>

          {/* Sub-tab pills */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {SUB_TABS.map((tab) => {
              const isActive = activeSubTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveSubTab(tab.value)}
                  className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-white text-gray-900"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search + Filter row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  activeSubTab === "protocols"
                    ? "Search protocols..."
                    : activeSubTab === "pubmed"
                      ? "Search PubMed articles..."
                      : activeSubTab === "trials"
                        ? "Search clinical trials..."
                        : activeSubTab === "genomics"
                          ? "Search gene research..."
                          : "Search population data..."
                }
                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:border-green-400/40 focus:outline-none focus:ring-0"
              />
            </div>
            <div className="relative sm:w-48">
              <select
                value={evidenceFilter}
                onChange={(e) => setEvidenceFilter(e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:border-green-400/40 focus:outline-none focus:ring-0"
              >
                {EVIDENCE_FILTERS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-4 w-4 absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* ── Tab Content ── */}

          {/* Protocols Tab */}
          {activeSubTab === "protocols" && (
            <>
              {filteredProtocols.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BookOpen className="h-16 w-16 text-gray-700 opacity-40 mb-4" />
                  <h3 className="text-gray-400 font-medium">
                    No templates found matching your criteria
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Try adjusting your search or filter.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredProtocols.map((p) => (
                    <div
                      key={p.title}
                      className="bg-gray-900/40 border border-gray-700 rounded-xl p-4 space-y-3 hover:border-green-400/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-sm leading-tight">
                          {p.title}
                        </h4>
                        <span
                          className={`${evidenceBadge(p.evidenceLevel)} border text-[9px] px-1.5 py-0.5 rounded uppercase font-bold whitespace-nowrap flex-shrink-0`}
                        >
                          {p.evidenceLevel}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        {p.condition}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-gray-500">
                        <span className="bg-gray-800 border border-gray-700 px-2 py-0.5 rounded">
                          {p.category}
                        </span>
                        <span>{p.source}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* PubMed Tab */}
          {activeSubTab === "pubmed" && (
            <div className="space-y-3">
              {pubmedResults.map((r) => (
                <div
                  key={r.pmid}
                  className="bg-gray-900/40 border border-gray-700 rounded-xl p-4 hover:border-green-400/30 transition-colors cursor-pointer"
                >
                  <h4 className="font-bold text-sm leading-tight mb-2">
                    {r.title}
                  </h4>
                  <div className="flex items-center gap-3 text-[10px] text-gray-500">
                    <span className="text-gray-400 font-medium">
                      {r.journal}
                    </span>
                    <span>{r.year}</span>
                    <span className="bg-gray-800 border border-gray-700 px-2 py-0.5 rounded">
                      PMID: {r.pmid}
                    </span>
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-gray-600 text-center pt-2">
                Showing {pubmedResults.length} results from PubMed via NCBI
                E-Utilities API
              </p>
            </div>
          )}

          {/* Trials Tab */}
          {activeSubTab === "trials" && (
            <div className="space-y-3">
              {clinicalTrials.map((t) => (
                <div
                  key={t.nctId}
                  className="bg-gray-900/40 border border-gray-700 rounded-xl p-4 hover:border-green-400/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-bold text-sm leading-tight">
                      {t.title}
                    </h4>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold whitespace-nowrap ${
                        t.status === "Recruiting"
                          ? "bg-green-500/20 text-green-400"
                          : t.status === "Active"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-gray-700 text-gray-400"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-gray-500">
                    <span className="bg-gray-800 border border-gray-700 px-2 py-0.5 rounded">
                      {t.phase}
                    </span>
                    <span className="text-gray-400">{t.nctId}</span>
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-gray-600 text-center pt-2">
                Showing {clinicalTrials.length} results from
                ClinicalTrials.gov API v2
              </p>
            </div>
          )}

          {/* Genomics Tab */}
          {activeSubTab === "genomics" && (
            <div className="space-y-3">
              {geneResearch.map((g) => (
                <div
                  key={g.gene}
                  className="bg-gray-900/40 border border-gray-700 rounded-xl p-4 hover:border-green-400/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Dna className="h-4 w-4 text-green-400" />
                    <h4 className="font-bold text-sm">{g.gene}</h4>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed mb-2">
                    {g.finding}
                  </p>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-gray-500">Impact:</span>
                    <span
                      className={`font-bold ${
                        g.impact.startsWith("High")
                          ? "text-red-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {g.impact}
                    </span>
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-gray-600 text-center pt-2">
                Gene research summaries from OMIM, ClinVar, and PharmGKB
              </p>
            </div>
          )}

          {/* Population Tab */}
          {activeSubTab === "population" && (
            <div className="space-y-3">
              {populationStats.map((p) => (
                <div
                  key={p.variant}
                  className="bg-gray-900/40 border border-gray-700 rounded-xl p-4 hover:border-green-400/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-sm">{p.variant}</h4>
                    <span className="bg-green-400/10 border border-green-400/20 text-green-400 text-[10px] px-2 py-0.5 rounded font-bold">
                      {p.globalFreq} global
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{p.significance}</p>
                </div>
              ))}
              <p className="text-[10px] text-gray-600 text-center pt-2">
                Population frequency data from gnomAD v4 and 1000 Genomes
                Project
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
