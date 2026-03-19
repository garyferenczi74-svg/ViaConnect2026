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
  ExternalLink,
  AlertTriangle,
  Beaker,
  Leaf,
  Sparkles,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

type RiskLevel = "HIGH" | "MOD" | "LOW"
type CYPStatus = "poor" | "intermediate" | "normal" | "ultra-rapid"
type HeatmapIntensity = "strong" | "moderate" | "weak" | "none"
type DoseDirection = "increased" | "reduced" | "unchanged"
type SortField = "supplement" | "standard" | "adjusted" | "confidence"
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
  functionalImpact: string
  pathways: string[]
}

interface CYPEnzyme {
  name: string
  allele: string
  status: CYPStatus
  pct: number
  label: string
}

interface HeatmapCell {
  value: number
  intensity: HeatmapIntensity
}

interface DosingRec {
  supplement: string
  standardDose: string
  adjustedDose: string
  direction: DoseDirection
  reason: string
  confidence: number
}

// ─── Panel Tabs ─────────────────────────────────────────────────────────────

const PANEL_TABS: PanelTab[] = [
  { id: "genex-m", name: "GENEX-M" },
  { id: "genex-n", name: "GENEX-N" },
  { id: "genex-c", name: "GENEX-C" },
  { id: "genex-d", name: "GENEX-D" },
  { id: "genex-i", name: "GENEX-I" },
  { id: "complete", name: "GeneX360 Complete", icon: Star },
]

// ─── SNP Variants (GENEX-M Methylation) ─────────────────────────────────────

const SNP_VARIANTS: SNPVariant[] = [
  { gene: "MTHFR", variant: "C677T", rsId: "rs1801133", genotype: "T/T (Homozygous)", riskLevel: "MOD", functionalImpact: "~30% residual enzyme activity; impaired folate→methylfolate conversion", pathways: ["Methylation", "Homocysteine"] },
  { gene: "MTHFR", variant: "A1298C", rsId: "rs1801131", genotype: "A/C (Heterozygous)", riskLevel: "LOW", functionalImpact: "Mild reduction in BH4 recycling; minor impact on neurotransmitter synthesis", pathways: ["BH4 Cycle", "Neurotransmitter"] },
  { gene: "MTR", variant: "A2756G", rsId: "rs1805087", genotype: "A/G (Heterozygous)", riskLevel: "LOW", functionalImpact: "Mildly altered methionine synthase activity; adequate B12 recycling", pathways: ["Methionine Cycle"] },
  { gene: "MTRR", variant: "A66G", rsId: "rs1801394", genotype: "G/G (Homozygous)", riskLevel: "MOD", functionalImpact: "Impaired methionine synthase reductase; reduced B12 regeneration", pathways: ["B12 Recycling", "Methylation"] },
  { gene: "BHMT", variant: "G742A", rsId: "rs3733890", genotype: "G/A (Heterozygous)", riskLevel: "LOW", functionalImpact: "Moderate betaine-homocysteine methyltransferase; alternative pathway intact", pathways: ["Betaine Pathway"] },
  { gene: "CBS", variant: "C699T", rsId: "rs234706", genotype: "C/T (Heterozygous)", riskLevel: "MOD", functionalImpact: "Upregulated CBS activity; increased sulfur metabolite flux", pathways: ["Transsulfuration", "Glutathione"] },
]

// ─── CYP450 Data ────────────────────────────────────────────────────────────

const CYP_ENZYMES: CYPEnzyme[] = [
  { name: "CYP2D6", allele: "*1/*41", status: "intermediate", pct: 45, label: "Intermediate Metabolizer" },
  { name: "CYP2C19", allele: "*1/*1", status: "normal", pct: 75, label: "Normal Metabolizer" },
  { name: "CYP2C9", allele: "*1/*3", status: "intermediate", pct: 45, label: "Intermediate Metabolizer" },
  { name: "CYP3A4", allele: "*1/*1", status: "normal", pct: 75, label: "Normal Metabolizer" },
  { name: "CYP1A2", allele: "*1F/*1F", status: "ultra-rapid", pct: 95, label: "Ultra-Rapid Metabolizer" },
]

// ─── Heatmap Data ───────────────────────────────────────────────────────────

const HEATMAP_GENES = ["MTHFR", "COMT", "CYP2D6", "MAOA"]
const HEATMAP_SUPPLEMENTS = ["MTHFR+", "COMT+", "RELAX+", "FOCUS+", "NAD+", "MAOA+"]

function getHeatmapValue(gene: string, supp: string): HeatmapCell {
  const map: Record<string, Record<string, number>> = {
    MTHFR:  { "MTHFR+": 0.95, "COMT+": 0.3,  "RELAX+": 0.2,  "FOCUS+": 0.15, "NAD+": 0.65, "MAOA+": 0.1 },
    COMT:   { "MTHFR+": 0.4,  "COMT+": 0.92, "RELAX+": 0.7,  "FOCUS+": 0.85, "NAD+": 0.25, "MAOA+": 0.55 },
    CYP2D6: { "MTHFR+": 0.1,  "COMT+": 0.15, "RELAX+": 0.6,  "FOCUS+": 0.55, "NAD+": 0.1,  "MAOA+": 0.3 },
    MAOA:   { "MTHFR+": 0.2,  "COMT+": 0.45, "RELAX+": 0.85, "FOCUS+": 0.7,  "NAD+": 0.3,  "MAOA+": 0.93 },
  }
  const val = map[gene]?.[supp] ?? 0
  const intensity: HeatmapIntensity =
    val > 0.8 ? "strong" : val >= 0.5 ? "moderate" : val >= 0.2 ? "weak" : "none"
  return { value: val, intensity }
}

function heatmapColor(intensity: HeatmapIntensity) {
  switch (intensity) {
    case "strong":   return "bg-[#4ade80]/80 text-gray-900"
    case "moderate": return "bg-[#4ade80]/40 text-white"
    case "weak":     return "bg-[#4ade80]/20 text-white/70"
    case "none":     return "bg-[#232a3a] text-white/20"
  }
}

// ─── Dosing Recommendations ─────────────────────────────────────────────────

const DOSING_RECS: DosingRec[] = [
  { supplement: "MTHFR+", standardDose: "5mg", adjustedDose: "7.5mg", direction: "increased", reason: "MTHFR C677T homozygous — 70% enzyme activity loss requires higher methylfolate input", confidence: 92 },
  { supplement: "FOCUS+", standardDose: "200mg", adjustedDose: "150mg", direction: "reduced", reason: "COMT heterozygous — slower catecholamine clearance; reduce stimulatory compounds", confidence: 78 },
  { supplement: "NAD+", standardDose: "250mg", adjustedDose: "375mg", direction: "increased", reason: "MTRR homozygous — impaired B12 recycling drives higher NAD+ precursor demand", confidence: 85 },
  { supplement: "RELAX+", standardDose: "400mg", adjustedDose: "300mg", direction: "reduced", reason: "CYP1A2 ultra-rapid — accelerated clearance of GABAergic compounds; net sedation lower", confidence: 71 },
  { supplement: "MAOA+", standardDose: "100mg", adjustedDose: "150mg", direction: "increased", reason: "MAOA fast variant — rapid serotonin/dopamine turnover benefits from increased precursor support", confidence: 88 },
  { supplement: "COMT+", standardDose: "200mg", adjustedDose: "200mg", direction: "unchanged", reason: "COMT heterozygous — intermediate activity within acceptable supplementation range", confidence: 65 },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function riskBadge(level: RiskLevel) {
  switch (level) {
    case "HIGH": return "bg-red-400/20 text-red-400 border border-red-400/30"
    case "MOD":  return "bg-yellow-400/20 text-yellow-400 border border-yellow-400/30"
    case "LOW":  return "bg-green-400/20 text-green-400 border border-green-400/30"
  }
}

function cypBarColor(status: CYPStatus) {
  switch (status) {
    case "poor":        return "bg-red-400"
    case "intermediate": return "bg-yellow-400"
    case "normal":       return "bg-[#4ade80]"
    case "ultra-rapid":  return "bg-[#a78bfa]"
  }
}

function cypLabelColor(status: CYPStatus) {
  switch (status) {
    case "poor":        return "text-red-400"
    case "intermediate": return "text-yellow-400"
    case "normal":       return "text-[#4ade80]"
    case "ultra-rapid":  return "text-[#a78bfa]"
  }
}

function doseColor(dir: DoseDirection) {
  switch (dir) {
    case "increased": return "text-[#4ade80]"
    case "reduced":   return "text-red-400"
    case "unchanged": return "text-[#dce2f7]/40"
  }
}

function doseArrow(dir: DoseDirection) {
  switch (dir) {
    case "increased": return <ArrowUpRight className="h-3.5 w-3.5 text-[#4ade80]" />
    case "reduced":   return <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
    case "unchanged": return <span className="text-[#dce2f7]/30 text-xs">&mdash;</span>
  }
}

// ─── Card ───────────────────────────────────────────────────────────────────

const card = "bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl"

// ─── Page Component ─────────────────────────────────────────────────────────

export default function GenomicsPage() {
  const params = useParams<{ id: string }>()
  const patientId = params.id

  const [activePanel, setActivePanel] = useState("genex-m")
  const [doseSortField, setDoseSortField] = useState<SortField>("supplement")
  const [doseSortDir, setDoseSortDir] = useState<SortDir>("asc")

  // Sort dosing recs
  const sortedDosing = useMemo(() => {
    const list = [...DOSING_RECS]
    list.sort((a, b) => {
      let cmp = 0
      switch (doseSortField) {
        case "supplement": cmp = a.supplement.localeCompare(b.supplement); break
        case "standard": cmp = a.standardDose.localeCompare(b.standardDose); break
        case "adjusted": cmp = a.adjustedDose.localeCompare(b.adjustedDose); break
        case "confidence": cmp = a.confidence - b.confidence; break
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
      ? <ChevronUp className="h-3 w-3 text-[#a78bfa]" />
      : <ChevronDown className="h-3 w-3 text-[#a78bfa]" />
  }

  return (
    <div className="space-y-8">
      {/* ── Back Link + Header ────────────────────────────────── */}
      <div>
        <Link
          href={`/patients/${patientId}`}
          className="inline-flex items-center gap-1.5 text-xs text-[#dce2f7]/40 hover:text-[#a78bfa] transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Patient
        </Link>
        <div className="flex items-center gap-3">
          <div className="bg-[#a78bfa]/10 p-2.5 rounded-xl">
            <Dna className="h-6 w-6 text-[#a78bfa]" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Genomics Panel</h1>
            <p className="text-[#dce2f7]/50 font-mono uppercase tracking-widest text-[10px] mt-0.5">
              GeneX360 Genetic Analysis &middot; Patient {patientId}
            </p>
          </div>
        </div>
      </div>

      {/* ── 1. GENEX PANEL SELECTOR ───────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PANEL_TABS.map((tab) => {
          const isActive = tab.id === activePanel
          return (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? "bg-[#a78bfa]/20 text-[#a78bfa] border border-[#a78bfa]/30"
                  : "text-[#dce2f7]/40 border border-transparent hover:text-[#dce2f7]/70 hover:border-[#a78bfa]/20"
              }`}
            >
              {tab.icon && <tab.icon className="h-3.5 w-3.5" />}
              {tab.name}
            </button>
          )
        })}
      </div>

      {/* ── 2. SNP VARIANT GRID ───────────────────────────────── */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#dce2f7]/40 mb-4 flex items-center gap-2">
          <Dna className="h-4 w-4 text-[#a78bfa]" />
          SNP Variant Results &mdash; GENEX-M Methylation
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SNP_VARIANTS.map((snp) => (
            <div key={`${snp.gene}-${snp.variant}`} className={`${card} p-5 space-y-3`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{snp.gene}</h3>
                  <p className="text-sm text-[#dce2f7]/60">{snp.variant}</p>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${riskBadge(snp.riskLevel)}`}>
                  {snp.riskLevel}
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#dce2f7]/30 font-mono uppercase w-14 shrink-0">rsID</span>
                  <span className="font-mono text-xs text-[#a78bfa]/80">{snp.rsId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#dce2f7]/30 font-mono uppercase w-14 shrink-0">Geno</span>
                  <span className="text-xs text-white font-medium">{snp.genotype}</span>
                </div>
              </div>
              <p className="text-[11px] text-[#dce2f7]/50 leading-relaxed border-t border-[#3d4a3e]/20 pt-3">
                {snp.functionalImpact}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {snp.pathways.map((p) => (
                  <span key={p} className="text-[9px] font-bold text-[#a78bfa]/70 bg-[#a78bfa]/10 px-2 py-0.5 rounded-full">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. CYP450 METABOLIZER STATUS ──────────────────────── */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#dce2f7]/40 mb-4">
          CYP450 Metabolizer Status
        </h2>
        <div className={`${card} overflow-hidden`}>
          <div className="divide-y divide-[#3d4a3e]/10">
            {CYP_ENZYMES.map((cyp) => (
              <div key={cyp.name} className="px-6 py-4 flex items-center gap-6">
                {/* Enzyme name */}
                <div className="w-24 shrink-0">
                  <span className="text-sm font-bold text-white">{cyp.name}</span>
                  <span className="block text-[10px] font-mono text-[#dce2f7]/30 mt-0.5">{cyp.allele}</span>
                </div>
                {/* Progress bar */}
                <div className="flex-1">
                  <div className="h-3 w-full bg-[#141b2b] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cypBarColor(cyp.status)} transition-all duration-700`}
                      style={{ width: `${cyp.pct}%` }}
                    />
                  </div>
                </div>
                {/* Label */}
                <div className="w-48 text-right shrink-0">
                  <span className={`text-xs font-bold ${cypLabelColor(cyp.status)}`}>{cyp.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. GENE-SUPPLEMENT CORRELATION HEATMAP ────────────── */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#dce2f7]/40 mb-4">
          Gene&ndash;Supplement Correlation Heatmap
        </h2>
        <div className={`${card} p-6 overflow-x-auto`}>
          <table className="w-full min-w-[500px]">
            <thead>
              <tr>
                <th className="text-left text-[10px] font-mono text-[#dce2f7]/30 uppercase tracking-widest pb-3 pr-4">Gene</th>
                {HEATMAP_SUPPLEMENTS.map((s) => (
                  <th key={s} className="text-center text-[10px] font-mono text-[#dce2f7]/30 uppercase tracking-widest pb-3 px-1">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HEATMAP_GENES.map((gene) => (
                <tr key={gene}>
                  <td className="text-xs font-bold text-white py-1.5 pr-4">{gene}</td>
                  {HEATMAP_SUPPLEMENTS.map((supp) => {
                    const cell = getHeatmapValue(gene, supp)
                    return (
                      <td key={supp} className="px-1 py-1.5">
                        <div
                          className={`w-full h-10 rounded-lg flex items-center justify-center text-[10px] font-bold ${heatmapColor(cell.intensity)} transition-colors cursor-default`}
                          title={`${gene} × ${supp}: ${cell.value.toFixed(2)}`}
                        >
                          {cell.value.toFixed(2)}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#3d4a3e]/10">
            <span className="text-[10px] text-[#dce2f7]/30 font-mono uppercase">Intensity:</span>
            {(["strong", "moderate", "weak", "none"] as HeatmapIntensity[]).map((i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-4 h-4 rounded ${heatmapColor(i)}`} />
                <span className="text-[10px] text-[#dce2f7]/40 capitalize">{i} {i === "strong" ? ">0.8" : i === "moderate" ? "0.5-0.8" : i === "weak" ? "0.2-0.5" : "<0.2"}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. DOSING RECOMMENDATIONS TABLE ───────────────────── */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#dce2f7]/40 mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#a78bfa]" />
          Dosing Recommendations
        </h2>
        <div className={`${card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#141b2b]/60">
                  {([
                    ["supplement", "Supplement"],
                    ["standard", "Standard Dose"],
                    ["adjusted", "Adjusted Dose"],
                  ] as [SortField, string][]).map(([field, label]) => (
                    <th
                      key={field}
                      onClick={() => toggleDoseSort(field)}
                      className="px-6 py-3.5 text-[10px] font-mono text-[#dce2f7]/40 uppercase tracking-widest cursor-pointer hover:text-[#dce2f7]/60 transition-colors select-none"
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        <DoseSortArrow field={field} />
                      </span>
                    </th>
                  ))}
                  <th className="px-6 py-3.5 text-[10px] font-mono text-[#dce2f7]/40 uppercase tracking-widest">Reason</th>
                  <th
                    onClick={() => toggleDoseSort("confidence")}
                    className="px-6 py-3.5 text-[10px] font-mono text-[#dce2f7]/40 uppercase tracking-widest cursor-pointer hover:text-[#dce2f7]/60 transition-colors select-none"
                  >
                    <span className="flex items-center gap-1">
                      Confidence
                      <DoseSortArrow field="confidence" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3d4a3e]/10">
                {sortedDosing.map((rec) => (
                  <tr key={rec.supplement} className="hover:bg-[#232a3a]/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-white">{rec.supplement}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#dce2f7]/50 font-mono">{rec.standardDose}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {doseArrow(rec.direction)}
                        <span className={`text-sm font-bold font-mono ${doseColor(rec.direction)}`}>{rec.adjustedDose}</span>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          rec.direction === "increased"
                            ? "bg-[#4ade80]/10 text-[#4ade80]"
                            : rec.direction === "reduced"
                            ? "bg-red-400/10 text-red-400"
                            : "bg-[#232a3a] text-[#dce2f7]/30"
                        }`}>
                          {rec.direction}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[11px] text-[#dce2f7]/40 max-w-xs leading-relaxed">{rec.reason}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-[#141b2b] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              rec.confidence >= 85 ? "bg-[#4ade80]" : rec.confidence >= 70 ? "bg-[#fbbf24]" : "bg-red-400"
                            }`}
                            style={{ width: `${rec.confidence}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-[#dce2f7]/40">{rec.confidence}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex items-start gap-2 p-3 bg-[#fbbf24]/5 border border-[#fbbf24]/20 rounded-xl text-xs text-[#fbbf24] mt-3">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span><strong>Clinical Note:</strong> Dosing adjustments are genotype-informed suggestions. Validate against current medications, labs, and clinical context before prescribing.</span>
        </div>
      </section>

      {/* ── 6. PEPTIDEIQ / CANNABISIQ BADGES ──────────────────── */}
      <section className="grid md:grid-cols-2 gap-4">
        {/* PeptideIQ */}
        <div className="bg-[#4ade80]/5 border border-[#4ade80]/20 rounded-xl p-6 flex items-start gap-4">
          <div className="bg-[#4ade80]/10 p-3 rounded-xl shrink-0">
            <Beaker className="h-6 w-6 text-[#4ade80]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-bold text-white">PeptideIQ&#8482;</h3>
              <span className="text-[9px] font-bold text-[#4ade80] bg-[#4ade80]/10 px-2 py-0.5 rounded-full border border-[#4ade80]/20">AVAILABLE</span>
            </div>
            <p className="text-[11px] text-[#dce2f7]/40 leading-relaxed mb-3">
              <span className="text-white font-semibold">27 peptide-gene correlations</span> mapped across BPC-157, Thymosin Beta-4, CJC-1295, Ipamorelin, and more. Genetic variant analysis drives personalized peptide protocol optimization.
            </p>
            <button className="text-[10px] text-[#4ade80] font-bold flex items-center gap-1 hover:underline">
              View Panel <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* CannabisIQ */}
        <div className="bg-[#a78bfa]/5 border border-[#a78bfa]/20 rounded-xl p-6 flex items-start gap-4">
          <div className="bg-[#a78bfa]/10 p-3 rounded-xl shrink-0">
            <Leaf className="h-6 w-6 text-[#a78bfa]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-bold text-white">CannabisIQ&#8482;</h3>
              <span className="text-[9px] font-bold text-[#a78bfa] bg-[#a78bfa]/10 px-2 py-0.5 rounded-full border border-[#a78bfa]/20">CEDARGROWTH</span>
            </div>
            <p className="text-[11px] text-[#dce2f7]/40 leading-relaxed mb-3">
              <span className="text-white font-semibold">13 genetic traits &rarr; 5 wellness categories</span> &mdash; Cannabis DNA test mapping CNR1, FAAH, MGLL, and CYP2C9 variants to personalized THC/CBD ratio recommendations.
            </p>
            <button className="text-[10px] text-[#a78bfa] font-bold flex items-center gap-1 hover:underline">
              View Panel <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
