"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import Link from "next/link"
import {
  Search,
  Plus,
  ChevronUp,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ClipboardList,
  Download,
  Send,
  Archive,
  X,
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
  activeProtocols: number
  outcomeTrend: OutcomeTrend
  geneticStatus: GeneticStatus
  status: PatientStatus
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const PATIENTS: Patient[] = [
  { id: "pt-001", name: "Marcus Sterling", email: "m.sterling@mail.com", mrn: "NX-9022", age: 54, lastVisit: "Mar 18, 2026", lastVisitTs: 20260318, activeProtocols: 3, outcomeTrend: "up", geneticStatus: "GX360", status: "concerning" },
  { id: "pt-002", name: "Elena Vance", email: "e.vance@mail.com", mrn: "NX-4412", age: 38, lastVisit: "Mar 17, 2026", lastVisitTs: 20260317, activeProtocols: 2, outcomeTrend: "up", geneticStatus: "GX360", status: "active" },
  { id: "pt-003", name: "Sarah Chen", email: "s.chen@clinic.net", mrn: "NX-3819", age: 42, lastVisit: "Mar 17, 2026", lastVisitTs: 20260317, activeProtocols: 1, outcomeTrend: "flat", geneticStatus: "Pending", status: "active" },
  { id: "pt-004", name: "James Wilson", email: "j.wilson@mail.com", mrn: "NX-7721", age: 58, lastVisit: "Mar 16, 2026", lastVisitTs: 20260316, activeProtocols: 4, outcomeTrend: "up", geneticStatus: "GX360", status: "active" },
  { id: "pt-005", name: "Amara Osei", email: "a.osei@health.org", mrn: "NX-2834", age: 63, lastVisit: "Mar 16, 2026", lastVisitTs: 20260316, activeProtocols: 2, outcomeTrend: "down", geneticStatus: "GX360", status: "concerning" },
  { id: "pt-006", name: "Rebecca Lawson", email: "r.lawson@mail.com", mrn: "NX-6201", age: 29, lastVisit: "Mar 15, 2026", lastVisitTs: 20260315, activeProtocols: 1, outcomeTrend: "up", geneticStatus: "Not Tested", status: "active" },
  { id: "pt-007", name: "Thomas Bergström", email: "t.bergstrom@lab.se", mrn: "NX-4390", age: 48, lastVisit: "Mar 15, 2026", lastVisitTs: 20260315, activeProtocols: 3, outcomeTrend: "up", geneticStatus: "GX360", status: "active" },
  { id: "pt-008", name: "Priya Nair", email: "p.nair@clinic.in", mrn: "NX-7823", age: 34, lastVisit: "Mar 14, 2026", lastVisitTs: 20260314, activeProtocols: 1, outcomeTrend: "flat", geneticStatus: "Pending", status: "follow-up" },
  { id: "pt-009", name: "David Okafor", email: "d.okafor@health.ng", mrn: "NX-5102", age: 46, lastVisit: "Mar 14, 2026", lastVisitTs: 20260314, activeProtocols: 2, outcomeTrend: "up", geneticStatus: "GX360", status: "active" },
  { id: "pt-010", name: "Sophia Martinez", email: "s.martinez@mail.com", mrn: "NX-5567", age: 55, lastVisit: "Mar 13, 2026", lastVisitTs: 20260313, activeProtocols: 3, outcomeTrend: "down", geneticStatus: "GX360", status: "concerning" },
  { id: "pt-011", name: "Lin Wei", email: "l.wei@hosp.cn", mrn: "NX-8901", age: 36, lastVisit: "Mar 12, 2026", lastVisitTs: 20260312, activeProtocols: 0, outcomeTrend: "flat", geneticStatus: "Not Tested", status: "active" },
  { id: "pt-012", name: "Carlos Gutierrez", email: "c.gutierrez@med.mx", mrn: "NX-2156", age: 61, lastVisit: "Mar 11, 2026", lastVisitTs: 20260311, activeProtocols: 2, outcomeTrend: "up", geneticStatus: "GX360", status: "follow-up" },
  { id: "pt-013", name: "Fatima Al-Rashid", email: "f.alrashid@health.ae", mrn: "NX-6734", age: 47, lastVisit: "Mar 10, 2026", lastVisitTs: 20260310, activeProtocols: 1, outcomeTrend: "flat", geneticStatus: "Pending", status: "follow-up" },
  { id: "pt-014", name: "Daniel Kowalski", email: "d.kowalski@mail.pl", mrn: "NX-1987", age: 53, lastVisit: "Mar 9, 2026", lastVisitTs: 20260309, activeProtocols: 2, outcomeTrend: "up", geneticStatus: "GX360", status: "archived" },
  { id: "pt-015", name: "Aisha Patel", email: "a.patel@clinic.uk", mrn: "NX-9234", age: 31, lastVisit: "Mar 8, 2026", lastVisitTs: 20260308, activeProtocols: 1, outcomeTrend: "up", geneticStatus: "Not Tested", status: "archived" },
]

const FILTER_CHIPS: FilterChip[] = ["All", "Active", "Needs Follow-up", "Archived"]

const TOTAL_PATIENTS = 247

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusDot(status: PatientStatus) {
  switch (status) {
    case "active":
      return "bg-green-400"
    case "follow-up":
      return "bg-yellow-400"
    case "concerning":
      return "bg-red-400 animate-pulse"
    case "archived":
      return "bg-gray-500"
  }
}

function geneticBadge(status: GeneticStatus) {
  switch (status) {
    case "GX360":
      return { bg: "bg-green-400/20", text: "text-green-400" }
    case "Pending":
      return { bg: "bg-yellow-400/20", text: "text-yellow-400" }
    case "Not Tested":
      return { bg: "bg-gray-600/20", text: "text-gray-400" }
  }
}

function trendIcon(trend: OutcomeTrend) {
  switch (trend) {
    case "up":
      return { Icon: ArrowUpRight, color: "text-green-400" }
    case "down":
      return { Icon: ArrowDownRight, color: "text-red-400" }
    case "flat":
      return { Icon: Minus, color: "text-gray-400" }
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

const PAGE_SIZE = 50

export default function PatientsPage() {
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [activeChip, setActiveChip] = useState<FilterChip>("All")
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced search
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
        case "protocols": cmp = a.activeProtocols - b.activeProtocols; break
        case "genetic": cmp = a.geneticStatus.localeCompare(b.geneticStatus); break
      }
      return sortDir === "asc" ? cmp : -cmp
    })

    return list
  }, [debouncedSearch, activeChip, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(TOTAL_PATIENTS / PAGE_SIZE))
  const showing = filtered.length

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Patients</h1>
        <Link
          href="/patients/new"
          className="bg-[#4ade80] text-gray-900 font-bold text-sm px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-[#6bfb9a] transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Patient
        </Link>
      </div>

      {/* ── Search Bar ────────────────────────────────────────── */}
      <div className="mb-4">
        <div className="bg-gray-800/50 border border-gray-600/50 focus-within:border-[#4ade80]/50 rounded-xl px-4 py-3 flex items-center gap-3 transition-colors">
          <Search className="h-4 w-4 text-white/40 shrink-0" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search patients by name, email, or MRN..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
          <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0c1322]/50 border border-[#3d4a3e]/20 text-[10px] text-white/40 font-mono shrink-0">
            <span className="text-xs">&#8984;</span>K
          </kbd>
        </div>
      </div>

      {/* ── Filter Chips ──────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => { setActiveChip(chip); setPage(1); setSelected(new Set()) }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeChip === chip
                ? "bg-[#4ade80] text-gray-900"
                : "border border-gray-600/50 text-white/60 hover:text-white hover:border-white/30"
            }`}
          >
            {chip}
          </button>
        ))}

        {/* Dropdown placeholders */}
        {["Protocol Type", "Last Visit", "Genetic Status"].map((label) => (
          <button
            key={label}
            className="border border-gray-600/50 text-white/60 rounded-full px-4 py-1.5 text-sm font-medium hover:text-white hover:border-white/30 transition-colors flex items-center gap-1"
          >
            {label}
            <ChevronDown className="h-3 w-3" />
          </button>
        ))}
      </div>

      {/* ── Data Table ────────────────────────────────────────── */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800">
                {/* Checkbox */}
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-600 bg-transparent text-[#4ade80] focus:ring-[#4ade80]/30 cursor-pointer"
                  />
                </th>
                {/* Status */}
                <th className="px-3 py-3 w-8" />
                {/* Sortable columns */}
                {([
                  ["name", "Patient"],
                  ["mrn", "MRN"],
                  ["age", "Age"],
                  ["lastVisit", "Last Visit"],
                  ["protocols", "Protocols"],
                ] as [SortField, string][]).map(([field, label]) => (
                  <th
                    key={field}
                    onClick={() => toggleSort(field)}
                    className="px-4 py-3 text-xs text-white/40 uppercase tracking-wider font-medium cursor-pointer hover:text-white/60 transition-colors select-none whitespace-nowrap"
                  >
                    <span className="flex items-center gap-1">
                      {label}
                      <SortArrow field={field} />
                    </span>
                  </th>
                ))}
                {/* Outcome Trend */}
                <th className="px-4 py-3 text-xs text-white/40 uppercase tracking-wider font-medium whitespace-nowrap">
                  Trend
                </th>
                {/* Genetic */}
                <th
                  onClick={() => toggleSort("genetic")}
                  className="px-4 py-3 text-xs text-white/40 uppercase tracking-wider font-medium cursor-pointer hover:text-white/60 transition-colors select-none whitespace-nowrap"
                >
                  <span className="flex items-center gap-1">
                    Genetic
                    <SortArrow field="genetic" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-white/30 text-sm">
                    No patients match your search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((patient) => {
                  const isSelected = selected.has(patient.id)
                  const { Icon: TrendIcon, color: trendColor } = trendIcon(patient.outcomeTrend)
                  const gBadge = geneticBadge(patient.geneticStatus)

                  return (
                    <tr
                      key={patient.id}
                      className={`border-b border-gray-700/30 hover:bg-gray-700/20 cursor-pointer transition-colors ${
                        isSelected ? "bg-gray-700/20" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(patient.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-gray-600 bg-transparent text-[#4ade80] focus:ring-[#4ade80]/30 cursor-pointer"
                        />
                      </td>
                      {/* Status dot */}
                      <td className="px-3 py-3.5">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusDot(patient.status)}`} />
                      </td>
                      {/* Name + email */}
                      <td className="px-4 py-3.5">
                        <Link href={`/patients/${patient.id}`} className="block">
                          <p className="text-sm font-medium text-white">{patient.name}</p>
                          <p className="text-xs text-white/30 mt-0.5">{patient.email}</p>
                        </Link>
                      </td>
                      {/* MRN */}
                      <td className="px-4 py-3.5 font-mono text-xs text-white/60">{patient.mrn}</td>
                      {/* Age */}
                      <td className="px-4 py-3.5 text-sm text-white/60">{patient.age}</td>
                      {/* Last Visit */}
                      <td className="px-4 py-3.5 text-sm text-white/60 whitespace-nowrap">{patient.lastVisit}</td>
                      {/* Active Protocols */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-[#232a3a] text-xs font-bold text-white/70">
                          {patient.activeProtocols}
                        </span>
                      </td>
                      {/* Outcome Trend */}
                      <td className="px-4 py-3.5">
                        <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                      </td>
                      {/* Genetic Status */}
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wide ${gBadge.bg} ${gBadge.text}`}>
                          {patient.geneticStatus}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bulk Actions Bar ──────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="sticky bottom-0 z-40 bg-gray-800 border-t border-green-400/15 px-5 py-3 -mx-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-[#4ade80] hover:underline"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700/50 text-xs font-medium text-white/70 hover:text-white hover:bg-gray-700 transition-colors">
              <ClipboardList className="h-3.5 w-3.5" />
              Assign Protocol
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700/50 text-xs font-medium text-white/70 hover:text-white hover:bg-gray-700 transition-colors">
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700/50 text-xs font-medium text-white/70 hover:text-white hover:bg-gray-700 transition-colors">
              <Send className="h-3.5 w-3.5" />
              Send Reminders
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-400/10 text-xs font-medium text-red-400 hover:bg-red-400/20 transition-colors">
              <Archive className="h-3.5 w-3.5" />
              Archive
            </button>
          </div>
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-4">
        <p className="text-sm text-white/40">
          Showing 1&ndash;{showing} of {TOTAL_PATIENTS} patients
        </p>
        <div className="flex items-center gap-1.5">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 text-xs rounded-md text-white/40 hover:text-white hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Prev
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`w-8 h-8 text-xs rounded-md font-medium transition-colors ${
                page === n
                  ? "bg-[#4ade80] text-gray-900 font-bold"
                  : "text-white/40 hover:text-white hover:bg-gray-700/50"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 text-xs rounded-md text-white/40 hover:text-white hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
