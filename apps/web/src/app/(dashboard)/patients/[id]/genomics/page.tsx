"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Dna,
  Star,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  FlaskConical,
  Grid3X3,
  AlertTriangle,
  Beaker,
  Leaf,
  Brain,
  FileDown,
  TestTube,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

type RiskLevel = "HIGH" | "MOD" | "LOW"
type CYPStatus = "poor" | "intermediate" | "normal" | "ultra-rapid"
type DoseDirection = "increased" | "reduced" | "unchanged"
type SortField = "supplement" | "standard" | "adjusted" | "reason"
type SortDir = "asc" | "desc"

interface PanelTab {
  id: string
  name: string
  icon?: React.ElementType
}

interface SNPVariant {
  gene: string
  variant: string
  rsId: string
  genotype: string
  riskLevel: RiskLevel
  riskLabel: string
  functionalTag: string
  borderColor: string
}

interface CYPEnzyme {
  name: string
  allele: string
  status: CYPStatus
  pct: number
}

interface DosingRec {
  supplement: string
  standardDose: string
  adjustedDose: string
  direction: DoseDirection
  reason: string
}

// ─── Panel Tabs ─────────────────────────────────────────────────────────────

const PANEL_TABS: PanelTab[] = [
  { id: "genex-m", name: "GENEX-M" },
  { id: "genex-n", name: "GENEX-N" },
  { id: "genex-c", name: "GENEX-C" },
  { id: "genex-d", name: "GENEX-D" },
  { id: "complete", name: "GeneX360 Complete", icon: Star },
]

// ─── SNP Variants (GENEX-M Methylation) ─────────────────────────────────────

const SNP_VARIANTS: SNPVariant[] = [
  { gene: "MTHFR", variant: "C677T", rsId: "rs1801133", genotype: "T/T (Homozygous)", riskLevel: "HIGH", riskLabel: "High Risk", functionalTag: "Loss of Function", borderColor: "border-red-500" },
  { gene: "MTHFR", variant: "A1298C", rsId: "rs1801131", genotype: "A/C (Heterozygous)", riskLevel: "MOD", riskLabel: "Mod Risk", functionalTag: "Altered", borderColor: "border-[#ffc640]" },
  { gene: "MTR", variant: "A2756G", rsId: "rs1805087", genotype: "A/G (Heterozygous)", riskLevel: "MOD", riskLabel: "Mod Risk", functionalTag: "Altered", borderColor: "border-[#ffc640]" },
  { gene: "MTRR", variant: "A66G", rsId: "rs1801394", genotype: "G/G (Homozygous)", riskLevel: "HIGH", riskLabel: "High Risk", functionalTag: "Loss of Function", borderColor: "border-red-500" },
  { gene: "BHMT", variant: "G742A", rsId: "rs3733890", genotype: "G/A (Heterozygous)", riskLevel: "LOW", riskLabel: "Low Risk", functionalTag: "Gain of Function", borderColor: "border-[#4ade80]" },
  { gene: "CBS", variant: "C699T", rsId: "rs234706", genotype: "C/C (Wild Type)", riskLevel: "LOW", riskLabel: "Low Risk", functionalTag: "Gain of Function", borderColor: "border-[#4ade80]" },
]

// ─── CYP450 Data ────────────────────────────────────────────────────────────

const CYP_ENZYMES: CYPEnzyme[] = [
  { name: "CYP2D6", allele: "*4/*4", status: "poor", pct: 15 },
  { name: "CYP2C19", allele: "*1/*1", status: "normal", pct: 90 },
  { name: "CYP2C9", allele: "*1/*3", status: "intermediate", pct: 55 },
  { name: "CYP3A4", allele: "*1/*1", status: "normal", pct: 85 },
  { name: "CYP1A2", allele: "*1F/*1F", status: "ultra-rapid", pct: 95 },
]

// ─── Heatmap Data ───────────────────────────────────────────────────────────

const HEATMAP_GENES = ["MTHFR", "COMT", "CYP2D6", "MAOA"]
const HEATMAP_SUPPLEMENTS = ["MTHF+", "COMT+", "VDR-D", "NAC-S", "B12-M", "MAOA+"]

const HEATMAP_DATA: Record<string, number[]> = {
  MTHFR:  [92, 12, 34, 8, 76, 15],
  COMT:   [5, 88, 2, 21, 4, 48],
  CYP2D6: [10, 6, 58, 45, 12, 22],
  MAOA:   [18, 42, 80, 65, 28, 91],
}

function heatmapCellStyle(val: number) {
  if (val >= 80) return "bg-[#4ade80] text-[#111827] font-black"
  if (val >= 60) return "bg-[#4ade80]/80 text-[#111827] font-bold"
  if (val >= 40) return "bg-[#4ade80]/40 text-white font-bold"
  if (val >= 20) return "bg-[#4ade80]/20 text-[#4ade80]"
  return "bg-[#4ade80]/10 text-[#4ade80]/60"
}

// ─── Dosing Recommendations ─────────────────────────────────────────────────

const DOSING_RECS: DosingRec[] = [
  { supplement: "5-MTHF", standardDose: "400mcg", adjustedDose: "1000mcg", direction: "increased", reason: "MTHFR Homozygous compensation" },
  { supplement: "Vitamin D3", standardDose: "2000IU", adjustedDose: "5000IU", direction: "increased", reason: "VDR Taq resistance" },
  { supplement: "COMT Balance", standardDose: "200mg", adjustedDose: "150mg", direction: "reduced", reason: "COMT slow — reduce catechol substrate" },
  { supplement: "NAC", standardDose: "600mg", adjustedDose: "1200mg", direction: "increased", reason: "CBS upregulation; glutathione demand" },
  { supplement: "Hydroxo-B12", standardDose: "1000mcg", adjustedDose: "2000mcg", direction: "increased", reason: "MTRR homozygous; impaired recycling" },
  { supplement: "Magnesium", standardDose: "400mg", adjustedDose: "400mg", direction: "unchanged", reason: "CYP normal; standard dosing adequate" },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function riskTextColor(level: RiskLevel) {
  switch (level) {
    case "HIGH": return "text-red-400"
    case "MOD":  return "text-[#ffc640]"
    case "LOW":  return "text-[#4ade80]"
  }
}

function functionalTagStyle(tag: string) {
  switch (tag) {
    case "Loss of Function": return "bg-red-500/10 text-red-400"
    case "Altered":          return "bg-[#ffc640]/10 text-[#ffc640]"
    case "Gain of Function": return "bg-[#4ade80]/10 text-[#4ade80]"
    default:                 return "bg-white/5 text-slate-400"
  }
}

function cypBarColor(status: CYPStatus) {
  switch (status) {
    case "poor":         return "bg-red-500"
    case "intermediate": return "bg-[#ffc640]"
    case "normal":       return "bg-[#4ade80]"
    case "ultra-rapid":  return "bg-[#a78bfa]"
  }
}

function cypLabel(status: CYPStatus) {
  switch (status) {
    case "poor":         return { text: "Poor", color: "text-red-400" }
    case "intermediate": return { text: "Intermediate", color: "text-[#ffc640]" }
    case "normal":       return { text: "Normal", color: "text-[#4ade80]" }
    case "ultra-rapid":  return { text: "Ultra-Rapid", color: "text-[#a78bfa]" }
  }
}

function adjDoseColor(dir: DoseDirection) {
  switch (dir) {
    case "increased": return "text-[#4ade80] font-black"
    case "reduced":   return "text-red-400 font-black"
    case "unchanged": return "text-slate-400"
  }
}

// ─── Glass card utility ─────────────────────────────────────────────────────

const glass = "bg-[#1f2937]/60 backdrop-blur-xl border border-white/5"

// ─── Page Component ─────────────────────────────────────────────────────────

export default function GenomicsPage() {
  const params = useParams<{ id: string }>()
  const patientId = params.id

  const [activePanel, setActivePanel] = useState("genex-m")
  const [doseSortField, setDoseSortField] = useState<SortField>("supplement")
  const [doseSortDir, setDoseSortDir] = useState<SortDir>("asc")

  const sortedDosing = useMemo(() => {
    const list = [...DOSING_RECS]
    list.sort((a, b) => {
      let cmp = 0
      switch (doseSortField) {
        case "supplement": cmp = a.supplement.localeCompare(b.supplement); break
        case "standard":   cmp = a.standardDose.localeCompare(b.standardDose); break
        case "adjusted":   cmp = a.adjustedDose.localeCompare(b.adjustedDose); break
        case "reason":     cmp = a.reason.localeCompare(b.reason); break
      }
      return doseSortDir === "asc" ? cmp : -cmp
    })
    return list
  }, [doseSortField, doseSortDir])

  function toggleDoseSort(field: SortField) {
    if (doseSortField === field) setDoseSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setDoseSortField(field); setDoseSortDir("asc") }
  }

  const DoseSortArrow = ({ field }: { field: SortField }) => {
    if (doseSortField !== field) return <ChevronUp className="h-3 w-3 opacity-20" />
    return doseSortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-[#4ade80]" />
      : <ChevronDown className="h-3 w-3 text-[#4ade80]" />
  }

  return (
    <div className="space-y-8">
      {/* ── Header ────────────────────────────────────────────── */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Link
            href={`/patients/${patientId}`}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#4ade80] transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Patient
          </Link>
          <h2 className="text-4xl font-extrabold tracking-tighter mb-2">Genomic Profile</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Patient:</span>
            <span className="text-[#4ade80] font-bold">Jane Smith</span>
            <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] text-[#ffc640] font-bold uppercase">
              ID: {patientId}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 rounded-xl border border-[#4ade80]/20 text-[#4ade80] font-semibold text-sm flex items-center gap-2 hover:bg-[#4ade80]/5 transition-colors">
            <FileDown className="h-4 w-4" />
            Export Report
          </button>
          <button className="px-5 py-2.5 rounded-xl bg-[#4ade80] text-[#111827] font-bold text-sm shadow-lg shadow-[#4ade80]/20 flex items-center gap-2 hover:bg-[#6bfb9a] transition-colors">
            <TestTube className="h-4 w-4" />
            Order New Test
          </button>
        </div>
      </section>

      {/* ── 1. GENEX PANEL SELECTOR ───────────────────────────── */}
      <nav className="flex flex-wrap gap-2">
        {PANEL_TABS.map((tab) => {
          const isActive = tab.id === activePanel
          return (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "bg-[#1f2937] text-slate-400 hover:text-white hover:bg-[#2e3545]"
              }`}
            >
              {tab.icon && <tab.icon className="h-3 w-3" />}
              {tab.name}
            </button>
          )
        })}
      </nav>

      {/* ── 2. SNP VARIANT GRID ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SNP_VARIANTS.map((snp) => (
          <div
            key={`${snp.gene}-${snp.variant}`}
            className={`${glass} p-5 rounded-2xl border-l-4 ${snp.borderColor}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-xl font-extrabold tracking-tight">{snp.gene}</h4>
                <p className="text-[9px] text-indigo-300 font-bold uppercase">{snp.rsId}</p>
              </div>
              <span className={`text-[9px] font-black uppercase tracking-tighter ${riskTextColor(snp.riskLevel)}`}>
                {snp.riskLabel}
              </span>
            </div>
            <div className="text-xs text-slate-400 mb-4">
              {snp.variant}
              <br />
              Genotype: <span className="text-white font-mono">{snp.genotype}</span>
            </div>
            <span className={`px-2 py-1 text-[10px] font-bold rounded ${functionalTagStyle(snp.functionalTag)}`}>
              {snp.functionalTag}
            </span>
          </div>
        ))}
      </div>

      {/* ── 3 & 4. CYP450 + HEATMAP (2-col) ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CYP450 Metabolizer Status */}
        <div className={`${glass} p-6 rounded-3xl`}>
          <div className="flex items-center gap-2 mb-6 font-extrabold uppercase text-sm tracking-tight">
            <FlaskConical className="h-4 w-4 text-[#ffc640]" />
            CYP450 Metabolizer Status
          </div>
          <div className="space-y-4">
            {CYP_ENZYMES.map((cyp) => {
              const label = cypLabel(cyp.status)
              return (
                <div key={cyp.name}>
                  <div className="flex justify-between text-[10px] font-bold mb-1 uppercase">
                    <span>
                      {cyp.name}{" "}
                      <span className="text-slate-500 normal-case">{cyp.allele}</span>
                    </span>
                    <span className={label.color}>{label.text}</span>
                  </div>
                  <div className="h-1 w-full bg-white/10 rounded-full">
                    <div
                      className={`h-full rounded-full ${cypBarColor(cyp.status)} transition-all duration-700`}
                      style={{ width: `${cyp.pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Gene-Supplement Heatmap */}
        <div className={`${glass} p-6 rounded-3xl`}>
          <div className="flex items-center gap-2 mb-6 font-extrabold uppercase text-sm tracking-tight">
            <Grid3X3 className="h-4 w-4 text-[#4ade80]" />
            Heatmap
          </div>
          <div className="grid gap-2 text-center text-[8px] font-bold uppercase" style={{ gridTemplateColumns: `auto repeat(${HEATMAP_SUPPLEMENTS.length}, 1fr)` }}>
            {/* Header row */}
            <div />
            {HEATMAP_SUPPLEMENTS.map((s) => (
              <div key={s} className="text-slate-400 truncate px-0.5">{s}</div>
            ))}
            {/* Data rows */}
            {HEATMAP_GENES.map((gene) => (
              <>
                <div key={`label-${gene}`} className="flex items-center text-white text-[9px] font-bold pr-1">{gene}</div>
                {HEATMAP_DATA[gene]!.map((val, i) => (
                  <div
                    key={`${gene}-${i}`}
                    className={`aspect-square rounded-md flex items-center justify-center text-[10px] ${heatmapCellStyle(val)}`}
                    title={`${gene} × ${HEATMAP_SUPPLEMENTS[i]}: ${val}`}
                  >
                    {val}
                  </div>
                ))}
              </>
            ))}
          </div>
        </div>
      </div>

      {/* ── 5. DOSING RECOMMENDATIONS TABLE ───────────────────── */}
      <section className={`${glass} rounded-3xl overflow-hidden`}>
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
          <h3 className="font-extrabold uppercase text-sm tracking-tight">Dosing Recommendations</h3>
          <span className="text-[10px] text-slate-500 uppercase">Mar 19, 2026</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 uppercase text-[10px] font-black text-slate-400">
              <tr>
                {([
                  ["supplement", "Supplement"],
                  ["standard", "Std"],
                  ["adjusted", "Adj"],
                  ["reason", "Reason"],
                ] as [SortField, string][]).map(([field, label]) => (
                  <th
                    key={field}
                    onClick={() => toggleDoseSort(field)}
                    className="px-6 py-3 cursor-pointer hover:text-slate-200 transition-colors select-none"
                  >
                    <span className="flex items-center gap-1">
                      {label}
                      <DoseSortArrow field={field} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedDosing.map((rec) => (
                <tr key={rec.supplement} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-bold text-white">{rec.supplement}</td>
                  <td className="px-6 py-4 text-slate-400">{rec.standardDose}</td>
                  <td className={`px-6 py-4 ${adjDoseColor(rec.direction)}`}>
                    <span className="flex items-center gap-1">
                      {rec.direction === "increased" && <ArrowUpRight className="h-3 w-3" />}
                      {rec.direction === "reduced" && <ArrowDownRight className="h-3 w-3" />}
                      {rec.adjustedDose}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{rec.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex items-start gap-2 p-3 bg-[#ffc640]/5 border border-[#ffc640]/20 rounded-xl text-xs text-[#ffc640]">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span><strong>Clinical Note:</strong> Dosing adjustments are genotype-informed suggestions. Validate against current medications, labs, and clinical context before prescribing.</span>
      </div>

      {/* ── 6. PEPTIDEIQ / CANNABISIQ BADGES ──────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PeptideIQ */}
        <div className="h-32 rounded-3xl p-6 bg-gradient-to-br from-[#4ade80]/10 to-transparent border border-[#4ade80]/20 flex justify-between items-end">
          <div>
            <h3 className="text-2xl font-black text-[#4ade80] tracking-tighter">PeptideIQ</h3>
            <p className="text-xs text-slate-400">27 peptide-gene correlations</p>
          </div>
          <Brain className="h-8 w-8 text-[#4ade80]" />
        </div>

        {/* CannabisIQ */}
        <div className="h-32 rounded-3xl p-6 bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 flex justify-between items-end">
          <div>
            <h3 className="text-2xl font-black text-indigo-300 tracking-tighter">CannabisIQ</h3>
            <p className="text-xs text-slate-400">13 traits &middot; 5 wellness categories</p>
          </div>
          <Leaf className="h-8 w-8 text-indigo-300" />
        </div>
      </div>
    </div>
  )
}
