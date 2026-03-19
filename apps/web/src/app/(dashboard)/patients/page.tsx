"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import Link from "next/link"
import {
  Search,
  Plus,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ClipboardList,
  Download,
  Send,
  Archive,
  MoreVertical,
  Dna,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

type PatientStatus = "active" | "follow-up" | "concerning" | "archived"
type GeneticStatus = "GX360" | "Pending" | "Not Tested"
type OutcomeTrend = "up" | "down" | "flat"
type SortField = "name" | "mrn" | "age" | "lastVisit" | "protocols" | "genetic"
type SortDir = "asc" | "desc"
type FilterChip = "All" | "Active" | "Needs Follow-up" | "Archived"

interface Patient {
  id: string
  name: string
  email: string
  mrn: string
  age: number
  lastVisit: string
  lastVisitTs: number
  activeProtocols: string[]
  outcomeTrend: OutcomeTrend
  geneticStatus: GeneticStatus
  geneticDetail: string
  status: PatientStatus
}

// ─── Mock Data (15 patients) ────────────────────────────────────────────────

const PATIENTS: Patient[] = [
  { id: "pt-001", name: "Elena Vance", email: "evance@clinician.web", mrn: "MRN-88219-X", age: 38, lastVisit: "Mar 18, 2026", lastVisitTs: 20260318, activeProtocols: ["A-14 BioPulse"], outcomeTrend: "up", geneticStatus: "GX360", geneticDetail: "Positive", status: "active" },
  { id: "pt-002", name: "Marcus Sterling", email: "msterling@med.net", mrn: "MRN-44102-A", age: 54, lastVisit: "Mar 18, 2026", lastVisitTs: 20260318, activeProtocols: ["Neuro-V", "Cardio-RS"], outcomeTrend: "down", geneticStatus: "GX360", geneticDetail: "Carrier", status: "concerning" },
  { id: "pt-003", name: "Sarah Chen", email: "schen@hospital.org", mrn: "MRN-77301-B", age: 42, lastVisit: "Mar 17, 2026", lastVisitTs: 20260317, activeProtocols: ["Site-04"], outcomeTrend: "flat", geneticStatus: "Pending", geneticDetail: "", status: "active" },
  { id: "pt-004", name: "James Wilson", email: "jwilson@clinic.co", mrn: "MRN-55120-C", age: 58, lastVisit: "Mar 16, 2026", lastVisitTs: 20260316, activeProtocols: ["A-14 BioPulse", "Neuro-V", "GI-Track", "Site-04"], outcomeTrend: "up", geneticStatus: "GX360", geneticDetail: "Positive", status: "active" },
  { id: "pt-005", name: "Amara Osei", email: "aosei@health.org", mrn: "MRN-92013-D", age: 63, lastVisit: "Mar 16, 2026", lastVisitTs: 20260316, activeProtocols: ["Cardio-RS", "GI-Track"], outcomeTrend: "down", geneticStatus: "GX360", geneticDetail: "Negative", status: "concerning" },
  { id: "pt-006", name: "Rebecca Lawson", email: "rlawson@med.net", mrn: "MRN-30819-E", age: 29, lastVisit: "Mar 15, 2026", lastVisitTs: 20260315, activeProtocols: ["Site-04"], outcomeTrend: "up", geneticStatus: "Not Tested", geneticDetail: "", status: "active" },
  { id: "pt-007", name: "Thomas Bergström", email: "tbergstrom@lab.se", mrn: "MRN-61020-F", age: 48, lastVisit: "Mar 15, 2026", lastVisitTs: 20260315, activeProtocols: ["Neuro-V", "A-14 BioPulse", "Immuno-X"], outcomeTrend: "up", geneticStatus: "GX360", geneticDetail: "Carrier", status: "active" },
  { id: "pt-008", name: "Priya Nair", email: "pnair@clinic.in", mrn: "MRN-48921-G", age: 34, lastVisit: "Mar 14, 2026", lastVisitTs: 20260314, activeProtocols: ["GI-Track"], outcomeTrend: "flat", geneticStatus: "Pending", geneticDetail: "", status: "follow-up" },
  { id: "pt-009", name: "David Okafor", email: "dokafor@health.ng", mrn: "MRN-73015-H", age: 46, lastVisit: "Mar 14, 2026", lastVisitTs: 20260314, activeProtocols: ["Cardio-RS", "Site-04"], outcomeTrend: "up", geneticStatus: "GX360", geneticDetail: "Positive", status: "active" },
  { id: "pt-010", name: "Sophia Martinez", email: "smartinez@med.com", mrn: "MRN-15840-J", age: 55, lastVisit: "Mar 13, 2026", lastVisitTs: 20260313, activeProtocols: ["A-14 BioPulse", "Neuro-V", "Immuno-X"], outcomeTrend: "down", geneticStatus: "GX360", geneticDetail: "Carrier", status: "concerning" },
  { id: "pt-011", name: "Lin Wei", email: "lwei@hospital.cn", mrn: "MRN-28937-K", age: 36, lastVisit: "Mar 12, 2026", lastVisitTs: 20260312, activeProtocols: [], outcomeTrend: "flat", geneticStatus: "Not Tested", geneticDetail: "", status: "active" },
  { id: "pt-012", name: "Carlos Gutierrez", email: "cgutierrez@med.mx", mrn: "MRN-67201-L", age: 61, lastVisit: "Mar 11, 2026", lastVisitTs: 20260311, activeProtocols: ["Cardio-RS", "GI-Track"], outcomeTrend: "up", geneticStatus: "GX360", geneticDetail: "Negative", status: "follow-up" },
  { id: "pt-013", name: "Fatima Al-Rashid", email: "falrashid@health.ae", mrn: "MRN-41038-M", age: 47, lastVisit: "Mar 10, 2026", lastVisitTs: 20260310, activeProtocols: ["Site-04"], outcomeTrend: "flat", geneticStatus: "Pending", geneticDetail: "", status: "follow-up" },
  { id: "pt-014", name: "Daniel Kowalski", email: "dkowalski@clinic.pl", mrn: "MRN-84206-N", age: 53, lastVisit: "Mar 9, 2026", lastVisitTs: 20260309, activeProtocols: ["A-14 BioPulse", "Neuro-V"], outcomeTrend: "up", geneticStatus: "GX360", geneticDetail: "Positive", status: "archived" },
  { id: "pt-015", name: "Aisha Patel", email: "apatel@clinic.uk", mrn: "MRN-59104-P", age: 31, lastVisit: "Mar 8, 2026", lastVisitTs: 20260308, activeProtocols: ["GI-Track"], outcomeTrend: "up", geneticStatus: "Not Tested", geneticDetail: "", status: "archived" },
]

const FILTER_CHIPS: FilterChip[] = ["All", "Active", "Needs Follow-up", "Archived"]
const TOTAL_RECORDS = 247
const PAGE_SIZE = 50

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusDot(status: PatientStatus) {
  switch (status) {
    case "active":
      return "bg-[#6bfb9a] shadow-[0_0_8px_rgba(107,251,154,0.5)]"
    case "follow-up":
      return "bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.3)]"
    case "concerning":
      return "bg-[#a40217] animate-pulse"
    case "archived":
      return "bg-[#3d4a3e]"
  }
}

function geneticDisplay(status: GeneticStatus, detail: string) {
  switch (status) {
    case "GX360":
      return { icon: true, text: `GX360 (${detail})`, cls: "text-[#6bfb9a] font-bold" }
    case "Pending":
      return { icon: false, text: "Pending Results...", cls: "text-[#dce2f7]/30 italic" }
    case "Not Tested":
      return { icon: false, text: "Not Tested", cls: "text-[#dce2f7]/20" }
  }
}

function trendIcon(trend: OutcomeTrend) {
  switch (trend) {
    case "up":
      return { Icon: ArrowUpRight, color: "text-[#6bfb9a]" }
    case "down":
      return { Icon: ArrowDownRight, color: "text-[#a40217]" }
    case "flat":
      return { Icon: Minus, color: "text-[#dce2f7]/30" }
  }
}

function filterMatch(patient: Patient, chip: FilterChip): boolean {
  switch (chip) {
    case "All":
      return true
    case "Active":
      return patient.status === "active" || patient.status === "concerning"
    case "Needs Follow-up":
      return patient.status === "follow-up"
    case "Archived":
      return patient.status === "archived"
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function PatientsPage() {
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [activeChip, setActiveChip] = useState<FilterChip>("All")
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 300ms debounced search
  const handleSearch = useCallback((value: string) => {
    setSearchInput(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 300)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  // Filter & sort
  const filtered = useMemo(() => {
    let list = PATIENTS.filter((p) => filterMatch(p, activeChip))

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.mrn.toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case "name": cmp = a.name.localeCompare(b.name); break
        case "mrn": cmp = a.mrn.localeCompare(b.mrn); break
        case "age": cmp = a.age - b.age; break
        case "lastVisit": cmp = a.lastVisitTs - b.lastVisitTs; break
        case "protocols": cmp = a.activeProtocols.length - b.activeProtocols.length; break
        case "genetic": cmp = a.geneticStatus.localeCompare(b.geneticStatus); break
      }
      return sortDir === "asc" ? cmp : -cmp
    })

    return list
  }, [debouncedSearch, activeChip, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(TOTAL_RECORDS / PAGE_SIZE))

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortField(field); setSortDir("asc") }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((p) => p.id)))
  }

  const SortArrow = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 opacity-20" />
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-[#6bfb9a]" />
      : <ChevronDown className="h-3 w-3 text-[#6bfb9a]" />
  }

  return (
    <div className="space-y-0">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight mb-2">Patients</h2>
          <p className="text-[#dce2f7]/50 font-mono uppercase tracking-widest text-xs">
            Clinical Registry / Site 04-Obsidian
          </p>
        </div>
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#dce2f7]/40 group-focus-within:text-[#6bfb9a] transition-colors" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search patients, MRN, or protocols..."
            className="w-full bg-[#141b2b] border-none rounded-xl py-3 pl-12 pr-16 text-sm text-[#dce2f7] focus:ring-1 focus:ring-[#6bfb9a]/40 focus:outline-none placeholder:text-[#dce2f7]/30"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
            <kbd className="bg-[#2e3545] px-1.5 py-0.5 rounded text-[10px] font-mono text-[#dce2f7]/40 border border-[#3d4a3e]/20">CMD</kbd>
            <kbd className="bg-[#2e3545] px-1.5 py-0.5 rounded text-[10px] font-mono text-[#dce2f7]/40 border border-[#3d4a3e]/20">K</kbd>
          </div>
        </div>
      </div>

      {/* ── Filters & Bulk Actions Row ────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => { setActiveChip(chip); setPage(1); setSelected(new Set()) }}
              className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                activeChip === chip
                  ? "bg-[#6bfb9a]/10 text-[#6bfb9a] border border-[#6bfb9a]/20"
                  : "text-[#dce2f7]/60 hover:bg-[#232a3a] border border-transparent"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Inline bulk actions (shown when selected) */}
        {selected.size > 0 && (
          <div className="hidden sm:flex items-center gap-3 bg-[#6bfb9a]/5 px-4 py-2 rounded-xl border border-[#6bfb9a]/10">
            <span className="text-xs font-bold text-[#6bfb9a]">{selected.size} Selected</span>
            <div className="w-px h-4 bg-[#6bfb9a]/20 mx-1" />
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-[#dce2f7]/60 hover:text-[#6bfb9a] transition-colors"
            >
              Clear
            </button>
            <div className="w-px h-4 bg-[#6bfb9a]/20 mx-1" />
            <button className="text-xs text-[#dce2f7]/80 hover:text-[#6bfb9a] transition-colors flex items-center gap-1">
              <ClipboardList className="h-3.5 w-3.5" /> Assign
            </button>
            <button className="text-xs text-[#dce2f7]/80 hover:text-[#6bfb9a] transition-colors flex items-center gap-1">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button className="text-xs text-[#dce2f7]/80 hover:text-[#6bfb9a] transition-colors flex items-center gap-1">
              <Send className="h-3.5 w-3.5" /> Remind
            </button>
            <button className="text-xs text-[#a40217] hover:text-red-400 transition-colors flex items-center gap-1">
              <Archive className="h-3.5 w-3.5" /> Archive
            </button>
          </div>
        )}
      </div>

      {/* ── Data Table (Obsidian Slab) ────────────────────────── */}
      <div className="bg-[#141b2b] rounded-3xl overflow-hidden shadow-2xl border border-[#3d4a3e]/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#141b2b]/80">
                {/* Checkbox */}
                <th className="px-6 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="rounded bg-[#2e3545] border-none text-[#6bfb9a] focus:ring-[#6bfb9a]/30 focus:ring-offset-[#0c1322] cursor-pointer"
                  />
                </th>
                {/* Status */}
                <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-[#dce2f7]/40">Status</th>
                {/* Sortable columns */}
                {([
                  ["name", "Patient Identity"],
                  ["mrn", "MRN"],
                  ["age", "Age"],
                  ["lastVisit", "Last Visit"],
                  ["protocols", "Active Protocols"],
                ] as [SortField, string][]).map(([field, label]) => (
                  <th
                    key={field}
                    onClick={() => toggleSort(field)}
                    className="px-6 py-4 font-mono text-[10px] uppercase tracking-widest text-[#dce2f7]/40 cursor-pointer hover:text-[#dce2f7]/60 transition-colors select-none whitespace-nowrap"
                  >
                    <span className="flex items-center gap-1">
                      {label}
                      <SortArrow field={field} />
                    </span>
                  </th>
                ))}
                {/* Trend */}
                <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-widest text-[#dce2f7]/40 whitespace-nowrap">
                  Trend
                </th>
                {/* Genetic */}
                <th
                  onClick={() => toggleSort("genetic")}
                  className="px-6 py-4 font-mono text-[10px] uppercase tracking-widest text-[#dce2f7]/40 cursor-pointer hover:text-[#dce2f7]/60 transition-colors select-none whitespace-nowrap"
                >
                  <span className="flex items-center gap-1">
                    Genetic Status
                    <SortArrow field="genetic" />
                  </span>
                </th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-transparent">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center text-[#dce2f7]/30 text-sm">
                    No patients match your search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((patient, idx) => {
                  const isSelected = selected.has(patient.id)
                  const isAlt = idx % 2 === 1
                  const { Icon: TrendIcon, color: trendColor } = trendIcon(patient.outcomeTrend)
                  const genetic = geneticDisplay(patient.geneticStatus, patient.geneticDetail)

                  return (
                    <tr
                      key={patient.id}
                      className={`group hover:bg-[#232a3a] transition-colors duration-150 ${
                        isAlt ? "bg-[#070e1d]/40" : ""
                      } ${isSelected ? "bg-[#232a3a]" : ""}`}
                    >
                      {/* Checkbox */}
                      <td className="px-6 py-5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(patient.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded bg-[#2e3545] border-none text-[#6bfb9a] focus:ring-[#6bfb9a]/30 focus:ring-offset-[#0c1322] cursor-pointer"
                        />
                      </td>
                      {/* Status dot */}
                      <td className="px-4 py-5">
                        <div className={`w-2.5 h-2.5 rounded-full ${statusDot(patient.status)}`} />
                      </td>
                      {/* Name + email */}
                      <td className="px-6 py-5">
                        <Link href={`/patients/${patient.id}`} className="block">
                          <span className="font-bold text-sm text-[#dce2f7]">{patient.name}</span>
                          <span className="block text-xs text-[#dce2f7]/40 mt-0.5">{patient.email}</span>
                        </Link>
                      </td>
                      {/* MRN */}
                      <td className="px-6 py-5 font-mono text-xs text-[#6bfb9a]/80">{patient.mrn}</td>
                      {/* Age */}
                      <td className="px-6 py-5 text-sm text-[#dce2f7]/60">{patient.age}</td>
                      {/* Last Visit */}
                      <td className="px-6 py-5 text-sm text-[#dce2f7]/60 whitespace-nowrap">{patient.lastVisit}</td>
                      {/* Active Protocols */}
                      <td className="px-6 py-5">
                        {patient.activeProtocols.length === 0 ? (
                          <span className="bg-[#2e3545] text-[#dce2f7]/60 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            None Active
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {patient.activeProtocols.slice(0, 2).map((p) => (
                              <span
                                key={p}
                                className="bg-[#6bfb9a]/10 text-[#6bfb9a] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                              >
                                {p}
                              </span>
                            ))}
                            {patient.activeProtocols.length > 2 && (
                              <span className="bg-[#2e3545] text-[#dce2f7]/60 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                +{patient.activeProtocols.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      {/* Outcome Trend */}
                      <td className="px-6 py-5">
                        <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                      </td>
                      {/* Genetic Status */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          {genetic.icon && (
                            <Dna className="h-4 w-4 text-[#6bfb9a]" />
                          )}
                          <span className={`text-xs ${genetic.cls}`}>{genetic.text}</span>
                        </div>
                      </td>
                      {/* Row action */}
                      <td className="px-6 py-5 text-right">
                        <button className="p-2 hover:bg-[#2e3545] rounded-lg transition-colors">
                          <MoreVertical className="h-4 w-4 text-[#dce2f7]/40" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ─────────────────────────────────── */}
        <div className="px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-[#141b2b]/60 border-t border-[#3d4a3e]/5">
          <span className="text-xs font-mono text-[#dce2f7]/40 uppercase tracking-widest">
            Showing 1&ndash;{filtered.length} of {TOTAL_RECORDS} records
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#232a3a] text-[#dce2f7]/40 hover:text-[#6bfb9a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#232a3a] text-[#dce2f7]/40 hover:text-[#6bfb9a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center px-4 font-mono text-xs text-[#6bfb9a]">
              {page} / {totalPages}
            </div>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#232a3a] text-[#dce2f7]/40 hover:text-[#6bfb9a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#232a3a] text-[#dce2f7]/40 hover:text-[#6bfb9a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Bulk Actions (sticky bottom) ───────────────── */}
      {selected.size > 0 && (
        <div className="sm:hidden sticky bottom-20 z-40 bg-[#232a3a] border-t border-[#6bfb9a]/15 px-5 py-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[#6bfb9a]">{selected.size} selected</span>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-[#dce2f7]/60 hover:underline"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg bg-[#141b2b] text-[#dce2f7]/70 hover:text-[#6bfb9a]">
              <Download className="h-4 w-4" />
            </button>
            <button className="p-2 rounded-lg bg-[#141b2b] text-[#a40217] hover:text-red-400">
              <Archive className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
