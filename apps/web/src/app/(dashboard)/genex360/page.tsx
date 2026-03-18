"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Dna,
  Apple,
  Activity,
  Clock,
  FlaskConical,
  Leaf,
  ArrowRight,
  Eye,
  FileDown,
  Search,
  ChevronRight,
  Sparkles,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

interface GenomicPanel {
  id: string
  name: string
  description: string
  icon: React.ElementType
  resultCount: number
  color: string
  bgColor: string
  borderColor: string
}

type ResultStatus = "completed" | "in_progress" | "pending" | "review"

interface RecentResult {
  id: string
  patientName: string
  panel: string
  panelId: string
  dateOrdered: string
  dateCompleted: string | null
  status: ResultStatus
}

// ─── Panel Data ─────────────────────────────────────────────────────────────

const PANELS: GenomicPanel[] = [
  {
    id: "genex-m",
    name: "GENEX-M\u2122",
    description: "Methylation & Core SNPs — 25+ SNPs including MTHFR, COMT, CYP450, VDR, APOE, and FTO analysis",
    icon: Dna,
    resultCount: 47,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    borderColor: "border-emerald-400/30",
  },
  {
    id: "nutrigen-dx",
    name: "NUTRIGEN-DX\u2122",
    description: "Nutrigenomic Profile — Genetic variants affecting vitamin, mineral, macronutrient, and fatty acid metabolism",
    icon: Apple,
    resultCount: 32,
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
    borderColor: "border-orange-400/30",
  },
  {
    id: "hormone-iq",
    name: "HormoneIQ\u2122",
    description: "Hormone Metabolism — 40+ hormones and metabolites via DUTCH Complete analysis",
    icon: Activity,
    resultCount: 28,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    borderColor: "border-purple-400/30",
  },
  {
    id: "epigen-hq",
    name: "EpigenHQ\u2122",
    description: "Epigenetic Age Analysis — 853,307 CpG sites for biological age determination and aging markers",
    icon: Clock,
    resultCount: 15,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    borderColor: "border-blue-400/30",
  },
  {
    id: "peptide-iq",
    name: "PeptideIQ\u2122",
    description: "Peptide Response Optimization — BPC-157, Thymosin Beta-4, CJC-1295, Ipamorelin response profiling",
    icon: FlaskConical,
    resultCount: 19,
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/10",
    borderColor: "border-cyan-400/30",
  },
  {
    id: "cannabis-iq",
    name: "CannabisIQ\u2122",
    description: "Cannabinoid Response Profile — Endocannabinoid system genetics including CNR1, FAAH, and MGLL variants",
    icon: Leaf,
    resultCount: 12,
    color: "text-green-400",
    bgColor: "bg-green-400/10",
    borderColor: "border-green-400/30",
  },
]

// ─── Status Config ──────────────────────────────────────────────────────────

const STATUS_MAP: Record<ResultStatus, { label: string; color: string; bg: string }> = {
  completed: { label: "Completed", color: "text-green-400", bg: "bg-green-400/10 border border-green-400/20" },
  in_progress: { label: "In Progress", color: "text-blue-400", bg: "bg-blue-400/10 border border-blue-400/20" },
  pending: { label: "Pending", color: "text-yellow-400", bg: "bg-yellow-400/10 border border-yellow-400/20" },
  review: { label: "Needs Review", color: "text-[#a78bfa]", bg: "bg-[#a78bfa]/10 border border-[#a78bfa]/20" },
}

// ─── Recent Results ─────────────────────────────────────────────────────────

const RECENT_RESULTS: RecentResult[] = [
  { id: "gr-001", patientName: "Maria Gonzalez", panel: "GENEX-M\u2122", panelId: "genex-m", dateOrdered: "2026-02-28", dateCompleted: "2026-03-10", status: "completed" },
  { id: "gr-002", patientName: "James Chen", panel: "NUTRIGEN-DX\u2122", panelId: "nutrigen-dx", dateOrdered: "2026-03-01", dateCompleted: "2026-03-12", status: "completed" },
  { id: "gr-003", patientName: "Aisha Patel", panel: "HormoneIQ\u2122", panelId: "hormone-iq", dateOrdered: "2026-03-05", dateCompleted: "2026-03-15", status: "review" },
  { id: "gr-004", patientName: "Robert Williams", panel: "GENEX-M\u2122", panelId: "genex-m", dateOrdered: "2026-03-08", dateCompleted: "2026-03-16", status: "completed" },
  { id: "gr-005", patientName: "Elena Vasquez", panel: "EpigenHQ\u2122", panelId: "epigen-hq", dateOrdered: "2026-03-10", dateCompleted: null, status: "in_progress" },
  { id: "gr-006", patientName: "David Nakamura", panel: "PeptideIQ\u2122", panelId: "peptide-iq", dateOrdered: "2026-03-12", dateCompleted: null, status: "pending" },
  { id: "gr-007", patientName: "Sarah Thompson", panel: "CannabisIQ\u2122", panelId: "cannabis-iq", dateOrdered: "2026-03-13", dateCompleted: "2026-03-17", status: "completed" },
  { id: "gr-008", patientName: "Michael O'Brien", panel: "GENEX-M\u2122", panelId: "genex-m", dateOrdered: "2026-03-14", dateCompleted: null, status: "in_progress" },
]

// ─── Card class ─────────────────────────────────────────────────────────────
const card = "bg-gray-800/50 backdrop-blur-sm border border-[#a78bfa]/15 rounded-xl"

// ─── Page Component ─────────────────────────────────────────────────────────

export default function GeneX360Page() {
  const [search, setSearch] = useState("")

  const filteredResults = useMemo(() => {
    if (!search.trim()) return RECENT_RESULTS
    const q = search.toLowerCase()
    return RECENT_RESULTS.filter(
      (r) => r.patientName.toLowerCase().includes(q) || r.panel.toLowerCase().includes(q)
    )
  }, [search])

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 min-h-screen bg-[#111827] text-slate-200 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dna className="h-5 w-5 text-[#a78bfa]" />
            <h1 className="text-xl font-black tracking-tighter text-[#a78bfa]">GeneX360</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a78bfa] to-purple-600 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-white">
            DR
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Page Title */}
        <div className="flex items-center gap-3">
          <div className="bg-[#a78bfa]/10 p-2.5 rounded-lg">
            <Dna className="h-6 w-6 text-[#a78bfa]" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Genomic Panels</h2>
            <p className="text-xs text-slate-500 mt-0.5">Comprehensive genomic analysis across 6 diagnostic panels</p>
          </div>
        </div>

        {/* Panel Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PANELS.map((panel) => {
            const Icon = panel.icon
            return (
              <Link key={panel.id} href={`/genex360/${panel.id}`} className="group">
                <div className={`${card} p-5 h-full flex flex-col justify-between hover:border-[#a78bfa]/30 transition-all group-hover:shadow-[0_0_20px_rgba(167,139,250,0.08)]`}>
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${panel.bgColor}`}>
                        <Icon className={`h-5 w-5 ${panel.color}`} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                        {panel.resultCount} results
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1.5">{panel.name}</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{panel.description}</p>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-[11px] text-[#a78bfa] font-semibold group-hover:gap-2.5 transition-all">
                    View Results <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Separator */}
        <div className="border-t border-slate-800" />

        {/* Recent Results */}
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#a78bfa]" />
              Recent Results
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient or panel..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#a78bfa]/40"
              />
            </div>
          </div>

          <div className={`${card} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/50 text-[10px] text-slate-500 uppercase tracking-wider">
                  <tr className="border-b border-slate-800">
                    <th className="px-5 py-3 font-semibold">Patient</th>
                    <th className="px-5 py-3 font-semibold">Panel</th>
                    <th className="px-5 py-3 font-semibold">Date Ordered</th>
                    <th className="px-5 py-3 font-semibold">Date Completed</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredResults.map((result) => {
                    const statusInfo = STATUS_MAP[result.status]
                    return (
                      <tr key={result.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-white">{result.patientName}</td>
                        <td className="px-5 py-3.5 text-slate-400">{result.panel}</td>
                        <td className="px-5 py-3.5 text-slate-500 font-mono">{result.dateOrdered}</td>
                        <td className="px-5 py-3.5 text-slate-500 font-mono">{result.dateCompleted ?? "\u2014"}</td>
                        <td className="px-5 py-3.5">
                          <span className={`${statusInfo.bg} ${statusInfo.color} text-[10px] font-bold px-2.5 py-0.5 rounded-full`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/genex360/${result.panelId}`}>
                              <button className="p-1.5 rounded-lg text-slate-500 hover:text-[#a78bfa] hover:bg-[#a78bfa]/10 transition-colors">
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            </Link>
                            <button className="p-1.5 rounded-lg text-slate-500 hover:text-[#a78bfa] hover:bg-[#a78bfa]/10 transition-colors">
                              <FileDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredResults.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                        No results match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
