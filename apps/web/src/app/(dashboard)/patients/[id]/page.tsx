"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Pencil,
  FileDown,
  Dna,
  Activity,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  Pill,
  FlaskConical,
  StickyNote,
  BarChart3,
  AlertTriangle,
  Plus,
  Calendar,
  Heart,
  User,
  FileText,
  Clock,
  ChevronRight,
  CheckCircle2,
  Shield,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

interface GeneVariant {
  gene: string
  variant: string
  rsid: string
  genotype: string
  phenotype: string
  significance: "pathogenic" | "likely_pathogenic" | "uncertain" | "likely_benign" | "benign"
}

interface CYPPhenotype {
  gene: string
  phenotype: string
  level: "normal" | "intermediate" | "poor" | "rapid"
}

interface Protocol {
  id: string
  title: string
  description: string
  status: "active" | "pending-review" | "completed" | "draft"
  daysCurrent: number
  daysTotal: number
  pathway: string
}

interface OutcomeMetric {
  label: string
  value: string
  unit: string
  change: number
  baseline: string
}

interface Medication {
  name: string
  dosage: string
  frequency: string
  route: string
  prescriber: string
  startDate: string
}

interface Supplement {
  name: string
  dosage: string
  frequency: string
  protocol: string
}

interface LabResult {
  test: string
  result: string
  unit: string
  range: string
  flag: "normal" | "high" | "low" | "critical"
  date: string
  previous?: string
}

interface ClinicalNote {
  id: string
  date: string
  author: string
  type: string
  content: string
}

interface PatientData {
  id: string
  name: string
  initials: string
  mrn: string
  age: number
  sex: "M" | "F"
  status: "stable" | "monitoring" | "critical"
  focus: string
  cypPhenotypes: CYPPhenotype[]
  geneVariants: GeneVariant[]
  protocols: Protocol[]
  outcomes: OutcomeMetric[]
  medications: Medication[]
  supplements: Supplement[]
  labs: LabResult[]
  notes: ClinicalNote[]
  interactions: Array<{ drug: string; supplement: string; severity: "critical" | "moderate" }>
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const PATIENT_DB: Record<string, PatientData> = {
  "pt-001": {
    id: "pt-001",
    name: "Sarah Mitchell",
    initials: "SM",
    mrn: "#VM-9928",
    age: 47,
    sex: "F",
    status: "stable",
    focus: "Metabolic Focus",
    cypPhenotypes: [
      { gene: "CYP2C19", phenotype: "Intermediate Metabolizer", level: "intermediate" },
      { gene: "CYP2D6", phenotype: "Normal Metabolizer", level: "normal" },
      { gene: "CYP3A4", phenotype: "Normal Metabolizer", level: "normal" },
      { gene: "CYP1A2", phenotype: "Rapid Metabolizer", level: "rapid" },
    ],
    geneVariants: [
      { gene: "MTHFR", variant: "C677T", rsid: "rs1801133", genotype: "T/T", phenotype: "Reduced enzyme activity (~30%)", significance: "pathogenic" },
      { gene: "COMT", variant: "Val158Met", rsid: "rs4680", genotype: "A/G", phenotype: "Intermediate catechol metabolism", significance: "uncertain" },
      { gene: "MAOA", variant: "3R", rsid: "rs909525", genotype: "3R/4R", phenotype: "Reduced MAO-A activity", significance: "likely_pathogenic" },
      { gene: "VDR", variant: "Taq1", rsid: "rs731236", genotype: "T/C", phenotype: "Reduced vitamin D receptor expression", significance: "uncertain" },
      { gene: "APOE", variant: "e3/e3", rsid: "rs429358", genotype: "T/T", phenotype: "Normal lipid metabolism", significance: "benign" },
    ],
    protocols: [
      { id: "p1", title: "Methylation Support", description: "Targeting MTHFR variant pathway optimization", status: "active", daysCurrent: 45, daysTotal: 90, pathway: "Methylation" },
      { id: "p2", title: "Adrenal Recovery", description: "Cortisol rhythm normalization protocol", status: "pending-review", daysCurrent: 0, daysTotal: 60, pathway: "HPA Axis" },
      { id: "p3", title: "Detox Phase II", description: "Glutathione conjugation support", status: "completed", daysCurrent: 90, daysTotal: 90, pathway: "Detoxification" },
    ],
    outcomes: [
      { label: "AM Cortisol", value: "14.2", unit: "mcg/dL", change: -18, baseline: "17.3" },
      { label: "Heart Rate Variability", value: "64", unit: "ms", change: 12, baseline: "57" },
      { label: "Homocysteine", value: "8.2", unit: "umol/L", change: -45, baseline: "14.8" },
      { label: "Serum Folate", value: "22.4", unit: "ng/mL", change: 68, baseline: "13.3" },
    ],
    medications: [
      { name: "Levothyroxine", dosage: "50 mcg", frequency: "Once daily", route: "Oral", prescriber: "Dr. James Chen", startDate: "2025-06-15" },
      { name: "Escitalopram", dosage: "10 mg", frequency: "Once daily", route: "Oral", prescriber: "Dr. James Chen", startDate: "2025-09-01" },
    ],
    supplements: [
      { name: "L-Methylfolate", dosage: "15 mg daily", frequency: "Once daily", protocol: "Methylation Support" },
      { name: "Methylcobalamin (B12)", dosage: "5,000 mcg daily", frequency: "Once daily", protocol: "Methylation Support" },
      { name: "Riboflavin (B2)", dosage: "400 mg daily", frequency: "Once daily", protocol: "Methylation Support" },
      { name: "Magnesium Glycinate", dosage: "400 mg", frequency: "Twice daily", protocol: "Adrenal Recovery" },
      { name: "Curcumin", dosage: "500 mg", frequency: "Twice daily", protocol: "Inflammation" },
    ],
    labs: [
      { test: "Homocysteine", result: "8.2", unit: "umol/L", range: "5.0-15.0", flag: "normal", date: "2026-03-10", previous: "14.8" },
      { test: "Methylmalonic Acid", result: "0.18", unit: "umol/L", range: "0.07-0.27", flag: "normal", date: "2026-03-10" },
      { test: "Serum Folate", result: "22.4", unit: "ng/mL", range: "3.0-17.0", flag: "high", date: "2026-03-10", previous: "13.3" },
      { test: "Vitamin B12", result: "892", unit: "pg/mL", range: "200-900", flag: "normal", date: "2026-03-10" },
      { test: "Vitamin D, 25-OH", result: "38", unit: "ng/mL", range: "30-100", flag: "normal", date: "2026-03-10", previous: "24" },
      { test: "Ferritin", result: "42", unit: "ng/mL", range: "12-150", flag: "normal", date: "2026-03-10" },
      { test: "TSH", result: "2.8", unit: "mIU/L", range: "0.4-4.0", flag: "normal", date: "2026-03-10" },
      { test: "hs-CRP", result: "2.4", unit: "mg/L", range: "0.0-3.0", flag: "normal", date: "2026-03-10", previous: "4.1" },
    ],
    notes: [
      { id: "n1", date: "2026-03-10", author: "Dr. Sarah Chen, ND", type: "Follow-up Visit", content: "Patient reports improved energy levels after 8 weeks on methylation protocol. Homocysteine normalized at 8.2 from baseline 14.8. Continue current supplement regimen. Folate levels elevated as expected with L-methylfolate supplementation. Recommend follow-up labs in 6 weeks." },
      { id: "n2", date: "2026-02-01", author: "Dr. Sarah Chen, ND", type: "Protocol Initiation", content: "Initiated adrenal recovery protocol. Baseline AM cortisol elevated at 17.3 mcg/dL. Started magnesium glycinate 400mg BID and ashwagandha 600mg daily. Patient educated on sleep hygiene and stress management techniques." },
      { id: "n3", date: "2026-01-15", author: "Dr. Sarah Chen, ND", type: "Genomic Review", content: "Reviewed GeneX360 panel results with patient. Discussed MTHFR C677T homozygous finding and clinical implications. Started methylation optimization protocol with L-methylfolate 15mg, methylcobalamin 5000mcg, riboflavin 400mg. Baseline homocysteine was 14.8 umol/L." },
    ],
    interactions: [
      { drug: "Warfarin", supplement: "Curcumin", severity: "critical" },
    ],
  },
}

function getDefaultPatient(id: string): PatientData {
  return {
    id,
    name: "Test Patient",
    initials: "TP",
    mrn: `#VM-${id.replace(/\D/g, "").padStart(4, "0")}`,
    age: 42,
    sex: "F",
    status: "stable",
    focus: "General Wellness",
    cypPhenotypes: [
      { gene: "CYP2D6", phenotype: "Normal Metabolizer", level: "normal" },
      { gene: "CYP2C19", phenotype: "Normal Metabolizer", level: "normal" },
    ],
    geneVariants: [
      { gene: "MTHFR", variant: "C677T", rsid: "rs1801133", genotype: "C/T", phenotype: "Mildly reduced enzyme activity (~65%)", significance: "likely_pathogenic" },
      { gene: "COMT", variant: "Val158Met", rsid: "rs4680", genotype: "G/G", phenotype: "Fast catechol metabolism", significance: "benign" },
    ],
    protocols: [
      { id: "p1", title: "General Wellness Protocol", description: "Baseline optimization", status: "active", daysCurrent: 30, daysTotal: 90, pathway: "General" },
    ],
    outcomes: [
      { label: "Vitamin D", value: "38", unit: "ng/mL", change: 58, baseline: "24" },
    ],
    medications: [],
    supplements: [
      { name: "Vitamin D3", dosage: "5,000 IU", frequency: "Once daily", protocol: "General Wellness" },
    ],
    labs: [
      { test: "Vitamin D, 25-OH", result: "38", unit: "ng/mL", range: "30-100", flag: "normal", date: "2026-03-01" },
    ],
    notes: [
      { id: "n1", date: "2026-03-01", author: "Dr. Sarah Chen, ND", type: "Initial Evaluation", content: "New patient evaluation. Ordered GeneX360 panel." },
    ],
    interactions: [],
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function cypBadgeColor(level: string) {
  switch (level) {
    case "normal": return "bg-emerald-400/20 text-emerald-400"
    case "intermediate": return "bg-yellow-500/20 text-yellow-500"
    case "poor": return "bg-red-400/20 text-red-400"
    case "rapid": return "bg-blue-400/20 text-blue-400"
    default: return "bg-slate-700 text-slate-300"
  }
}

function statusConfig(status: string) {
  switch (status) {
    case "stable": return { color: "text-emerald-400", bg: "bg-emerald-400", label: "Stable" }
    case "monitoring": return { color: "text-yellow-400", bg: "bg-yellow-400", label: "Monitoring" }
    case "critical": return { color: "text-red-400", bg: "bg-red-400", label: "Critical" }
    default: return { color: "text-slate-400", bg: "bg-slate-400", label: status }
  }
}

function labFlagStyle(flag: string) {
  switch (flag) {
    case "high": return "text-red-400"
    case "low": return "text-blue-400"
    case "critical": return "text-red-400 font-bold"
    default: return "text-slate-300"
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ─── Tab types ──────────────────────────────────────────────────────────────

type TabId = "protocols" | "medications" | "outcomes" | "labs" | "notes" | "genomics"

const TABS: { id: TabId; label: string }[] = [
  { id: "protocols", label: "Active Protocols" },
  { id: "medications", label: "Medications" },
  { id: "outcomes", label: "Outcomes" },
  { id: "labs", label: "Lab Results" },
  { id: "notes", label: "Notes" },
  { id: "genomics", label: "Genomics" },
]

// ─── Page Component ─────────────────────────────────────────────────────────

export default function PatientDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [activeTab, setActiveTab] = useState<TabId>("protocols")

  const patient = PATIENT_DB[id] ?? getDefaultPatient(id)
  const sc = statusConfig(patient.status)
  const hasInteractions = patient.interactions.length > 0

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 min-h-screen bg-[#111827] text-slate-100 flex flex-col">
      {/* ── STICKY PATIENT NAV ───────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-gray-800/70 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/patients" className="text-slate-400 hover:text-white transition-colors mr-1">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="size-10 bg-emerald-400/20 rounded-full flex items-center justify-center text-emerald-400 font-bold border border-emerald-400/30 text-sm">
            {patient.initials}
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">{patient.name}</h1>
            <p className="text-xs text-slate-400 mt-1">
              MRN {patient.mrn} &middot; Age {patient.age} &middot;{" "}
              <span className={`${sc.color} inline-flex items-center gap-1`}>
                <span className={`size-1.5 rounded-full ${sc.bg} animate-pulse`} />
                {sc.label}
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-colors flex items-center gap-2">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button className="px-4 py-2 rounded-lg bg-emerald-400 text-[#111827] hover:bg-emerald-300 text-sm font-bold transition-colors flex items-center gap-2">
            <FileDown className="h-3.5 w-3.5" /> Export PDF
          </button>
        </div>
      </nav>

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <main className="flex-1 p-4 lg:p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Genomic Summary */}
        <section className="bg-gray-800/70 backdrop-blur-xl border border-white/5 rounded-xl p-5 border-l-4 border-l-purple-400">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Dna className="h-5 w-5 text-purple-400" />
              <h2 className="font-bold text-lg">Genomic Summary</h2>
            </div>
            <span className="px-2.5 py-1 rounded bg-purple-400/10 text-purple-400 text-[10px] font-bold uppercase tracking-wider">
              {patient.focus}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CYP450 Phenotypes */}
            <div className="space-y-2">
              <p className="text-xs text-slate-400 font-medium">CYP450 Phenotypes</p>
              <div className="flex flex-wrap gap-2">
                {patient.cypPhenotypes.map((cyp) => (
                  <span key={cyp.gene} className={`px-2 py-1 rounded text-xs font-semibold ${cypBadgeColor(cyp.level)}`}>
                    {cyp.gene}: {cyp.phenotype.split(" ")[0]}
                  </span>
                ))}
              </div>
            </div>
            {/* Gene Variants */}
            <div className="col-span-2 space-y-2">
              <p className="text-xs text-slate-400 font-medium">Relevant Gene Variants</p>
              <div className="flex flex-wrap gap-2">
                {patient.geneVariants.map((v) => (
                  <span
                    key={v.rsid}
                    className="px-2.5 py-1 rounded-lg border border-purple-400/30 bg-purple-400/5 text-slate-100 text-xs"
                  >
                    {v.gene} ({v.variant})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tab Bar */}
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-emerald-400 text-[#111827] font-bold"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "protocols" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Protocols */}
            <div className="space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" /> Active Protocols
              </h3>
              {patient.protocols.map((protocol) => {
                const isActive = protocol.status === "active"
                const progress = protocol.daysTotal > 0 ? (protocol.daysCurrent / protocol.daysTotal) * 100 : 0
                return (
                  <div
                    key={protocol.id}
                    className={`bg-gray-800/70 backdrop-blur-xl rounded-xl p-5 space-y-4 border transition-all cursor-pointer ${
                      isActive
                        ? "border-emerald-400/10 hover:border-emerald-400/30"
                        : "border-white/5 hover:border-white/10 opacity-80"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-lg">{protocol.title}</h4>
                        <p className="text-sm text-slate-400">{protocol.description}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                        isActive ? "bg-emerald-400/10 text-emerald-400"
                        : protocol.status === "completed" ? "bg-slate-700 text-slate-400"
                        : "bg-slate-700 text-slate-400"
                      }`}>
                        {protocol.status === "pending-review" ? "Pending Review" : protocol.status}
                      </span>
                    </div>
                    {isActive && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-400">Progress</span>
                          <span>Day {protocol.daysCurrent} / {protocol.daysTotal}</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Outcomes Timeline */}
            <div className="space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-400" /> Outcomes Timeline
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {patient.outcomes.map((metric) => (
                  <div key={metric.label} className="bg-gray-800/70 backdrop-blur-xl rounded-xl p-4 border border-white/5 hover:border-white/10 transition-all">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{metric.label}</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold">{metric.value}</span>
                      <span className="text-xs text-slate-500">{metric.unit}</span>
                    </div>
                    <div className={`mt-2 flex items-center gap-1 text-xs font-bold ${metric.change >= 0 ? "text-emerald-400" : "text-emerald-400"}`}>
                      {metric.change >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>{metric.change >= 0 ? "+" : ""}{metric.change}% from baseline ({metric.baseline})</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Chart placeholder */}
              <div className="bg-gray-800/70 backdrop-blur-xl rounded-xl p-4 h-48 flex items-center justify-center border border-dashed border-white/10">
                <div className="text-center">
                  <BarChart3 className="mx-auto h-10 w-10 text-slate-600 mb-2" />
                  <p className="text-slate-500 text-sm">Full Outcome Analytics Chart</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "medications" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Medications */}
            <div className="space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <Pill className="h-4 w-4 text-emerald-400" /> Current Medications
              </h3>
              {patient.medications.length === 0 ? (
                <div className="bg-gray-800/70 backdrop-blur-xl rounded-xl p-8 border border-white/5 text-center">
                  <p className="text-slate-500 text-sm">No active medications</p>
                </div>
              ) : (
                patient.medications.map((med) => (
                  <div key={med.name} className="bg-gray-800/70 backdrop-blur-xl rounded-xl p-5 border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold">{med.name}</h4>
                        <p className="text-sm text-slate-400">{med.dosage} &middot; {med.frequency} &middot; {med.route}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-emerald-400/10 text-emerald-400 text-[10px] font-bold uppercase">Active</span>
                    </div>
                    <div className="mt-3 flex gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" /> {med.prescriber}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Since {formatDate(med.startDate)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Supplements */}
            <div className="space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-purple-400" /> Active Supplements
              </h3>
              {patient.supplements.map((sup) => (
                <div key={sup.name} className="bg-gray-800/70 backdrop-blur-xl rounded-xl p-4 border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-sm">{sup.name}</h4>
                      <p className="text-xs text-slate-400">{sup.dosage} &middot; {sup.frequency}</p>
                    </div>
                    <span className="text-[10px] text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded font-semibold">{sup.protocol}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "outcomes" && (
          <div className="space-y-6">
            <h3 className="font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" /> Outcome Metrics
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {patient.outcomes.map((metric) => (
                <div key={metric.label} className="bg-gray-800/70 backdrop-blur-xl rounded-xl p-5 border border-white/5 hover:border-emerald-400/20 transition-all">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{metric.label}</p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{metric.value}</span>
                    <span className="text-xs text-slate-500">{metric.unit}</span>
                  </div>
                  <div className={`mt-3 flex items-center gap-1 text-xs font-bold text-emerald-400`}>
                    {metric.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span>{metric.change >= 0 ? "+" : ""}{metric.change}% from baseline ({metric.baseline})</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Chart placeholder */}
            <div className="bg-gray-800/70 backdrop-blur-xl rounded-xl p-6 h-64 flex items-center justify-center border border-dashed border-white/10">
              <div className="text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                <p className="text-slate-500 text-sm font-medium">Full Outcome Analytics Chart</p>
                <p className="text-slate-600 text-xs mt-1">Longitudinal tracking across all biomarkers</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "labs" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-emerald-400" /> Lab Results
              </h3>
              <span className="text-xs text-slate-400">
                Last drawn: {patient.labs[0] ? formatDate(patient.labs[0].date) : "N/A"}
              </span>
            </div>
            <div className="bg-gray-800/70 backdrop-blur-xl rounded-xl border border-white/5 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left py-3 px-6 bg-slate-800/30 text-slate-400 text-[10px] uppercase tracking-[0.05em] font-medium">Test</th>
                    <th className="text-left py-3 px-6 bg-slate-800/30 text-slate-400 text-[10px] uppercase tracking-[0.05em] font-medium">Result</th>
                    <th className="text-left py-3 px-6 bg-slate-800/30 text-slate-400 text-[10px] uppercase tracking-[0.05em] font-medium hidden sm:table-cell">Reference</th>
                    <th className="text-left py-3 px-6 bg-slate-800/30 text-slate-400 text-[10px] uppercase tracking-[0.05em] font-medium">Flag</th>
                    <th className="text-left py-3 px-6 bg-slate-800/30 text-slate-400 text-[10px] uppercase tracking-[0.05em] font-medium hidden md:table-cell">Previous</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {patient.labs.map((lab) => (
                    <tr key={lab.test} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-6 font-medium">{lab.test}</td>
                      <td className="py-4 px-6">
                        <span className={`font-mono font-semibold ${labFlagStyle(lab.flag)}`}>{lab.result}</span>
                        <span className="text-slate-500 text-xs ml-1">{lab.unit}</span>
                      </td>
                      <td className="py-4 px-6 text-slate-500 text-xs hidden sm:table-cell">{lab.range} {lab.unit}</td>
                      <td className="py-4 px-6">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          lab.flag === "normal" ? "bg-emerald-400/10 text-emerald-400"
                          : lab.flag === "high" ? "bg-red-400/10 text-red-400"
                          : lab.flag === "low" ? "bg-blue-400/10 text-blue-400"
                          : "bg-red-400/20 text-red-400"
                        }`}>
                          {lab.flag}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-500 text-xs hidden md:table-cell">
                        {lab.previous ? `${lab.previous} ${lab.unit}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "notes" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-emerald-400" /> Clinical Notes ({patient.notes.length})
              </h3>
              <button className="px-4 py-2 rounded-lg bg-emerald-400 text-[#111827] text-sm font-bold flex items-center gap-2 hover:bg-emerald-300 transition-colors">
                <Plus className="h-4 w-4" /> Add Note
              </button>
            </div>
            <div className="space-y-4">
              {patient.notes.map((note) => (
                <div key={note.id} className="bg-gray-800/70 backdrop-blur-xl rounded-xl p-5 border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-sm">{note.type}</h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <User className="h-3 w-3" /> {note.author}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatDate(note.date)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "genomics" && (
          <div className="space-y-6">
            {/* CYP450 Panel */}
            <div className="bg-gray-800/70 backdrop-blur-xl rounded-xl p-5 border border-white/5">
              <h3 className="font-bold flex items-center gap-2 mb-4">
                <Shield className="h-4 w-4 text-purple-400" /> CYP450 Metabolizer Panel
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {patient.cypPhenotypes.map((cyp) => (
                  <div key={cyp.gene} className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 font-medium">{cyp.gene}</p>
                    <p className={`text-sm font-bold mt-1 ${
                      cyp.level === "normal" ? "text-emerald-400"
                      : cyp.level === "intermediate" ? "text-yellow-400"
                      : cyp.level === "poor" ? "text-red-400"
                      : "text-blue-400"
                    }`}>{cyp.phenotype}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Variant Table */}
            <div className="bg-gray-800/70 backdrop-blur-xl rounded-xl border border-white/5 overflow-hidden">
              <div className="p-5 border-b border-slate-800">
                <h3 className="font-bold flex items-center gap-2">
                  <Dna className="h-4 w-4 text-purple-400" /> Gene Variant Results
                </h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left py-3 px-6 bg-slate-800/30 text-slate-400 text-[10px] uppercase tracking-[0.05em] font-medium">Gene</th>
                    <th className="text-left py-3 px-6 bg-slate-800/30 text-slate-400 text-[10px] uppercase tracking-[0.05em] font-medium">Variant</th>
                    <th className="text-left py-3 px-6 bg-slate-800/30 text-slate-400 text-[10px] uppercase tracking-[0.05em] font-medium">Genotype</th>
                    <th className="text-left py-3 px-6 bg-slate-800/30 text-slate-400 text-[10px] uppercase tracking-[0.05em] font-medium hidden md:table-cell">Phenotype</th>
                    <th className="text-left py-3 px-6 bg-slate-800/30 text-slate-400 text-[10px] uppercase tracking-[0.05em] font-medium">Significance</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {patient.geneVariants.map((v) => (
                    <tr key={v.rsid} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-6 font-bold">{v.gene}</td>
                      <td className="py-4 px-6">
                        <div>
                          <p>{v.variant}</p>
                          <p className="text-[10px] text-slate-500">{v.rsid}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <code className="bg-slate-700 px-2 py-0.5 rounded text-xs font-mono font-bold">{v.genotype}</code>
                      </td>
                      <td className="py-4 px-6 text-slate-400 text-xs hidden md:table-cell max-w-[240px]">{v.phenotype}</td>
                      <td className="py-4 px-6">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                          v.significance === "pathogenic" ? "bg-red-400/10 text-red-400"
                          : v.significance === "likely_pathogenic" ? "bg-orange-400/10 text-orange-400"
                          : v.significance === "uncertain" ? "bg-yellow-400/10 text-yellow-400"
                          : v.significance === "likely_benign" ? "bg-blue-400/10 text-blue-400"
                          : "bg-emerald-400/10 text-emerald-400"
                        }`}>
                          {v.significance === "likely_pathogenic" ? "Likely Path."
                          : v.significance === "likely_benign" ? "Likely Benign"
                          : v.significance === "uncertain" ? "VUS"
                          : v.significance}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ── STICKY INTERACTION ALERT ─────────────────────────────── */}
      {hasInteractions && patient.interactions[0] && (
        <div className="sticky bottom-0 z-50 p-4">
          <div className="bg-red-500/20 backdrop-blur-xl border border-red-500/50 rounded-xl p-4 flex items-center justify-between shadow-2xl max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-red-400">Drug-Supplement Interaction Detected</p>
                <p className="text-xs text-slate-300">
                  Contraindication identified between{" "}
                  <span className="font-bold underline">{patient.interactions[0].supplement}</span> and{" "}
                  <span className="font-bold underline">{patient.interactions[0].drug}</span>.
                </p>
              </div>
            </div>
            <button className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-400 transition-colors shrink-0">
              View Resolution
            </button>
          </div>
        </div>
      )}

      {/* ── FAB ──────────────────────────────────────────────────── */}
      <div className="fixed bottom-24 right-6 flex flex-col gap-3 z-40">
        <button className="size-12 rounded-full bg-emerald-400 text-[#111827] shadow-lg flex items-center justify-center hover:scale-105 hover:bg-emerald-300 transition-all">
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-white/5 bg-slate-900/50 p-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>&copy; 2026 ViaConnect Practitioner Portal. Clinical Decision Support System.</p>
          <div className="flex gap-4">
            <Link href="/protocols" className="hover:text-emerald-400 transition-colors">Protocol Library</Link>
            <Link href="/genex360" className="hover:text-emerald-400 transition-colors">Gene Lexicon</Link>
            <Link href="/settings" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
