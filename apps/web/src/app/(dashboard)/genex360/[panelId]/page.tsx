"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Dna,
  Apple,
  Activity,
  Clock,
  FlaskConical,
  Leaf,
  Download,
  Share2,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown,
  Hexagon,
  Brain,
  Sparkles,
  FileText,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

type Genotype = "wildtype" | "heterozygous" | "homozygous"
type CYPStatus = "normal" | "intermediate" | "poor" | "ultra-rapid"

interface PanelMeta {
  name: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
  tabs: { value: string; label: string }[]
}

interface CYPPhenotype {
  enzyme: string
  status: CYPStatus
  diplotype: string
  activityScore: number
}

interface SNPResult {
  gene: string
  rsId: string
  variant: string
  genotype: Genotype
  alleles: string
  phenotype: string
  clinicalImpact: string
}

interface PathwayRisk {
  name: string
  score: number
  description: string
}

interface Recommendation {
  category: string
  items: { supplement: string; dose: string; rationale: string }[]
}

interface DosingInsight {
  text: string
  highlights: { value: string; color: string }[]
}

// ─── Panel Metadata ─────────────────────────────────────────────────────────

const PANEL_META: Record<string, PanelMeta> = {
  "genex-m": {
    name: "GENEX-M\u2122",
    description: "Methylation & Core SNP Panel — Comprehensive analysis of 25+ single nucleotide polymorphisms across methylation, detoxification, neurotransmitter, and metabolic pathways.",
    icon: Dna,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    tabs: [
      { value: "snps", label: "SNP Results" },
      { value: "pathways", label: "Pathway Risk" },
      { value: "summary", label: "Clinical Summary" },
      { value: "recommendations", label: "Recommendations" },
    ],
  },
  "nutrigen-dx": {
    name: "NUTRIGEN-DX\u2122",
    description: "Nutrigenomic Profile — Genetic determinants of vitamin, mineral, macronutrient, and essential fatty acid metabolism.",
    icon: Apple,
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
    tabs: [
      { value: "snps", label: "Nutrient Variants" },
      { value: "pathways", label: "Nutrient Pathways" },
      { value: "summary", label: "Clinical Summary" },
      { value: "recommendations", label: "Recommendations" },
    ],
  },
  "hormone-iq": {
    name: "HormoneIQ\u2122",
    description: "Hormone Metabolism Panel — 40+ hormones and metabolites via DUTCH Complete analysis.",
    icon: Activity,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    tabs: [
      { value: "snps", label: "Hormone Variants" },
      { value: "pathways", label: "Metabolic Pathways" },
      { value: "summary", label: "Clinical Summary" },
      { value: "recommendations", label: "Recommendations" },
    ],
  },
  "epigen-hq": {
    name: "EpigenHQ\u2122",
    description: "Epigenetic Age Analysis — 853,307 CpG sites for biological age determination and aging markers.",
    icon: Clock,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    tabs: [
      { value: "snps", label: "Aging Markers" },
      { value: "pathways", label: "Age Pathways" },
      { value: "summary", label: "Clinical Summary" },
      { value: "recommendations", label: "Recommendations" },
    ],
  },
  "peptide-iq": {
    name: "PeptideIQ\u2122",
    description: "Peptide Response Optimization — BPC-157, Thymosin Beta-4, CJC-1295, and Ipamorelin response profiling.",
    icon: FlaskConical,
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/10",
    tabs: [
      { value: "snps", label: "Response Variants" },
      { value: "pathways", label: "Response Pathways" },
      { value: "summary", label: "Clinical Summary" },
      { value: "recommendations", label: "Recommendations" },
    ],
  },
  "cannabis-iq": {
    name: "CannabisIQ\u2122",
    description: "Cannabinoid Response Profile — Endocannabinoid system genetics including CNR1, FAAH, and MGLL variants.",
    icon: Leaf,
    color: "text-green-400",
    bgColor: "bg-green-400/10",
    tabs: [
      { value: "snps", label: "ECS Variants" },
      { value: "pathways", label: "ECS Pathways" },
      { value: "summary", label: "Clinical Summary" },
      { value: "recommendations", label: "Recommendations" },
    ],
  },
}

// ─── CYP Phenotype Data ─────────────────────────────────────────────────────

const CYP_DATA: CYPPhenotype[] = [
  { enzyme: "CYP2D6", status: "normal", diplotype: "*1/*1", activityScore: 2.0 },
  { enzyme: "CYP2C19", status: "intermediate", diplotype: "*1/*2", activityScore: 1.0 },
  { enzyme: "CYP2C9", status: "poor", diplotype: "*2/*3", activityScore: 0.5 },
  { enzyme: "CYP3A4", status: "normal", diplotype: "*1/*1", activityScore: 2.0 },
  { enzyme: "CYP1A2", status: "ultra-rapid", diplotype: "*1F/*1F", activityScore: 2.5 },
]

function cypStatusConfig(status: CYPStatus) {
  switch (status) {
    case "normal": return { label: "Normal Met.", color: "text-green-400", border: "border-green-400" }
    case "intermediate": return { label: "Intermediate", color: "text-yellow-400", border: "border-yellow-400" }
    case "poor": return { label: "Poor Met.", color: "text-red-400", border: "border-red-400" }
    case "ultra-rapid": return { label: "Ultra-Rapid", color: "text-purple-400", border: "border-purple-400" }
  }
}

// ─── Mock Patients ──────────────────────────────────────────────────────────

const PATIENTS = [
  { id: "pt-001", name: "Maria Gonzalez" },
  { id: "pt-002", name: "James Chen" },
  { id: "pt-003", name: "Aisha Patel" },
  { id: "pt-004", name: "Robert Williams" },
  { id: "pt-005", name: "Elena Vasquez" },
  { id: "pt-006", name: "David Nakamura" },
  { id: "pt-007", name: "Sarah Thompson" },
  { id: "pt-008", name: "Michael O'Brien" },
]

// ─── SNP Data ───────────────────────────────────────────────────────────────

const GENOTYPE_STYLES: Record<Genotype, { bg: string; text: string; label: string }> = {
  wildtype: { bg: "bg-green-400/10", text: "text-green-400", label: "Normal" },
  heterozygous: { bg: "bg-yellow-400/10", text: "text-yellow-400", label: "+/\u2212" },
  homozygous: { bg: "bg-red-400/10", text: "text-red-400", label: "+/+" },
}

const SNP_DATA: SNPResult[] = [
  { gene: "COMT", rsId: "rs4680", variant: "V158M", genotype: "heterozygous", alleles: "A/G", phenotype: "Moderate Activity", clinicalImpact: "Intermediate catecholamine clearance; monitor stress response and estrogen metabolism" },
  { gene: "MTHFR", rsId: "rs1801133", variant: "C677T", genotype: "homozygous", alleles: "T/T", phenotype: "Reduced Activity", clinicalImpact: "~30% enzyme activity; methylfolate supplementation indicated, monitor homocysteine" },
  { gene: "MTHFR", rsId: "rs1801131", variant: "A1298C", genotype: "wildtype", alleles: "A/A", phenotype: "Normal Activity", clinicalImpact: "No clinical intervention required for this variant" },
  { gene: "VDR", rsId: "rs731236", variant: "TaqI", genotype: "heterozygous", alleles: "T/C", phenotype: "Reduced VDR Expression", clinicalImpact: "May require higher vitamin D dosing; target 60-80 ng/mL 25(OH)D" },
  { gene: "APOE", rsId: "rs429358", variant: "\u03b53/\u03b54", genotype: "heterozygous", alleles: "T/C", phenotype: "APOE \u03b54 Carrier", clinicalImpact: "Elevated CVD and Alzheimer's risk; anti-inflammatory diet, omega-3s essential" },
  { gene: "FTO", rsId: "rs9939609", variant: "A allele", genotype: "homozygous", alleles: "A/A", phenotype: "Increased Adiposity Risk", clinicalImpact: "Higher obesity susceptibility; structured exercise and caloric monitoring" },
  { gene: "SOD2", rsId: "rs4880", variant: "A16V", genotype: "heterozygous", alleles: "C/T", phenotype: "Moderate Antioxidant", clinicalImpact: "Support with manganese, CoQ10, and mitochondrial cofactors" },
  { gene: "CBS", rsId: "rs234706", variant: "C699T", genotype: "heterozygous", alleles: "C/T", phenotype: "Upregulated CBS", clinicalImpact: "Potential sulfur sensitivity; monitor ammonia, limit sulfur amino acids" },
  { gene: "MAOA", rsId: "rs6323", variant: "R297R", genotype: "homozygous", alleles: "T/T", phenotype: "High MAOA Activity", clinicalImpact: "Rapid serotonin/dopamine turnover; consider 5-HTP and B6 cofactor support" },
  { gene: "MTRR", rsId: "rs1801394", variant: "A66G", genotype: "homozygous", alleles: "G/G", phenotype: "Reduced MTRR", clinicalImpact: "Impaired B12 recycling; hydroxocobalamin or adenosylcobalamin preferred" },
  { gene: "GPX1", rsId: "rs1050450", variant: "P198L", genotype: "wildtype", alleles: "C/C", phenotype: "Normal GPX", clinicalImpact: "Adequate selenium utilization; no additional intervention needed" },
  { gene: "PEMT", rsId: "rs7946", variant: "G5465A", genotype: "wildtype", alleles: "G/G", phenotype: "Normal PEMT", clinicalImpact: "Adequate endogenous choline production; standard dietary intake sufficient" },
]

// ─── Pathway Risk Scores ────────────────────────────────────────────────────

const PATHWAY_RISKS: PathwayRisk[] = [
  { name: "Methylation Cycle", score: 72, description: "MTHFR C677T homozygous + MTRR homozygous driving high risk" },
  { name: "Neurotransmitter Balance", score: 68, description: "COMT moderate + MAOA fast creating catecholamine imbalance" },
  { name: "Lipid Metabolism", score: 71, description: "APOE \u03b54 carrier and FTO homozygous elevating cardiovascular markers" },
  { name: "Vitamin D Metabolism", score: 58, description: "VDR TaqI heterozygous reducing receptor sensitivity" },
  { name: "Oxidative Stress", score: 52, description: "SOD2 heterozygous increasing mitochondrial ROS vulnerability" },
  { name: "Folate Cycle", score: 65, description: "MTHFR homozygous with MTRR impairment compounding folate deficit" },
  { name: "Transsulfuration", score: 45, description: "CBS upregulation with compensated glutathione synthesis" },
  { name: "Estrogen Metabolism", score: 48, description: "COMT moderate shifting 4-OH pathway ratios" },
  { name: "Detox Phase I", score: 28, description: "CYP1A2 ultra-rapid with intact Phase I enzymes overall" },
  { name: "Detox Phase II", score: 38, description: "Moderate GST/NAT2 efficiency; adequate conjugation capacity" },
  { name: "Histamine Clearance", score: 33, description: "DAO and HNMT within normal functional ranges" },
  { name: "Mitochondrial Function", score: 42, description: "SOD2 heterozygous with preserved Complex I-IV activity" },
]

// ─── Clinical Summary ───────────────────────────────────────────────────────

const CLINICAL_SUMMARY_BLOCKS = [
  { type: "h2" as const, text: "Key Genomic Findings" },
  { type: "p" as const, text: "This patient presents a compound methylation challenge with **MTHFR C677T homozygous** status combined with **MTRR A66G homozygous** variants, resulting in approximately 30% residual methylation efficiency. The impairment is further complicated by **COMT V158M heterozygous** and **MAOA high-activity** genotypes." },
  { type: "h3" as const, text: "Priority Findings" },
  { type: "list" as const, items: [
    "**Methylation-Neurotransmitter Axis**: Severely reduced folate metabolism (MTHFR T/T) with moderate COMT activity requires carefully titrated methylfolate supplementation. Monitor for mood disturbances.",
    "**Cardiovascular-Metabolic Risk**: APOE \u03b53/\u03b54 carrier status combined with FTO rs9939609 homozygous (AA) places this patient in an elevated risk category for dyslipidemia and metabolic syndrome.",
    "**Vitamin D Resistance**: VDR TaqI heterozygous suggests partial vitamin D resistance. Target serum 25(OH)D of 60-80 ng/mL with regular monitoring.",
    "**CYP2C9 Poor Metabolizer**: Significant clinical impact on warfarin, NSAIDs, and sulfonylurea dosing. Reduce doses by 50% and monitor closely.",
  ]},
  { type: "h3" as const, text: "Low-Risk Pathways" },
  { type: "list" as const, items: [
    "CYP2D6 normal metabolizer status (standard drug metabolism)",
    "GPX1 wildtype (normal selenium utilization)",
    "PEMT wildtype (adequate choline synthesis)",
    "Histamine clearance within normal ranges",
  ]},
]

// ─── Recommendations ────────────────────────────────────────────────────────

const RECOMMENDATIONS: Recommendation[] = [
  {
    category: "Methylation Support",
    items: [
      { supplement: "L-Methylfolate (5-MTHF)", dose: "800-1,600 mcg/day", rationale: "MTHFR C677T homozygous; titrate slowly monitoring mood" },
      { supplement: "Hydroxocobalamin (B12)", dose: "2,000 mcg sublingual", rationale: "MTRR A66G homozygous; hydroxo- preferred form" },
      { supplement: "Riboflavin (B2)", dose: "25-50 mg/day", rationale: "MTHFR cofactor; enhances residual enzyme activity" },
      { supplement: "TMG (Betaine)", dose: "500-1,000 mg/day", rationale: "Alternative methylation via BHMT pathway" },
    ],
  },
  {
    category: "Neurotransmitter Balance",
    items: [
      { supplement: "Magnesium Glycinate", dose: "400-600 mg/day", rationale: "COMT cofactor; catecholamine clearance and GABAergic support" },
      { supplement: "Phosphatidylserine", dose: "200 mg/day", rationale: "Cortisol modulation with moderate COMT" },
      { supplement: "5-HTP", dose: "50-100 mg at bedtime", rationale: "MAOA fast variant depleting serotonin; precursor support" },
    ],
  },
  {
    category: "Cardiovascular & Metabolic",
    items: [
      { supplement: "Omega-3 (EPA/DHA)", dose: "2-3 g/day combined", rationale: "APOE \u03b54 carrier; anti-inflammatory lipid support" },
      { supplement: "Berberine", dose: "500 mg 2x/day", rationale: "FTO homozygous; AMPK activation for metabolic support" },
      { supplement: "CoQ10 (Ubiquinol)", dose: "200 mg/day", rationale: "SOD2 heterozygous; mitochondrial electron transport support" },
    ],
  },
  {
    category: "Vitamin D & Bone",
    items: [
      { supplement: "Vitamin D3", dose: "5,000-10,000 IU/day", rationale: "VDR TaqI variant; higher dose to overcome receptor resistance" },
      { supplement: "Vitamin K2 (MK-7)", dose: "200 mcg/day", rationale: "Calcium trafficking support with VDR impairment" },
    ],
  },
  {
    category: "Antioxidant Support",
    items: [
      { supplement: "NAC", dose: "600-1,200 mg/day", rationale: "Glutathione precursor to support oxidative stress defense" },
      { supplement: "Manganese", dose: "2-5 mg/day", rationale: "SOD2 cofactor; mitochondrial superoxide dismutase support" },
      { supplement: "Selenium", dose: "200 mcg/day", rationale: "GPX cofactor to maintain glutathione peroxidase activity" },
    ],
  },
]

// ─── Dosing Insights ────────────────────────────────────────────────────────

const DOSING_INSIGHTS: DosingInsight[] = [
  { text: "Reduce Sertraline by {0} for CYP2C19 Intermediate Metabolizer.", highlights: [{ value: "25-50%", color: "text-yellow-400" }] },
  { text: "Target {0} Vitamin D daily for VDR variant.", highlights: [{ value: "5,000-10,000 IU", color: "text-white" }] },
  { text: "Avoid standard warfarin dosing — CYP2C9 Poor Metabolizer. Reduce by {0}.", highlights: [{ value: "50%", color: "text-red-400" }] },
  { text: "CYP1A2 Ultra-Rapid: caffeine clearance {0}. May require higher theophylline doses.", highlights: [{ value: "accelerated", color: "text-purple-400" }] },
]

// ─── Card base class ────────────────────────────────────────────────────────
const card = "bg-gray-800/50 backdrop-blur-sm border border-[#a78bfa]/15 rounded-xl"

// ─── Helpers ────────────────────────────────────────────────────────────────

function riskColor(score: number) {
  if (score < 30) return { bar: "bg-green-400", text: "text-green-400" }
  if (score <= 60) return { bar: "bg-yellow-400", text: "text-yellow-400" }
  return { bar: "bg-red-400", text: "text-red-400" }
}

function renderBoldText(text: string) {
  return text.split("**").map((part, k) =>
    k % 2 === 1 ? (
      <strong key={k} className="font-semibold text-white">{part}</strong>
    ) : (
      <span key={k}>{part}</span>
    )
  )
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function PanelDetailPage() {
  const params = useParams<{ panelId: string }>()
  const panelId = params.panelId ?? "genex-m"
  const panel = PANEL_META[panelId] ?? PANEL_META["genex-m"]
  const Icon = panel!.icon

  const [selectedPatient, setSelectedPatient] = useState(PATIENTS[0]!.id)
  const [activeTab, setActiveTab] = useState(panel!.tabs[0]!.value)

  const wildtypeCount = SNP_DATA.filter((s) => s.genotype === "wildtype").length
  const variantCount = SNP_DATA.filter((s) => s.genotype !== "wildtype").length

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 min-h-screen bg-[#111827] text-slate-200">
      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dna className="h-5 w-5 text-[#a78bfa]" />
            <h1 className="text-xl font-black tracking-tighter text-[#a78bfa]">GeneX360</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                className="appearance-none bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-[#a78bfa]/40 cursor-pointer"
              >
                {PATIENTS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a78bfa] to-purple-600 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-white">
              DR
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6">
        {/* ── SIDEBAR NAV ──────────────────────────────────── */}
        <aside className="hidden lg:block w-56 shrink-0 space-y-4">
          <nav className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
            {Object.entries(PANEL_META).slice(0, 3).map(([id, meta]) => {
              const NavIcon = meta.icon
              const isActive = id === panelId
              return (
                <Link
                  key={id}
                  href={`/genex360/${id}`}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#a78bfa]/10 text-[#a78bfa] border-l-4 border-[#a78bfa]"
                      : "text-slate-500 hover:bg-slate-800 border-l-4 border-transparent"
                  }`}
                >
                  <NavIcon className="h-4 w-4" />
                  <span className="font-bold text-xs uppercase">{meta.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Back to GeneX360 */}
          <Link href="/genex360" className="flex items-center gap-2 text-xs text-slate-500 hover:text-[#a78bfa] transition-colors px-2">
            <ArrowLeft className="h-3 w-3" /> All Panels
          </Link>

          {/* PeptideIQ Widget */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-2 text-[#a78bfa] mb-2">
              <Brain className="h-3.5 w-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">PeptideIQ</span>
            </div>
            <p className="text-[10px] text-slate-500">Genetic mapping for longevity peptide response optimization.</p>
          </div>
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────── */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Mobile Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {panel!.tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  activeTab === tab.value
                    ? "bg-purple-600 text-white"
                    : "bg-slate-900 border border-slate-800 text-slate-400"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Desktop Tabs */}
          <div className="hidden lg:flex gap-2 pb-1">
            {panel!.tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  activeTab === tab.value
                    ? "bg-[#a78bfa] text-white shadow-[0_0_12px_rgba(167,139,250,0.3)]"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── CYP PHENOTYPES ─────────────────────────────── */}
          {activeTab === "snps" && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {CYP_DATA.map((cyp) => {
                  const config = cypStatusConfig(cyp.status)
                  return (
                    <div key={cyp.enzyme} className={`bg-slate-900/50 border-l-4 ${config.border} p-3 rounded-r-lg`}>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">{cyp.enzyme}</div>
                      <div className={`${config.color} text-xs font-black uppercase truncate mt-0.5`}>{config.label}</div>
                      <div className="flex justify-between items-end mt-2">
                        <span className="text-[10px] font-mono text-slate-500">{cyp.diplotype}</span>
                        <span className="text-lg font-black leading-none text-white">{cyp.activityScore.toFixed(1)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Variants Table */}
              <div className={`${card} overflow-hidden`}>
                <div className="p-4 border-b border-slate-800 flex flex-wrap justify-between items-center gap-3">
                  <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                    <Dna className="h-4 w-4 text-[#a78bfa]" /> Genomic Variants
                  </h3>
                  <div className="flex gap-2">
                    <span className="bg-green-400/10 text-green-400 text-[10px] font-bold px-2.5 py-0.5 rounded border border-green-400/20">
                      {wildtypeCount} NORMAL
                    </span>
                    <span className="bg-yellow-400/10 text-yellow-400 text-[10px] font-bold px-2.5 py-0.5 rounded border border-yellow-400/20">
                      {variantCount} VARIANTS
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] tracking-wider">
                      <tr className="border-b border-slate-800">
                        <th className="px-4 py-3 font-semibold">Gene</th>
                        <th className="px-4 py-3 font-semibold">Marker</th>
                        <th className="px-4 py-3 font-semibold">Type</th>
                        <th className="px-4 py-3 font-semibold">Significance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {SNP_DATA.map((snp, idx) => {
                        const style = GENOTYPE_STYLES[snp.genotype]
                        return (
                          <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-4">
                              <span className="bg-slate-800 text-emerald-400 font-black px-2.5 py-1 rounded text-xs">{snp.gene}</span>
                            </td>
                            <td className="px-4 py-4 text-slate-400 font-mono text-[11px]">{snp.rsId}</td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}>
                                {snp.alleles}
                                <span className="text-[9px] opacity-70">{style.label}</span>
                              </span>
                            </td>
                            <td className={`px-4 py-4 font-semibold text-xs ${
                              snp.genotype === "homozygous" ? "text-red-400" :
                              snp.genotype === "heterozygous" ? "text-yellow-400" :
                              "text-green-400"
                            }`}>
                              {snp.phenotype}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── PATHWAY RISK ───────────────────────────────── */}
          {activeTab === "pathways" && (
            <div className="space-y-4">
              <div className={`${card} p-5`}>
                <h3 className="font-bold text-sm flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-[#a78bfa]" /> Pathway Risk Scores
                </h3>
                <p className="text-[10px] text-slate-500">
                  Aggregate risk scoring across 12 metabolic pathways. Scores: 0-29 low, 30-60 moderate, 61-100 elevated.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {PATHWAY_RISKS.map((pathway) => {
                  const colors = riskColor(pathway.score)
                  return (
                    <div key={pathway.name} className={`${card} p-4 space-y-3`}>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-white">{pathway.name}</h4>
                        <span className={`text-lg font-black ${colors.text}`}>{pathway.score}</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${colors.bar}`}
                          style={{ width: `${pathway.score}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">{pathway.description}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── CLINICAL SUMMARY ───────────────────────────── */}
          {activeTab === "summary" && (
            <div className={`${card} p-6 space-y-5`}>
              {/* Report status */}
              <div className="flex items-start gap-2 p-3 bg-green-400/5 border border-green-400/20 rounded-xl text-xs text-green-400">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="font-medium">Report generated on March 10, 2026 — reviewed by laboratory director.</span>
              </div>

              {/* AI badge */}
              <div className="flex items-center gap-2 text-[10px] text-[#a78bfa]">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="font-bold uppercase tracking-wider">AI-Generated Clinical Summary</span>
              </div>

              <div className="border-t border-slate-800 pt-5 space-y-4 text-sm text-slate-300 leading-relaxed">
                {CLINICAL_SUMMARY_BLOCKS.map((block, i) => {
                  if (block.type === "h2") return <h2 key={i} className="text-lg font-bold text-white mt-2">{block.text}</h2>
                  if (block.type === "h3") return <h3 key={i} className="text-base font-semibold text-slate-100 mt-4">{block.text}</h3>
                  if (block.type === "p") return <p key={i}>{renderBoldText(block.text!)}</p>
                  if (block.type === "list") {
                    return (
                      <ul key={i} className="space-y-2 pl-5 list-disc marker:text-slate-700">
                        {block.items!.map((item, j) => (
                          <li key={j} className="text-slate-300">{renderBoldText(item)}</li>
                        ))}
                      </ul>
                    )
                  }
                  return null
                })}
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-2 p-3 bg-yellow-400/5 border border-yellow-400/20 rounded-xl text-xs text-yellow-400 mt-4">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  <strong>Disclaimer:</strong> Genomic results should be interpreted in context of the patient&apos;s complete clinical picture, family history, and current laboratory values. This report does not constitute a diagnosis.
                </span>
              </div>
            </div>
          )}

          {/* ── RECOMMENDATIONS ─────────────────────────────── */}
          {activeTab === "recommendations" && (
            <div className="space-y-4">
              <div className={`${card} p-5`}>
                <h3 className="font-bold text-sm flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-[#a78bfa]" /> Genotype-Based Recommendations
                </h3>
                <p className="text-[10px] text-slate-500">
                  Targeted supplement and lifestyle recommendations derived from SNP analysis. All recommendations should be clinically validated.
                </p>
              </div>

              {RECOMMENDATIONS.map((cat) => (
                <div key={cat.category} className={`${card} overflow-hidden`}>
                  <div className="px-5 py-3 border-b border-slate-800/60">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">{cat.category}</h4>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950/50 text-[10px] text-slate-500 uppercase tracking-wider">
                      <tr className="border-b border-slate-800/40">
                        <th className="px-5 py-2.5 font-semibold">Supplement</th>
                        <th className="px-5 py-2.5 font-semibold">Dose</th>
                        <th className="px-5 py-2.5 font-semibold">Rationale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {cat.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                          <td className="px-5 py-3 font-medium text-white">{item.supplement}</td>
                          <td className="px-5 py-3">
                            <span className="bg-[#a78bfa]/10 text-[#a78bfa] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#a78bfa]/20">
                              {item.dose}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-400">{item.rationale}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              <div className="flex items-start gap-2 p-3 bg-yellow-400/5 border border-yellow-400/20 rounded-xl text-xs text-yellow-400">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  <strong>Clinical Note:</strong> Consider drug-nutrient interactions, current medications, renal/hepatic function, and patient preferences before implementing. Periodic reassessment of biomarkers is recommended.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ────────────────────────────────── */}
        <aside className="lg:w-72 space-y-6 shrink-0">
          {/* Dosing Insights */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
            <h4 className="text-[#a78bfa] font-black text-xs uppercase mb-4 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" /> Dosing Insights
            </h4>
            <div className="space-y-3">
              {DOSING_INSIGHTS.map((insight, i) => {
                const parts = insight.text.split("{0}")
                return (
                  <div key={i} className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <p className="text-[11px] text-slate-400 italic leading-relaxed">
                      &ldquo;{parts[0]}
                      <span className={`font-bold ${insight.highlights[0]!.color}`}>
                        {insight.highlights[0]!.value}
                      </span>
                      {parts[1]}&rdquo;
                    </p>
                  </div>
                )
              })}
            </div>
            <button className="w-full mt-4 py-2.5 bg-purple-600/20 border border-purple-500/40 text-[#a78bfa] rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-purple-600/30 transition-all">
              Export Protocol
            </button>
          </div>

          {/* Genomic Signature */}
          <div className="bg-gradient-to-br from-purple-900/10 to-slate-950 border border-slate-800 rounded-2xl p-6 text-center">
            <Hexagon className="h-10 w-10 text-purple-500 mx-auto animate-pulse" />
            <p className="text-[9px] uppercase font-black text-slate-600 mt-3 tracking-widest">Genomic Signature</p>
            <div className="flex justify-center items-end gap-1 mt-4 h-8">
              <div className="w-1 h-3 bg-purple-500/40 rounded-full" />
              <div className="w-1 h-5 bg-purple-500/50 rounded-full" />
              <div className="w-1 h-8 bg-purple-500 rounded-full" />
              <div className="w-1 h-6 bg-purple-500/60 rounded-full" />
              <div className="w-1 h-4 bg-purple-500/40 rounded-full" />
              <div className="w-1 h-7 bg-purple-500/70 rounded-full" />
              <div className="w-1 h-5 bg-purple-500/50 rounded-full" />
              <div className="w-1 h-3 bg-purple-500/30 rounded-full" />
            </div>
            <p className="text-[9px] text-slate-600 mt-3 font-mono">SIG-{panelId.toUpperCase()}-2026</p>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button className="w-full flex justify-between items-center p-3 bg-slate-900 border border-slate-800 hover:border-[#a78bfa]/30 rounded-xl text-[11px] font-semibold transition-colors">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-red-400" /> PDF Summary
              </span>
              <Download className="h-3.5 w-3.5 text-slate-500" />
            </button>
            <button className="w-full flex justify-between items-center p-3 bg-slate-900 border border-slate-800 hover:border-[#a78bfa]/30 rounded-xl text-[11px] font-semibold transition-colors">
              <span className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-blue-400" /> Share with Patient
              </span>
              <ArrowLeft className="h-3.5 w-3.5 text-slate-500 rotate-180" />
            </button>
          </div>
        </aside>
      </div>

      {/* ── MOBILE NAV ─────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800 flex justify-around p-3 lg:hidden z-50">
        <Link href="/genex360" className="flex flex-col items-center text-[#a78bfa]">
          <Dna className="h-5 w-5" />
          <span className="text-[9px] font-bold mt-0.5">PANELS</span>
        </Link>
        <button className="flex flex-col items-center text-slate-500">
          <Info className="h-5 w-5" />
          <span className="text-[9px] font-bold mt-0.5">INFO</span>
        </button>
        <button className="flex flex-col items-center text-slate-500">
          <Download className="h-5 w-5" />
          <span className="text-[9px] font-bold mt-0.5">EXPORT</span>
        </button>
      </nav>
    </div>
  )
}
