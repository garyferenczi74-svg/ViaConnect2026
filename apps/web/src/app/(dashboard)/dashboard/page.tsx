"use client"

import * as React from "react"
import {
  Users,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  Search,
  ChevronUp,
  ChevronDown,
  UserPlus,
  FileText,
  Zap,
  X,
  Check,
  Clock,
  ArrowUpRight,
  MoreHorizontal,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

type SortField = "name" | "mrn" | "lastVisit" | "protocol" | "status" | "improvement"
type SortDir = "asc" | "desc"
type PatientStatus = "on-track" | "needs-review" | "critical" | "new"

interface Patient {
  id: string
  name: string
  mrn: string
  age: number
  sex: "M" | "F"
  lastVisit: string
  lastVisitTs: number
  protocol: string
  status: PatientStatus
  improvement: number
  genes: string[]
}

interface ActivityItem {
  id: string
  text: string
  time: string
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const PATIENTS: Patient[] = [
  { id: "1", name: "Marcus Johnson", mrn: "MRN-004821", age: 52, sex: "M", lastVisit: "Mar 17, 2026", lastVisitTs: 20260317, protocol: "Methylation Support", status: "on-track", improvement: 34, genes: ["MTHFR", "MTR"] },
  { id: "2", name: "Elena Rodriguez", mrn: "MRN-003917", age: 41, sex: "F", lastVisit: "Mar 16, 2026", lastVisitTs: 20260316, protocol: "Detox Phase II", status: "needs-review", improvement: 18, genes: ["CYP2D6", "GST"] },
  { id: "3", name: "David Chen", mrn: "MRN-005102", age: 38, sex: "M", lastVisit: "Mar 16, 2026", lastVisitTs: 20260316, protocol: "Neurotransmitter Balance", status: "on-track", improvement: 45, genes: ["COMT", "MAO-A"] },
  { id: "4", name: "Amara Osei", mrn: "MRN-002834", age: 63, sex: "F", lastVisit: "Mar 15, 2026", lastVisitTs: 20260315, protocol: "Cardiovascular Genomics", status: "critical", improvement: -5, genes: ["APOE", "MTHFR"] },
  { id: "5", name: "Rebecca Lawson", mrn: "MRN-006201", age: 29, sex: "F", lastVisit: "Mar 15, 2026", lastVisitTs: 20260315, protocol: "Hormone Optimization", status: "on-track", improvement: 27, genes: ["VDR", "CYP1B1"] },
  { id: "6", name: "James Whitfield", mrn: "MRN-001458", age: 57, sex: "M", lastVisit: "Mar 14, 2026", lastVisitTs: 20260314, protocol: "Methylation Support", status: "on-track", improvement: 52, genes: ["MTHFR", "BHMT"] },
  { id: "7", name: "Priya Nair", mrn: "MRN-007823", age: 34, sex: "F", lastVisit: "Mar 14, 2026", lastVisitTs: 20260314, protocol: "Gut-Brain Axis", status: "needs-review", improvement: 11, genes: ["FUT2", "HLA-DQ"] },
  { id: "8", name: "Thomas Bergström", mrn: "MRN-004390", age: 48, sex: "M", lastVisit: "Mar 13, 2026", lastVisitTs: 20260313, protocol: "Detox Phase II", status: "on-track", improvement: 38, genes: ["CYP1A2", "NAT2"] },
  { id: "9", name: "Sophia Martinez", mrn: "MRN-005567", age: 55, sex: "F", lastVisit: "Mar 13, 2026", lastVisitTs: 20260313, protocol: "Inflammation Control", status: "critical", improvement: -2, genes: ["TNF-α", "IL-6"] },
  { id: "10", name: "Michael O'Brien", mrn: "MRN-003102", age: 44, sex: "M", lastVisit: "Mar 12, 2026", lastVisitTs: 20260312, protocol: "Neurotransmitter Balance", status: "on-track", improvement: 29, genes: ["COMT", "GAD1"] },
  { id: "11", name: "Lin Wei", mrn: "MRN-008901", age: 36, sex: "F", lastVisit: "Mar 12, 2026", lastVisitTs: 20260312, protocol: "Methylation Support", status: "new", improvement: 0, genes: ["MTHFR", "CBS"] },
  { id: "12", name: "Carlos Gutierrez", mrn: "MRN-002156", age: 61, sex: "M", lastVisit: "Mar 11, 2026", lastVisitTs: 20260311, protocol: "Cardiovascular Genomics", status: "on-track", improvement: 41, genes: ["APOE", "LPA"] },
  { id: "13", name: "Fatima Al-Rashid", mrn: "MRN-006734", age: 47, sex: "F", lastVisit: "Mar 11, 2026", lastVisitTs: 20260311, protocol: "Hormone Optimization", status: "needs-review", improvement: 15, genes: ["CYP19A1", "ESR1"] },
  { id: "14", name: "Daniel Kowalski", mrn: "MRN-001987", age: 53, sex: "M", lastVisit: "Mar 10, 2026", lastVisitTs: 20260310, protocol: "Inflammation Control", status: "on-track", improvement: 33, genes: ["IL-1β", "COX-2"] },
  { id: "15", name: "Aisha Patel", mrn: "MRN-009234", age: 31, sex: "F", lastVisit: "Mar 10, 2026", lastVisitTs: 20260310, protocol: "Gut-Brain Axis", status: "on-track", improvement: 22, genes: ["FUT2", "MTHFR"] },
  { id: "16", name: "Robert Tanaka", mrn: "MRN-004567", age: 59, sex: "M", lastVisit: "Mar 9, 2026", lastVisitTs: 20260309, protocol: "Detox Phase II", status: "on-track", improvement: 47, genes: ["CYP3A4", "UGT1A1"] },
  { id: "17", name: "Hannah Eklund", mrn: "MRN-007456", age: 42, sex: "F", lastVisit: "Mar 9, 2026", lastVisitTs: 20260309, protocol: "Methylation Support", status: "on-track", improvement: 31, genes: ["MTHFR", "MTRR"] },
  { id: "18", name: "Victor Popov", mrn: "MRN-003678", age: 50, sex: "M", lastVisit: "Mar 8, 2026", lastVisitTs: 20260308, protocol: "Neurotransmitter Balance", status: "needs-review", improvement: 8, genes: ["COMT", "DBH"] },
  { id: "19", name: "Grace Mbeki", mrn: "MRN-008123", age: 37, sex: "F", lastVisit: "Mar 8, 2026", lastVisitTs: 20260308, protocol: "Hormone Optimization", status: "on-track", improvement: 26, genes: ["VDR", "CYP1B1"] },
  { id: "20", name: "Owen Fitzgerald", mrn: "MRN-002890", age: 46, sex: "M", lastVisit: "Mar 7, 2026", lastVisitTs: 20260307, protocol: "Cardiovascular Genomics", status: "on-track", improvement: 35, genes: ["APOE", "ACE"] },
]

const ACTIVITY_FEED: ActivityItem[] = [
  { id: "1", text: "Lab results uploaded for Marcus Johnson", time: "12 min ago" },
  { id: "2", text: "Protocol updated: Elena Rodriguez — Detox Phase II", time: "34 min ago" },
  { id: "3", text: "New patient registered: Lin Wei", time: "1 hr ago" },
  { id: "4", text: "Interaction check completed for Amara Osei", time: "1.5 hr ago" },
  { id: "5", text: "Sophia Martinez flagged for critical review", time: "2 hr ago" },
  { id: "6", text: "Genomic report generated for Thomas Bergström", time: "3 hr ago" },
  { id: "7", text: "Follow-up scheduled: David Chen — Mar 25", time: "4 hr ago" },
  { id: "8", text: "Protocol milestone reached: James Whitfield — Week 12", time: "5 hr ago" },
]

// 30-day sparkline data
const SPARKLINE_PATIENTS = [180, 185, 182, 190, 195, 192, 198, 203, 200, 210, 208, 215, 220, 218, 225, 228, 230, 232, 235, 238, 240, 237, 242, 245, 243, 247, 245, 248, 250, 247]
const SPARKLINE_PROTOCOLS = [22, 24, 23, 25, 26, 28, 27, 29, 30, 31, 30, 32, 33, 34, 33, 35, 34, 36, 35, 37, 36, 38, 37, 38, 39, 38, 40, 39, 38, 38]
const SPARKLINE_IMPROVEMENT = [18, 20, 19, 22, 21, 23, 24, 25, 24, 26, 27, 28, 27, 29, 30, 28, 31, 30, 32, 31, 33, 32, 34, 33, 35, 34, 33, 34, 35, 34]

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusConfig(status: PatientStatus) {
  switch (status) {
    case "on-track":
      return { dot: "bg-green-400", label: "On Track", text: "text-green-400" }
    case "needs-review":
      return { dot: "bg-yellow-400", label: "Needs Review", text: "text-yellow-400" }
    case "critical":
      return { dot: "bg-red-400", label: "Critical", text: "text-red-400" }
    case "new":
      return { dot: "bg-blue-400", label: "New", text: "text-blue-400" }
  }
}

// ─── SVG Sparkline Component ────────────────────────────────────────────────

function Sparkline({ data, color, width = 120, height = 32 }: { data: number[]; color: string; width?: number; height?: number }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(" ")

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#grad-${color})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── Circular Progress Ring ─────────────────────────────────────────────────

function ProgressRing({ value, max, size = 48, strokeWidth = 4 }: { value: number; max: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (value / max) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(74,222,128,0.15)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#4ade80"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={circumference - progress}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
    </svg>
  )
}

// ─── Dashboard Page ─────────────────────────────────────────────────────────

const PAGE_SIZE = 10

export default function DashboardPage() {
  const [search, setSearch] = React.useState("")
  const [sortField, setSortField] = React.useState<SortField>("lastVisit")
  const [sortDir, setSortDir] = React.useState<SortDir>("desc")
  const [page, setPage] = React.useState(0)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [alertsDismissed, setAlertsDismissed] = React.useState<Set<string>>(new Set())

  // Filter & sort
  const filtered = React.useMemo(() => {
    let result = PATIENTS.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.mrn.toLowerCase().includes(search.toLowerCase()) ||
        p.protocol.toLowerCase().includes(search.toLowerCase())
    )
    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case "name": cmp = a.name.localeCompare(b.name); break
        case "mrn": cmp = a.mrn.localeCompare(b.mrn); break
        case "lastVisit": cmp = a.lastVisitTs - b.lastVisitTs; break
        case "protocol": cmp = a.protocol.localeCompare(b.protocol); break
        case "status": cmp = a.status.localeCompare(b.status); break
        case "improvement": cmp = a.improvement - b.improvement; break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return result
  }, [search, sortField, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const start = page * PAGE_SIZE + 1
  const end = Math.min((page + 1) * PAGE_SIZE, filtered.length)

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
    }
    setPage(0)
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (paged.every((p) => selected.has(p.id))) {
      setSelected((prev) => {
        const next = new Set(prev)
        paged.forEach((p) => next.delete(p.id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        paged.forEach((p) => next.add(p.id))
        return next
      })
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 opacity-30" />
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 text-green-400" />
    ) : (
      <ChevronDown className="h-3 w-3 text-green-400" />
    )
  }

  // Alerts
  const alerts = [
    { id: "crit", severity: "red" as const, text: "Critical: 2 drug-gene interactions need immediate review", subtext: "Amara Osei (Warfarin + CYP2C9*3), Sophia Martinez (Methotrexate + MTHFR C677T)" },
    { id: "warn", severity: "yellow" as const, text: "4 patients approaching protocol end date — reassessment needed", subtext: "James Whitfield, Thomas Bergström, Daniel Kowalski, Robert Tanaka" },
  ].filter((a) => !alertsDismissed.has(a.id))

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 min-h-screen bg-[#111827] p-4 sm:p-6 lg:p-8 font-[system-ui,Inter,sans-serif]">
      {/* ── TOP METRICS ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Patients */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-6 group hover:border-green-400/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/40 text-xs uppercase tracking-wider font-medium">Total Patients</span>
            <Users className="h-5 w-5 text-green-400/50" />
          </div>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-green-400">247</span>
            <span className="flex items-center text-green-400 text-sm mb-1">
              <ArrowUpRight className="h-4 w-4" />
              +12
            </span>
          </div>
          <p className="text-white/40 text-xs mt-2">vs last month</p>
        </div>

        {/* Active Protocols */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-6 group hover:border-green-400/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/40 text-xs uppercase tracking-wider font-medium">Active Protocols</span>
            <ClipboardList className="h-5 w-5 text-green-400/50" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-4xl font-bold text-green-400">38</span>
            <div className="relative">
              <ProgressRing value={38} max={50} />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white/60 font-medium">76%</span>
            </div>
          </div>
          <p className="text-white/40 text-xs mt-2">of 50 capacity</p>
        </div>

        {/* Avg Improvement */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-6 group hover:border-green-400/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/40 text-xs uppercase tracking-wider font-medium">Avg Improvement</span>
            <TrendingUp className="h-5 w-5 text-green-400/50" />
          </div>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-green-400">34%</span>
            <Sparkline data={SPARKLINE_IMPROVEMENT} color="#4ade80" width={80} height={28} />
          </div>
          <p className="text-white/40 text-xs mt-2">across all active protocols</p>
        </div>

        {/* Pending Reviews */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-6 group hover:border-green-400/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/40 text-xs uppercase tracking-wider font-medium">Pending Reviews</span>
            <AlertCircle className="h-5 w-5 text-green-400/50" />
          </div>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-green-400">7</span>
            <span className="relative flex h-3 w-3 mb-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-400" />
            </span>
            <span className="text-red-400 text-sm mb-1 font-medium">2 urgent</span>
          </div>
          <p className="text-white/40 text-xs mt-2">requires attention today</p>
        </div>
      </div>

      {/* ── ALERT BANNERS ────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="space-y-3 mb-6">
          {alerts.map((alert) => {
            const isRed = alert.severity === "red"
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-3 rounded-xl p-4 border transition-all ${
                  isRed
                    ? "bg-red-400/10 border-red-400/30"
                    : "bg-yellow-400/10 border-yellow-400/30"
                }`}
              >
                <span className="relative flex h-2.5 w-2.5 mt-1.5 shrink-0">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isRed ? "bg-red-400" : "bg-yellow-400"}`} />
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isRed ? "bg-red-400" : "bg-yellow-400"}`} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isRed ? "text-red-400" : "text-yellow-400"}`}>
                    {alert.text}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">{alert.subtext}</p>
                </div>
                <button className="text-white/40 hover:text-white/60 transition-colors" onClick={() => setAlertsDismissed((prev) => new Set([...prev, alert.id]))}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── MAIN CONTENT + SIDEBAR ───────────────────────────────── */}
      <div className="flex gap-6">
        {/* Patient Roster */}
        <div className="flex-1 min-w-0">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl overflow-hidden">
            {/* Search bar */}
            <div className="p-4 border-b border-green-400/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Search patients by name, MRN, or protocol..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0) }}
                  className="w-full bg-gray-800 border border-green-400/15 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green-400/40 transition-colors"
                />
              </div>
            </div>

            {/* Bulk action bar */}
            {selected.size > 0 && (
              <div className="flex items-center gap-4 px-4 py-2.5 bg-green-400/10 border-b border-green-400/20">
                <span className="text-green-400 text-sm font-medium">{selected.size} selected</span>
                <button className="text-xs text-white/60 hover:text-white bg-gray-700 rounded-full px-3 py-1 transition-colors">
                  Assign Protocol
                </button>
                <button className="text-xs text-white/60 hover:text-white bg-gray-700 rounded-full px-3 py-1 transition-colors">
                  Export Selected
                </button>
                <button className="text-xs text-white/60 hover:text-white bg-gray-700 rounded-full px-3 py-1 transition-colors" onClick={() => setSelected(new Set())}>
                  Clear
                </button>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-green-400/10">
                    <th className="py-3 px-4 text-left w-10">
                      <input
                        type="checkbox"
                        checked={paged.length > 0 && paged.every((p) => selected.has(p.id))}
                        onChange={toggleSelectAll}
                        className="rounded border-green-400/30 bg-transparent accent-green-400"
                      />
                    </th>
                    {([
                      ["name", "Patient"],
                      ["mrn", "MRN"],
                      ["lastVisit", "Last Visit"],
                      ["protocol", "Protocol"],
                      ["status", "Status"],
                      ["improvement", "Improvement"],
                    ] as [SortField, string][]).map(([field, label]) => (
                      <th
                        key={field}
                        onClick={() => toggleSort(field)}
                        className="py-3 px-4 text-left text-white/40 uppercase text-xs tracking-wider font-medium cursor-pointer hover:text-white/60 transition-colors select-none"
                      >
                        <span className="flex items-center gap-1">
                          {label}
                          <SortIcon field={field} />
                        </span>
                      </th>
                    ))}
                    <th className="py-3 px-4 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {paged.map((patient, idx) => {
                    const sc = statusConfig(patient.status)
                    return (
                      <tr
                        key={patient.id}
                        className={`border-b border-green-400/5 hover:bg-gray-800/80 transition-colors cursor-pointer ${
                          idx % 2 === 0 ? "bg-transparent" : "bg-gray-800/20"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selected.has(patient.id)}
                            onChange={() => toggleSelect(patient.id)}
                            className="rounded border-green-400/30 bg-transparent accent-green-400"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-white font-medium">{patient.name}</p>
                            <p className="text-white/40 text-xs">{patient.age}{patient.sex} &middot; {patient.genes.join(", ")}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-white/60 font-mono text-xs">{patient.mrn}</td>
                        <td className="py-3 px-4 text-white/60">{patient.lastVisit}</td>
                        <td className="py-3 px-4 text-white/60">{patient.protocol}</td>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${sc.dot}`} />
                            <span className={`text-xs font-medium ${sc.text}`}>{sc.label}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-sm font-semibold ${patient.improvement >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {patient.improvement >= 0 ? "+" : ""}{patient.improvement}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button className="text-white/30 hover:text-white/60 transition-colors">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-green-400/10">
              <span className="text-white/40 text-xs">
                Showing {start}–{end} of {filtered.length} patients
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-xs rounded-lg border border-green-400/15 text-white/60 hover:text-white hover:border-green-400/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      page === i
                        ? "bg-green-400 text-gray-900 font-medium"
                        : "text-white/60 hover:text-white border border-green-400/15 hover:border-green-400/30"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 text-xs rounded-lg border border-green-400/15 text-white/60 hover:text-white hover:border-green-400/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ────────────────────────────────────────── */}
        <div className="hidden xl:flex flex-col w-80 gap-4 shrink-0">
          {/* Quick Actions */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-6">
            <h3 className="text-white/40 text-xs uppercase tracking-wider font-medium mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center gap-3 bg-green-400 text-gray-900 font-semibold rounded-full px-5 py-3 hover:bg-green-300 transition-colors text-sm">
                <UserPlus className="h-4 w-4" />
                New Patient
              </button>
              <button className="w-full flex items-center gap-3 border border-green-400/30 text-green-400 rounded-full px-5 py-3 hover:bg-green-400/10 transition-colors text-sm font-medium">
                <FileText className="h-4 w-4" />
                Create Protocol
              </button>
              <button className="w-full flex items-center gap-3 border border-yellow-400/30 text-yellow-400 rounded-full px-5 py-3 hover:bg-yellow-400/10 transition-colors text-sm font-medium">
                <Zap className="h-4 w-4" />
                Run Interaction Check
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-6 flex-1 flex flex-col min-h-0">
            <h3 className="text-white/40 text-xs uppercase tracking-wider font-medium mb-4">Recent Activity</h3>
            <div className="space-y-4 overflow-y-auto flex-1 pr-1 scrollbar-thin scrollbar-thumb-green-400/20">
              {ACTIVITY_FEED.map((item) => (
                <div key={item.id} className="flex gap-3 group">
                  <div className="mt-1.5 shrink-0">
                    <div className="h-2 w-2 rounded-full bg-green-400/40 group-hover:bg-green-400 transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white/60 text-xs leading-relaxed group-hover:text-white/80 transition-colors">{item.text}</p>
                    <p className="text-white/30 text-[10px] mt-0.5 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {item.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM SPARKLINE CARDS ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5 hover:border-green-400/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/40 text-xs uppercase tracking-wider font-medium">Patient Growth</span>
            <span className="text-green-400 text-xs font-medium flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3" />
              +37%
            </span>
          </div>
          <Sparkline data={SPARKLINE_PATIENTS} color="#4ade80" width={280} height={40} />
          <p className="text-white/30 text-[10px] mt-2">30-day trend</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5 hover:border-green-400/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/40 text-xs uppercase tracking-wider font-medium">Active Protocols</span>
            <span className="text-green-400 text-xs font-medium flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3" />
              +73%
            </span>
          </div>
          <Sparkline data={SPARKLINE_PROTOCOLS} color="#4ade80" width={280} height={40} />
          <p className="text-white/30 text-[10px] mt-2">30-day trend</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5 hover:border-green-400/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/40 text-xs uppercase tracking-wider font-medium">Avg Improvement</span>
            <span className="text-green-400 text-xs font-medium flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3" />
              +89%
            </span>
          </div>
          <Sparkline data={SPARKLINE_IMPROVEMENT} color="#4ade80" width={280} height={40} />
          <p className="text-white/30 text-[10px] mt-2">30-day trend</p>
        </div>
      </div>
    </div>
  )
}
