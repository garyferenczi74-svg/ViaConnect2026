"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Dna,
  Download,
  Share2,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Hexagon,
  Sparkles,
  FileText,
  ExternalLink,
  Beaker,
  Leaf,
  ShieldCheck,
  Zap,
  ChevronRight,
  HeartPulse,
  Brain,
  Shield,
  Activity,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

type Genotype = "wildtype" | "heterozygous" | "homozygous"
type CYPStatus = "normal" | "intermediate" | "poor" | "ultra-rapid"
type RiskLevel = "normal" | "moderate" | "high"

interface PanelTab {
  id: string
  name: string
  price: string
  icon: React.ElementType
}

interface CYPEnzyme {
  enzyme: string
  status: CYPStatus
  diplotype: string
  activityScore: number
  maxScore: number
  implications: string[]
}

interface SNPVariant {
  gene: string
  variant: string
  rsId: string
  genotype: Genotype
  alleles: string
  significance: string
  riskLevel: RiskLevel
  farmceuticaProduct: string | null
  farmceuticaLink: string | null
}

interface DosingRec {
  id: string
  enzyme: string
  status: string
  recommendation: string
  supplement: string
  adjustment: string
  evidence: string
  evidenceUrl: string
}

interface PathwayRisk {
  name: string
  score: number
  description: string
}

interface RecommendationCategory {
  category: string
  items: { supplement: string; dose: string; rationale: string }[]
}

// ─── Panel Tabs ─────────────────────────────────────────────────────────────

const PANEL_TABS: PanelTab[] = [
  { id: "genex-m", name: "GENEX-M", price: "$288.88", icon: Dna },
  { id: "genex-c", name: "GENEX-C", price: "$348.88", icon: HeartPulse },
  { id: "genex-n", name: "GENEX-N", price: "$318.88", icon: Brain },
  { id: "genex-i", name: "GENEX-I", price: "$298.88", icon: Shield },
  { id: "genex-h", name: "GENEX-H", price: "$328.88", icon: Activity },
  { id: "complete", name: "GeneX360 Complete", price: "$988.88", icon: Hexagon },
]

// ─── Mock Patient ───────────────────────────────────────────────────────────

const PATIENTS = [
  { id: "pt-001", name: "Maria Gonzalez", mrn: "MRN-2026-8211" },
  { id: "pt-002", name: "James Chen", mrn: "MRN-2026-9928" },
  { id: "pt-003", name: "Aisha Patel", mrn: "MRN-2026-4503" },
  { id: "pt-004", name: "Robert Williams", mrn: "MRN-2026-7214" },
]

// ─── CYP450 Data ────────────────────────────────────────────────────────────

const CYP_DATA: CYPEnzyme[] = [
  {
    enzyme: "CYP2D6",
    status: "normal",
    diplotype: "*1/*1",
    activityScore: 2.0,
    maxScore: 3.0,
    implications: [
      "Standard dosing for SSRIs (fluoxetine, paroxetine)",
      "Normal codeine → morphine conversion",
      "Standard tamoxifen → endoxifen metabolism",
    ],
  },
  {
    enzyme: "CYP2C19",
    status: "poor",
    diplotype: "*2/*2",
    activityScore: 0.0,
    maxScore: 3.0,
    implications: [
      "Clopidogrel: significantly reduced activation — consider prasugrel",
      "PPIs: increased exposure — reduce omeprazole by 50%",
      "SSRIs: increased levels of citalopram/escitalopram — reduce dose",
      "Voriconazole: 4x higher exposure — use alternative antifungal",
    ],
  },
  {
    enzyme: "CYP2C9",
    status: "intermediate",
    diplotype: "*1/*3",
    activityScore: 1.0,
    maxScore: 2.0,
    implications: [
      "Warfarin: reduce initial dose by 25% — monitor INR closely",
      "NSAIDs: celecoxib exposure increased — use lower doses",
      "Sulfonylureas: glipizide clearance reduced — monitor glucose",
    ],
  },
  {
    enzyme: "CYP3A4",
    status: "normal",
    diplotype: "*1/*1",
    activityScore: 2.0,
    maxScore: 3.0,
    implications: [
      "Standard statin metabolism (atorvastatin, simvastatin)",
      "Normal benzodiazepine clearance",
      "Standard immunosuppressant dosing (tacrolimus, cyclosporine)",
    ],
  },
  {
    enzyme: "CYP1A2",
    status: "ultra-rapid",
    diplotype: "*1F/*1F",
    activityScore: 2.5,
    maxScore: 3.0,
    implications: [
      "Caffeine: rapid clearance — higher doses tolerated",
      "Theophylline: may need higher doses for therapeutic effect",
      "Clozapine: accelerated metabolism — monitor therapeutic levels",
      "Melatonin: rapid clearance — may need sustained-release form",
    ],
  },
]

function cypStatusConfig(status: CYPStatus) {
  switch (status) {
    case "normal":
      return { label: "Normal Metabolizer", short: "Normal", color: "text-[#4ade80]", border: "border-[#4ade80]", bg: "bg-[#4ade80]/5", barColor: "bg-[#4ade80]" }
    case "intermediate":
      return { label: "Intermediate Metabolizer", short: "Intermediate", color: "text-[#fbbf24]", border: "border-[#fbbf24]", bg: "bg-[#fbbf24]/5", barColor: "bg-[#fbbf24]" }
    case "poor":
      return { label: "Poor Metabolizer", short: "Poor", color: "text-[#f87171]", border: "border-[#f87171]", bg: "bg-[#f87171]/5", barColor: "bg-[#f87171]" }
    case "ultra-rapid":
      return { label: "Ultra-Rapid Metabolizer", short: "Ultra-Rapid", color: "text-[#a78bfa]", border: "border-[#a78bfa]", bg: "bg-[#a78bfa]/5", barColor: "bg-[#a78bfa]" }
  }
}

// ─── SNP Data ───────────────────────────────────────────────────────────────

const SNP_DATA: SNPVariant[] = [
  { gene: "MTHFR", variant: "C677T", rsId: "rs1801133", genotype: "homozygous", alleles: "T/T", significance: "Severely reduced folate metabolism (~30% activity). Methylfolate supplementation critical.", riskLevel: "high", farmceuticaProduct: "MTHFR+ Complete", farmceuticaLink: "#" },
  { gene: "MTHFR", variant: "A1298C", rsId: "rs1801131", genotype: "wildtype", alleles: "A/A", significance: "Normal enzyme function. No intervention required.", riskLevel: "normal", farmceuticaProduct: null, farmceuticaLink: null },
  { gene: "COMT", variant: "Val158Met", rsId: "rs4680", genotype: "heterozygous", alleles: "A/G", significance: "Intermediate catecholamine clearance. Monitor stress response.", riskLevel: "moderate", farmceuticaProduct: "COMT Balance", farmceuticaLink: "#" },
  { gene: "MAOA", variant: "R297R", rsId: "rs6323", genotype: "homozygous", alleles: "T/T", significance: "High MAOA activity — rapid serotonin/dopamine turnover.", riskLevel: "high", farmceuticaProduct: "NeuroCalm Pro", farmceuticaLink: "#" },
  { gene: "VDR", variant: "BsmI", rsId: "rs1544410", genotype: "homozygous", alleles: "A/A", significance: "Decreased calcium absorption. Increased osteoporosis risk.", riskLevel: "high", farmceuticaProduct: "VDR Optimize", farmceuticaLink: "#" },
  { gene: "VDR", variant: "TaqI", rsId: "rs731236", genotype: "heterozygous", alleles: "T/C", significance: "Reduced VDR expression. Target 60-80 ng/mL 25(OH)D.", riskLevel: "moderate", farmceuticaProduct: "VDR Optimize", farmceuticaLink: "#" },
  { gene: "APOE", variant: "\u03b53/\u03b54", rsId: "rs429358", genotype: "heterozygous", alleles: "T/C", significance: "Elevated CVD and Alzheimer's risk. Anti-inflammatory diet essential.", riskLevel: "high", farmceuticaProduct: "CardioGenex", farmceuticaLink: "#" },
  { gene: "FTO", variant: "A allele", rsId: "rs9939609", genotype: "homozygous", alleles: "A/A", significance: "Increased adiposity risk. Structured exercise critical.", riskLevel: "high", farmceuticaProduct: null, farmceuticaLink: null },
  { gene: "SOD2", variant: "A16V", rsId: "rs4880", genotype: "heterozygous", alleles: "C/T", significance: "Moderate mitochondrial antioxidant capacity.", riskLevel: "moderate", farmceuticaProduct: "MitoGuard", farmceuticaLink: "#" },
  { gene: "CBS", variant: "C699T", rsId: "rs234706", genotype: "heterozygous", alleles: "C/T", significance: "Upregulated CBS. Potential sulfur sensitivity.", riskLevel: "moderate", farmceuticaProduct: null, farmceuticaLink: null },
  { gene: "MTRR", variant: "A66G", rsId: "rs1801394", genotype: "homozygous", alleles: "G/G", significance: "Impaired B12 recycling. Hydroxocobalamin preferred.", riskLevel: "high", farmceuticaProduct: "B12 Methylation+", farmceuticaLink: "#" },
  { gene: "GPX1", variant: "P198L", rsId: "rs1050450", genotype: "wildtype", alleles: "C/C", significance: "Normal glutathione peroxidase. No intervention needed.", riskLevel: "normal", farmceuticaProduct: null, farmceuticaLink: null },
  { gene: "PEMT", variant: "G5465A", rsId: "rs7946", genotype: "wildtype", alleles: "G/G", significance: "Adequate choline synthesis. Standard dietary intake sufficient.", riskLevel: "normal", farmceuticaProduct: null, farmceuticaLink: null },
]

// ─── Dosing Recommendations ─────────────────────────────────────────────────

const DOSING_RECS: DosingRec[] = [
  {
    id: "d1",
    enzyme: "CYP2C19",
    status: "Poor Metabolizer",
    recommendation: "Reduce clopidogrel alternative or increase monitoring",
    supplement: "5-MTHF (Methylfolate)",
    adjustment: "Reduce dosage by 50% — impaired hepatic conversion",
    evidence: "CPIC Guideline — CYP2C19 and Clopidogrel",
    evidenceUrl: "#",
  },
  {
    id: "d2",
    enzyme: "CYP2C9",
    status: "Intermediate Metabolizer",
    recommendation: "Reduce NSAID and sulfonylurea doses",
    supplement: "Curcumin (CYP2C9 substrate)",
    adjustment: "Reduce dosage by 25% — slower clearance expected",
    evidence: "CPIC Guideline — CYP2C9 and NSAIDs",
    evidenceUrl: "#",
  },
  {
    id: "d3",
    enzyme: "CYP1A2",
    status: "Ultra-Rapid Metabolizer",
    recommendation: "Increase theophylline and melatonin doses",
    supplement: "Melatonin",
    adjustment: "Use sustained-release form — rapid first-pass metabolism",
    evidence: "PharmGKB — CYP1A2 Drug Interactions",
    evidenceUrl: "#",
  },
  {
    id: "d4",
    enzyme: "CYP2C19",
    status: "Poor Metabolizer",
    recommendation: "Reduce PPI exposure significantly",
    supplement: "Omeprazole",
    adjustment: "Reduce dose by 50% or switch to pantoprazole",
    evidence: "CPIC Guideline — CYP2C19 and PPIs",
    evidenceUrl: "#",
  },
]

// ─── Pathway Risks ──────────────────────────────────────────────────────────

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

// ─── Recommendations ────────────────────────────────────────────────────────

const RECOMMENDATIONS: RecommendationCategory[] = [
  {
    category: "Methylation Support",
    items: [
      { supplement: "L-Methylfolate (5-MTHF)", dose: "800\u20131,600 mcg/day", rationale: "MTHFR C677T homozygous; titrate slowly monitoring mood" },
      { supplement: "Hydroxocobalamin (B12)", dose: "2,000 mcg sublingual", rationale: "MTRR A66G homozygous; hydroxo- preferred form" },
      { supplement: "Riboflavin (B2)", dose: "25\u201350 mg/day", rationale: "MTHFR cofactor; enhances residual enzyme activity" },
      { supplement: "TMG (Betaine)", dose: "500\u20131,000 mg/day", rationale: "Alternative methylation via BHMT pathway" },
    ],
  },
  {
    category: "Neurotransmitter Balance",
    items: [
      { supplement: "Magnesium Glycinate", dose: "400\u2013600 mg/day", rationale: "COMT cofactor; catecholamine clearance support" },
      { supplement: "5-HTP", dose: "50\u2013100 mg at bedtime", rationale: "MAOA fast variant depleting serotonin; precursor support" },
    ],
  },
  {
    category: "Cardiovascular & Metabolic",
    items: [
      { supplement: "Omega-3 (EPA/DHA)", dose: "2\u20133 g/day", rationale: "APOE \u03b54 carrier; anti-inflammatory lipid support" },
      { supplement: "CoQ10 (Ubiquinol)", dose: "200 mg/day", rationale: "SOD2 heterozygous; mitochondrial support" },
    ],
  },
  {
    category: "Vitamin D & Bone",
    items: [
      { supplement: "Vitamin D3", dose: "5,000\u201310,000 IU/day", rationale: "VDR dual variant; overcome receptor resistance" },
      { supplement: "Vitamin K2 (MK-7)", dose: "200 mcg/day", rationale: "Calcium trafficking with VDR impairment" },
    ],
  },
]

// ─── Clinical Summary Blocks ────────────────────────────────────────────────

const CLINICAL_SUMMARY_BLOCKS = [
  { type: "h2" as const, text: "Key Genomic Findings" },
  { type: "p" as const, text: "This patient presents a compound methylation challenge with **MTHFR C677T homozygous** status combined with **MTRR A66G homozygous** variants, resulting in approximately 30% residual methylation efficiency. The impairment is further complicated by **COMT V158M heterozygous** and **MAOA high-activity** genotypes." },
  { type: "h3" as const, text: "Priority Findings" },
  { type: "list" as const, items: [
    "**Methylation-Neurotransmitter Axis**: Severely reduced folate metabolism (MTHFR T/T) with moderate COMT activity requires carefully titrated methylfolate supplementation.",
    "**Cardiovascular-Metabolic Risk**: APOE \u03b53/\u03b54 carrier + FTO AA places this patient in elevated risk for dyslipidemia and metabolic syndrome.",
    "**CYP2C19 Poor Metabolizer**: Significant impact on clopidogrel, PPIs, SSRIs. Reduce doses or switch agents per CPIC guidelines.",
    "**Vitamin D Resistance**: VDR dual variants suggest functional resistance. Target serum 25(OH)D of 60\u201380 ng/mL.",
  ]},
  { type: "h3" as const, text: "Low-Risk Pathways" },
  { type: "list" as const, items: [
    "CYP2D6 normal metabolizer (standard drug metabolism)",
    "GPX1 wildtype (normal selenium utilization)",
    "PEMT wildtype (adequate choline synthesis)",
    "Histamine clearance within normal ranges",
  ]},
]

// ─── Card base ──────────────────────────────────────────────────────────────

const card = "bg-gray-800/50 backdrop-blur-sm border border-[#a78bfa]/15 rounded-xl p-6"

// ─── Helpers ────────────────────────────────────────────────────────────────

function riskColor(score: number) {
  if (score < 30) return { bar: "bg-[#4ade80]", text: "text-[#4ade80]" }
  if (score <= 60) return { bar: "bg-[#fbbf24]", text: "text-[#fbbf24]" }
  return { bar: "bg-[#f87171]", text: "text-[#f87171]" }
}

function rowRiskBg(level: RiskLevel) {
  if (level === "high") return "bg-[#f87171]/5"
  if (level === "moderate") return "bg-[#fbbf24]/5"
  return ""
}

function renderBoldText(text: string) {
  return text.split("**").map((part, k) =>
    k % 2 === 1 ? <strong key={k} className="font-semibold text-white">{part}</strong> : <span key={k}>{part}</span>
  )
}

// ─── Subview type ───────────────────────────────────────────────────────────

type ViewTab = "variants" | "pathways" | "summary" | "recommendations"

// ─── Page Component ─────────────────────────────────────────────────────────

export default function PanelDetailPage() {
  const params = useParams<{ panelId: string }>()
  const panelId = params.panelId ?? "genex-m"

  const [selectedPatient, setSelectedPatient] = useState(PATIENTS[0]!)
  const [activePanel, setActivePanel] = useState(panelId)
  const [activeView, setActiveView] = useState<ViewTab>("variants")
  const [expandedCYP, setExpandedCYP] = useState<string | null>(null)

  const wildtypeCount = SNP_DATA.filter((s) => s.genotype === "wildtype").length
  const variantCount = SNP_DATA.length - wildtypeCount

  const VIEW_TABS: { id: ViewTab; label: string }[] = [
    { id: "variants", label: "Variants & CYP450" },
    { id: "pathways", label: "Pathway Risk" },
    { id: "summary", label: "Clinical Summary" },
    { id: "recommendations", label: "Recommendations" },
  ]

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 min-h-screen bg-[#111827] text-slate-200 pb-12">
      {/* ── HEADER ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/genex360" className="text-slate-500 hover:text-[#a78bfa] transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="bg-[#a78bfa]/10 p-1.5 rounded-lg">
                <Dna className="h-5 w-5 text-[#a78bfa]" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">
                  GeneX360 <span className="text-[#a78bfa]">Genomic Analysis</span>
                </h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Patient selector */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Patient:</span>
              <div className="relative">
                <select
                  value={selectedPatient.id}
                  onChange={(e) => {
                    const p = PATIENTS.find((pt) => pt.id === e.target.value)
                    if (p) setSelectedPatient(p)
                  }}
                  className="appearance-none bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-[#a78bfa]/40 cursor-pointer"
                >
                  {PATIENTS.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
              </div>
              <span className="text-[10px] font-mono text-slate-600 bg-slate-800 px-2 py-0.5 rounded">{selectedPatient.mrn}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a78bfa] to-purple-600 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-white">
              DR
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── PANEL SELECTOR ────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PANEL_TABS.map((tab) => {
            const isActive = tab.id === activePanel
            const TabIcon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? "bg-[#a78bfa] text-gray-900 shadow-[0_0_16px_rgba(167,139,250,0.3)]"
                    : "text-white/40 border border-[#a78bfa]/20 hover:text-white/70 hover:border-[#a78bfa]/40"
                }`}
              >
                <TabIcon className="h-3.5 w-3.5" />
                {tab.name}
                <span className={`text-[9px] font-mono ${isActive ? "text-gray-900/60" : "text-white/20"}`}>
                  {tab.price}
                </span>
              </button>
            )
          })}
        </div>

        {/* Panel badge */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="bg-[#a78bfa]/10 text-[#a78bfa] text-[10px] font-bold px-3 py-1 rounded-full border border-[#a78bfa]/20">
            Panel: {PANEL_TABS.find((t) => t.id === activePanel)?.name ?? "GeneX360"} ({PANEL_TABS.find((t) => t.id === activePanel)?.price})
          </span>
          <span className="bg-[#4ade80]/10 text-[#4ade80] text-[10px] font-bold px-3 py-1 rounded-full border border-[#4ade80]/20 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Results Available
          </span>
        </div>

        {/* ── VIEW TABS ─────────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeView === tab.id
                  ? "bg-slate-800 text-white border border-[#a78bfa]/30"
                  : "text-slate-500 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── VARIANTS & CYP450 VIEW ────────────────────────── */}
        {activeView === "variants" && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-6 min-w-0">
              {/* CYP450 Enzyme Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {CYP_DATA.map((cyp) => {
                  const config = cypStatusConfig(cyp.status)
                  const isExpanded = expandedCYP === cyp.enzyme
                  const pct = (cyp.activityScore / cyp.maxScore) * 100
                  return (
                    <div
                      key={cyp.enzyme}
                      onClick={() => setExpandedCYP(isExpanded ? null : cyp.enzyme)}
                      className={`${config.bg} border-l-4 ${config.border} border border-slate-800/50 p-4 rounded-r-xl cursor-pointer transition-all hover:border-slate-700 ${
                        isExpanded ? "col-span-2 sm:col-span-3 lg:col-span-5 !rounded-xl !border-l-4" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-lg font-bold text-white">{cyp.enzyme}</div>
                          <div className={`${config.color} text-xs font-black uppercase mt-0.5`}>{config.label}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-mono text-slate-500 block">{cyp.diplotype}</span>
                          <span className="text-xl font-black text-white">{cyp.activityScore.toFixed(1)}</span>
                        </div>
                      </div>
                      {/* Activity score bar */}
                      <div className="mt-3 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${config.barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                      {/* Expanded implications */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-800/60 space-y-2">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Clinical Implications</p>
                          {cyp.implications.map((imp, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                              <ChevronRight className="h-3 w-3 text-[#a78bfa] mt-0.5 shrink-0" />
                              <span>{imp}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* SNP Variant Table */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-[#a78bfa]/15 rounded-xl overflow-hidden">
                <div className="p-5 border-b border-slate-800 flex flex-wrap justify-between items-center gap-3">
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <Dna className="h-4 w-4 text-[#a78bfa]" /> SNP Variant Results
                  </h3>
                  <div className="flex gap-2">
                    <span className="bg-[#4ade80]/10 text-[#4ade80] text-[10px] font-bold px-2.5 py-0.5 rounded border border-[#4ade80]/20">{wildtypeCount} NORMAL</span>
                    <span className="bg-[#fbbf24]/10 text-[#fbbf24] text-[10px] font-bold px-2.5 py-0.5 rounded border border-[#fbbf24]/20">{variantCount} VARIANTS</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/60 text-[10px] text-slate-500 uppercase tracking-wider">
                      <tr className="border-b border-slate-800">
                        <th className="px-5 py-3 font-semibold">Gene</th>
                        <th className="px-5 py-3 font-semibold">Variant (rs#)</th>
                        <th className="px-5 py-3 font-semibold">Genotype</th>
                        <th className="px-5 py-3 font-semibold">Significance</th>
                        <th className="px-5 py-3 font-semibold">FarmCeutica Product</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {SNP_DATA.map((snp, idx) => {
                        const genoStyle = snp.genotype === "wildtype"
                          ? { bg: "bg-[#4ade80]/10", text: "text-[#4ade80]", label: "WT" }
                          : snp.genotype === "heterozygous"
                          ? { bg: "bg-[#fbbf24]/10", text: "text-[#fbbf24]", label: "+/\u2212" }
                          : { bg: "bg-[#f87171]/10", text: "text-[#f87171]", label: "+/+" }
                        return (
                          <tr key={idx} className={`${rowRiskBg(snp.riskLevel)} hover:bg-slate-800/30 transition-colors`}>
                            <td className="px-5 py-3.5">
                              <span className="bg-[#a78bfa]/20 text-[#a78bfa] font-bold px-2.5 py-1 rounded-full text-[11px]">{snp.gene}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="text-white font-medium">{snp.variant}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{snp.rsId}</div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${genoStyle.bg} ${genoStyle.text}`}>
                                {snp.alleles} <span className="text-[9px] opacity-60">{genoStyle.label}</span>
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-xs text-slate-400 max-w-xs">{snp.significance}</td>
                            <td className="px-5 py-3.5">
                              {snp.farmceuticaProduct ? (
                                <button className="bg-[#f472b6]/10 text-[#f472b6] text-[10px] font-semibold px-2.5 py-1 rounded-full border border-[#f472b6]/20 hover:bg-[#f472b6]/20 transition-colors flex items-center gap-1">
                                  {snp.farmceuticaProduct}
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-600">\u2014</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ── DOSING ADJUSTMENT PANEL (right sidebar) ─────── */}
            <aside className="lg:w-80 space-y-4 shrink-0">
              <div className="bg-gray-800/50 backdrop-blur-sm border border-[#a78bfa]/15 rounded-xl p-5">
                <h3 className="text-xs font-bold text-[#a78bfa] uppercase tracking-wider flex items-center gap-2 mb-4">
                  <Sparkles className="h-3.5 w-3.5" /> Pharmacogenomic Dosing
                </h3>
                <div className="space-y-3">
                  {DOSING_RECS.map((rec) => (
                    <div key={rec.id} className="p-3 bg-slate-900/60 border border-[#4ade80]/15 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-[#fbbf24] bg-[#fbbf24]/10 px-2 py-0.5 rounded uppercase">{rec.enzyme}</span>
                        <span className="text-[9px] text-slate-500">{rec.status}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        <span className="text-white font-semibold">{rec.supplement}</span>: {rec.adjustment}
                      </p>
                      <div className="flex items-center justify-between">
                        <button className="text-[9px] text-[#4ade80] flex items-center gap-1 hover:underline">
                          <ExternalLink className="h-2.5 w-2.5" /> {rec.evidence}
                        </button>
                      </div>
                      <button className="w-full mt-1 py-1.5 bg-[#4ade80]/10 border border-[#4ade80]/25 text-[#4ade80] rounded-lg text-[10px] font-bold hover:bg-[#4ade80]/20 transition-colors">
                        Apply to Protocol
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* ── PATHWAY RISK VIEW ──────────────────────────────── */}
        {activeView === "pathways" && (
          <div className="space-y-4">
            <div className={card}>
              <h3 className="font-bold text-sm flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-[#a78bfa]" /> Pathway Risk Scores
              </h3>
              <p className="text-[10px] text-slate-500">
                Aggregate risk across 12 metabolic pathways. 0\u201329 low, 30\u201360 moderate, 61\u2013100 elevated.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PATHWAY_RISKS.map((pathway) => {
                const colors = riskColor(pathway.score)
                return (
                  <div key={pathway.name} className="bg-gray-800/50 backdrop-blur-sm border border-[#a78bfa]/15 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-white">{pathway.name}</h4>
                      <span className={`text-lg font-black ${colors.text}`}>{pathway.score}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${colors.bar}`} style={{ width: `${pathway.score}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">{pathway.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── CLINICAL SUMMARY VIEW ──────────────────────────── */}
        {activeView === "summary" && (
          <div className={card}>
            <div className="flex items-start gap-2 p-3 bg-[#4ade80]/5 border border-[#4ade80]/20 rounded-xl text-xs text-[#4ade80] mb-5">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="font-medium">Report generated March 10, 2026 \u2014 reviewed by laboratory director.</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-[#a78bfa] mb-5">
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
                      {block.items!.map((item, j) => <li key={j}>{renderBoldText(item)}</li>)}
                    </ul>
                  )
                }
                return null
              })}
            </div>
            <div className="flex items-start gap-2 p-3 bg-[#fbbf24]/5 border border-[#fbbf24]/20 rounded-xl text-xs text-[#fbbf24] mt-5">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span><strong>Disclaimer:</strong> Genomic results should be interpreted in context of clinical picture, family history, and labs. This report does not constitute a diagnosis.</span>
            </div>
          </div>
        )}

        {/* ── RECOMMENDATIONS VIEW ───────────────────────────── */}
        {activeView === "recommendations" && (
          <div className="space-y-4">
            <div className={card}>
              <h3 className="font-bold text-sm flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-[#a78bfa]" /> Genotype-Based Recommendations
              </h3>
              <p className="text-[10px] text-slate-500">All recommendations should be clinically validated before prescribing.</p>
            </div>
            {RECOMMENDATIONS.map((cat) => (
              <div key={cat.category} className="bg-gray-800/50 backdrop-blur-sm border border-[#a78bfa]/15 rounded-xl overflow-hidden">
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
                          <span className="bg-[#a78bfa]/10 text-[#a78bfa] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#a78bfa]/20">{item.dose}</span>
                        </td>
                        <td className="px-5 py-3 text-slate-400">{item.rationale}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            <div className="flex items-start gap-2 p-3 bg-[#fbbf24]/5 border border-[#fbbf24]/20 rounded-xl text-xs text-[#fbbf24]">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span><strong>Clinical Note:</strong> Consider drug-nutrient interactions, current medications, and patient preferences. Periodic biomarker reassessment recommended.</span>
            </div>
          </div>
        )}

        {/* ── PRODUCT BADGES ─────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* PeptideIQ */}
          <div className="bg-[#a78bfa]/10 border border-[#a78bfa]/20 rounded-xl p-5 flex items-start gap-4">
            <div className="bg-[#a78bfa]/10 p-3 rounded-xl shrink-0">
              <Beaker className="h-6 w-6 text-[#a78bfa]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-bold text-white">PeptideIQ\u2122</h4>
                <span className="text-[9px] font-bold text-[#f472b6] bg-[#f472b6]/10 px-2 py-0.5 rounded-full border border-[#f472b6]/20">FIRST-MOVER</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                First genetic peptide test \u2014 maps genetic variants to <span className="text-white font-semibold">BPC-157, Thymosin Beta-4, CJC-1295, Ipamorelin</span> response predictions.
              </p>
              <button className="mt-3 text-[10px] text-[#a78bfa] font-bold flex items-center gap-1 hover:underline">
                View Panel <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* CannabisIQ */}
          <div className="bg-[#a78bfa]/10 border border-[#a78bfa]/20 rounded-xl p-5 flex items-start gap-4">
            <div className="bg-[#4ade80]/10 p-3 rounded-xl shrink-0">
              <Leaf className="h-6 w-6 text-[#4ade80]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-bold text-white">CannabisIQ\u2122</h4>
                <span className="text-[9px] font-bold text-[#4ade80] bg-[#4ade80]/10 px-2 py-0.5 rounded-full border border-[#4ade80]/20">CEDARGROWTH</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                <span className="text-white font-semibold">13 genetic traits \u2192 5 wellness categories</span> \u2014 Cannabis DNA test mapping CNR1, FAAH, MGLL, and CYP2C9 variants to personalized recommendations.
              </p>
              <button className="mt-3 text-[10px] text-[#4ade80] font-bold flex items-center gap-1 hover:underline">
                View Panel <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
