"use client"

import * as React from "react"
import {
  Users,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  Search,
  ChevronUp,
  ChevronDown,
  UserPlus,
  FileText,
  X,
  Clock,
  ArrowUpRight,
  MoreHorizontal,
  Calendar,
  Activity,
  Shield,
  Beaker,
  Heart,
  Brain,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

type SortField = "name" | "mrn" | "status" | "protocol"
type SortDir = "asc" | "desc"
type PatientStatus = "stable" | "monitoring" | "critical" | "new"

interface Patient {
  id: string
  name: string
  initials: string
  mrn: string
  age: number
  sex: "M" | "F"
  protocol: string
  status: PatientStatus
  lastVisit: string
  lastVisitTs: number
  improvement: number
}

interface ScheduledReview {
  id: string
  title: string
  subtitle: string
  time: string
  icon: React.ReactNode
}

interface ActivityItem {
  id: string
  text: string
  time: string
  type: "lab" | "protocol" | "patient" | "alert" | "report" | "schedule"
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const PATIENTS: Patient[] = [
  { id: "1", name: "James Wilson", initials: "JW", mrn: "#7721", age: 58, sex: "M", protocol: "Cardiac Genomics", status: "stable", lastVisit: "Mar 17, 2026", lastVisitTs: 20260317, improvement: 34 },
  { id: "2", name: "Alice Rodriguez", initials: "AR", mrn: "#4412", age: 41, sex: "F", protocol: "Hypertension", status: "critical", lastVisit: "Mar 16, 2026", lastVisitTs: 20260316, improvement: -5 },
  { id: "3", name: "David Chen", initials: "DC", mrn: "#5102", age: 38, sex: "M", protocol: "Neurotransmitter Balance", status: "stable", lastVisit: "Mar 16, 2026", lastVisitTs: 20260316, improvement: 45 },
  { id: "4", name: "Amara Osei", initials: "AO", mrn: "#2834", age: 63, sex: "F", protocol: "Methylation Support", status: "critical", lastVisit: "Mar 15, 2026", lastVisitTs: 20260315, improvement: -2 },
  { id: "5", name: "Rebecca Lawson", initials: "RL", mrn: "#6201", age: 29, sex: "F", protocol: "Hormone Optimization", status: "stable", lastVisit: "Mar 15, 2026", lastVisitTs: 20260315, improvement: 27 },
  { id: "6", name: "Thomas Bergström", initials: "TB", mrn: "#4390", age: 48, sex: "M", protocol: "Detox Phase II", status: "stable", lastVisit: "Mar 14, 2026", lastVisitTs: 20260314, improvement: 38 },
  { id: "7", name: "Priya Nair", initials: "PN", mrn: "#7823", age: 34, sex: "F", protocol: "Gut-Brain Axis", status: "monitoring", lastVisit: "Mar 14, 2026", lastVisitTs: 20260314, improvement: 11 },
  { id: "8", name: "Marcus Johnson", initials: "MJ", mrn: "#4821", age: 52, sex: "M", protocol: "Methylation Support", status: "stable", lastVisit: "Mar 13, 2026", lastVisitTs: 20260313, improvement: 52 },
  { id: "9", name: "Sophia Martinez", initials: "SM", mrn: "#5567", age: 55, sex: "F", protocol: "Inflammation Control", status: "critical", lastVisit: "Mar 13, 2026", lastVisitTs: 20260313, improvement: -8 },
  { id: "10", name: "Michael O'Brien", initials: "MO", mrn: "#3102", age: 44, sex: "M", protocol: "Neurotransmitter Balance", status: "stable", lastVisit: "Mar 12, 2026", lastVisitTs: 20260312, improvement: 29 },
  { id: "11", name: "Lin Wei", initials: "LW", mrn: "#8901", age: 36, sex: "F", protocol: "Methylation Support", status: "new", lastVisit: "Mar 12, 2026", lastVisitTs: 20260312, improvement: 0 },
  { id: "12", name: "Carlos Gutierrez", initials: "CG", mrn: "#2156", age: 61, sex: "M", protocol: "Cardiovascular Genomics", status: "stable", lastVisit: "Mar 11, 2026", lastVisitTs: 20260311, improvement: 41 },
  { id: "13", name: "Fatima Al-Rashid", initials: "FA", mrn: "#6734", age: 47, sex: "F", protocol: "Hormone Optimization", status: "monitoring", lastVisit: "Mar 11, 2026", lastVisitTs: 20260311, improvement: 15 },
  { id: "14", name: "Daniel Kowalski", initials: "DK", mrn: "#1987", age: 53, sex: "M", protocol: "Inflammation Control", status: "stable", lastVisit: "Mar 10, 2026", lastVisitTs: 20260310, improvement: 33 },
  { id: "15", name: "Aisha Patel", initials: "AP", mrn: "#9234", age: 31, sex: "F", protocol: "Gut-Brain Axis", status: "monitoring", lastVisit: "Mar 10, 2026", lastVisitTs: 20260310, improvement: 22 },
  { id: "16", name: "Robert Tanaka", initials: "RT", mrn: "#4567", age: 59, sex: "M", protocol: "Detox Phase II", status: "stable", lastVisit: "Mar 9, 2026", lastVisitTs: 20260309, improvement: 47 },
  { id: "17", name: "Hannah Eklund", initials: "HE", mrn: "#7456", age: 42, sex: "F", protocol: "Methylation Support", status: "stable", lastVisit: "Mar 9, 2026", lastVisitTs: 20260309, improvement: 31 },
  { id: "18", name: "Victor Popov", initials: "VP", mrn: "#3678", age: 50, sex: "M", protocol: "Neurotransmitter Balance", status: "monitoring", lastVisit: "Mar 8, 2026", lastVisitTs: 20260308, improvement: 8 },
  { id: "19", name: "Grace Mbeki", initials: "GM", mrn: "#8123", age: 37, sex: "F", protocol: "Hormone Optimization", status: "stable", lastVisit: "Mar 8, 2026", lastVisitTs: 20260308, improvement: 26 },
  { id: "20", name: "Owen Fitzgerald", initials: "OF", mrn: "#2890", age: 46, sex: "M", protocol: "Cardiovascular Genomics", status: "stable", lastVisit: "Mar 7, 2026", lastVisitTs: 20260307, improvement: 35 },
]

const SCHEDULED_REVIEWS: ScheduledReview[] = [
  { id: "1", title: "Case Review Sync", subtitle: "Today, 2:30 PM", time: "2:30 PM", icon: <Calendar className="h-4 w-4 text-emerald-400" /> },
  { id: "2", title: "Genomic Report — Lin Wei", subtitle: "Today, 4:00 PM", time: "4:00 PM", icon: <Beaker className="h-4 w-4 text-emerald-400" /> },
  { id: "3", title: "Protocol Review — Osei", subtitle: "Tomorrow, 9:00 AM", time: "9:00 AM", icon: <Shield className="h-4 w-4 text-emerald-400" /> },
  { id: "4", title: "Heart Panel — Wilson", subtitle: "Tomorrow, 11:30 AM", time: "11:30 AM", icon: <Heart className="h-4 w-4 text-emerald-400" /> },
]

const ACTIVITY_FEED: ActivityItem[] = [
  { id: "1", text: "Lab results uploaded for Marcus Johnson", time: "12m", type: "lab" },
  { id: "2", text: "Protocol updated — Elena Rodriguez, Detox Phase II", time: "34m", type: "protocol" },
  { id: "3", text: "New patient registered: Lin Wei", time: "1h", type: "patient" },
  { id: "4", text: "Interaction check completed for Amara Osei", time: "1.5h", type: "alert" },
  { id: "5", text: "Sophia Martinez flagged for critical review", time: "2h", type: "alert" },
  { id: "6", text: "Genomic report generated for Thomas Bergström", time: "3h", type: "report" },
  { id: "7", text: "Follow-up scheduled: David Chen — Mar 25", time: "4h", type: "schedule" },
]

// Weekly trend bar data (8 weeks)
const TREND_DATA = {
  growth: [42, 55, 48, 62, 70, 65, 78, 100],
  protocols: [35, 45, 50, 55, 60, 68, 72, 85],
  improvement: [50, 40, 60, 55, 70, 65, 80, 90],
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusConfig(status: PatientStatus) {
  switch (status) {
    case "stable":
      return { bg: "bg-emerald-400/10", text: "text-emerald-400", label: "STABLE" }
    case "monitoring":
      return { bg: "bg-yellow-400/10", text: "text-yellow-400", label: "MONITORING" }
    case "critical":
      return { bg: "bg-red-400/10", text: "text-red-400", label: "CRITICAL" }
    case "new":
      return { bg: "bg-blue-400/10", text: "text-blue-400", label: "NEW" }
  }
}

// ─── Mini Bar Chart Component ───────────────────────────────────────────────

function BarChart({ data, color, label, change }: { data: number[]; color: string; label: string; change: string }) {
  const max = Math.max(...data)
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1.5">
        <span className="text-slate-400">{label}</span>
        <span className="text-emerald-400 font-bold">{change}</span>
      </div>
      <div className="h-10 flex items-end gap-1">
        {data.map((value, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm transition-all duration-300"
            style={{
              height: `${(value / max) * 100}%`,
              backgroundColor: i === data.length - 1 ? color : `${color}33`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Dashboard Page ─────────────────────────────────────────────────────────

const PAGE_SIZE = 8

export default function DashboardPage() {
  const [search, setSearch] = React.useState("")
  const [sortField, setSortField] = React.useState<SortField>("name")
  const [sortDir, setSortDir] = React.useState<SortDir>("asc")
  const [page, setPage] = React.useState(0)
  const [alertDismissed, setAlertDismissed] = React.useState(false)

  // Filter & sort
  const filtered = React.useMemo(() => {
    const result = PATIENTS.filter(
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
        case "status": cmp = a.status.localeCompare(b.status); break
        case "protocol": cmp = a.protocol.localeCompare(b.protocol); break
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
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortField(field); setSortDir("asc") }
    setPage(0)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 opacity-20" />
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-emerald-400" />
      : <ChevronDown className="h-3 w-3 text-emerald-400" />
  }

  const criticalCount = PATIENTS.filter((p) => p.status === "critical").length

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 min-h-screen bg-[#111827] text-slate-100 p-4 sm:p-6 lg:p-8">
      {/* ── TOP BAR: Alert + Action Buttons ──────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        {/* Critical Alert */}
        {!alertDismissed && (
          <div className="flex-1 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
              <div>
                <p className="font-bold text-sm">{criticalCount} Critical Reviews Needed</p>
                <p className="text-red-300/60 text-xs">High priority drug-gene interactions detected</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="bg-red-500 hover:bg-red-400 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                Review
              </button>
              <button
                onClick={() => setAlertDismissed(true)}
                className="text-slate-400 hover:text-slate-200 p-1 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        <div className="flex gap-2 shrink-0">
          <button className="bg-slate-800 border border-slate-700 hover:border-emerald-400/30 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors">
            <UserPlus className="h-4 w-4 text-emerald-400" />
            New
          </button>
          <button className="bg-emerald-400 hover:bg-emerald-300 text-slate-900 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
            <FileText className="h-4 w-4" />
            Create
          </button>
        </div>
      </div>

      {/* ── METRIC CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Patients */}
        <div className="bg-gray-800/60 backdrop-blur-xl border border-emerald-400/10 rounded-xl p-5 hover:border-emerald-400/25 hover:shadow-[0_0_15px_rgba(74,222,128,0.05)] transition-all">
          <div className="flex justify-between items-start mb-3">
            <span className="bg-emerald-400/10 p-2.5 rounded-lg">
              <Users className="h-5 w-5 text-emerald-400" />
            </span>
            <span className="text-emerald-400 text-xs font-bold flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3" />
              +12%
            </span>
          </div>
          <p className="text-slate-400 text-xs mb-0.5">Patients</p>
          <p className="text-2xl font-bold">1,247</p>
        </div>

        {/* Protocols */}
        <div className="bg-gray-800/60 backdrop-blur-xl border border-emerald-400/10 rounded-xl p-5 hover:border-emerald-400/25 hover:shadow-[0_0_15px_rgba(74,222,128,0.05)] transition-all">
          <div className="flex justify-between items-start mb-3">
            <span className="bg-emerald-400/10 p-2.5 rounded-lg">
              <ClipboardList className="h-5 w-5 text-emerald-400" />
            </span>
            <span className="text-emerald-400 text-xs font-bold flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3" />
              +5%
            </span>
          </div>
          <p className="text-slate-400 text-xs mb-0.5">Protocols</p>
          <p className="text-2xl font-bold">892</p>
        </div>

        {/* Improvement */}
        <div className="bg-gray-800/60 backdrop-blur-xl border border-emerald-400/10 rounded-xl p-5 hover:border-emerald-400/25 hover:shadow-[0_0_15px_rgba(74,222,128,0.05)] transition-all">
          <div className="flex justify-between items-start mb-3">
            <span className="bg-emerald-400/10 p-2.5 rounded-lg">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </span>
            <span className="text-emerald-400 text-xs font-bold flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3" />
              +8%
            </span>
          </div>
          <p className="text-slate-400 text-xs mb-0.5">Improvement</p>
          <p className="text-2xl font-bold">73%</p>
        </div>

        {/* Pending */}
        <div className="bg-gray-800/60 backdrop-blur-xl border border-red-500/20 rounded-xl p-5 hover:border-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.05)] transition-all">
          <div className="flex justify-between items-start mb-3">
            <span className="bg-red-400/10 p-2.5 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </span>
            <span className="text-red-400 text-xs font-bold">Urgent</span>
          </div>
          <p className="text-slate-400 text-xs mb-0.5">Pending</p>
          <p className="text-2xl font-bold">14</p>
        </div>
      </div>

      {/* ── MAIN CONTENT: Table + Sidebar ────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Patient Roster — 2/3 */}
        <div className="lg:col-span-2 bg-gray-800/60 backdrop-blur-xl border border-emerald-400/10 rounded-xl overflow-hidden hover:shadow-[0_0_15px_rgba(74,222,128,0.05)] transition-shadow">
          {/* Header with search */}
          <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800">
            <h3 className="text-base font-semibold">Patient Roster</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0) }}
                className="bg-slate-800 border-0 rounded-lg pl-9 pr-4 py-2 text-sm w-48 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/30 transition-all"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {([
                    ["name", "Patient"],
                    ["mrn", "MRN"],
                    ["status", "Status"],
                    ["protocol", "Protocol"],
                  ] as [SortField, string][]).map(([field, label]) => (
                    <th
                      key={field}
                      onClick={() => toggleSort(field)}
                      className={`text-left py-3 px-6 bg-slate-800/30 text-slate-400 text-[10px] uppercase tracking-[0.05em] font-medium cursor-pointer hover:text-slate-200 transition-colors select-none ${
                        field === "protocol" ? "hidden md:table-cell" : ""
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        <SortIcon field={field} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm">
                {paged.map((patient) => {
                  const sc = statusConfig(patient.status)
                  return (
                    <tr
                      key={patient.id}
                      className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0 group-hover:bg-emerald-400/20 group-hover:text-emerald-400 transition-colors">
                            {patient.initials}
                          </div>
                          <span className="font-medium text-slate-100">{patient.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-400 font-mono text-xs">{patient.mrn}</td>
                      <td className="py-4 px-6">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text} tracking-wide`}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-400 hidden md:table-cell">{patient.protocol}</td>
                    </tr>
                  )
                })}
                {paged.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500 text-sm">
                      No patients match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800">
            <span className="text-slate-500 text-xs">
              {filtered.length > 0 ? `${start}–${end} of ${filtered.length}` : "0 results"}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 text-xs rounded-md text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`size-7 text-xs rounded-md transition-colors ${
                    page === i
                      ? "bg-emerald-400 text-slate-900 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-slate-700"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 text-xs rounded-md text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR — 1/3 ────────────────────────────────── */}
        <div className="space-y-6">
          {/* Trends */}
          <div className="bg-gray-800/60 backdrop-blur-xl border border-emerald-400/10 rounded-xl p-5 hover:shadow-[0_0_15px_rgba(74,222,128,0.05)] transition-shadow">
            <h4 className="flex items-center gap-2 mb-5 text-sm font-semibold">
              <Activity className="h-4 w-4 text-emerald-400" />
              Trends
            </h4>
            <div className="space-y-5">
              <BarChart data={TREND_DATA.growth} color="#4ade80" label="Patient Growth" change="+18%" />
              <BarChart data={TREND_DATA.protocols} color="#4ade80" label="Protocol Adherence" change="+12%" />
              <BarChart data={TREND_DATA.improvement} color="#4ade80" label="Avg Improvement" change="+8%" />
            </div>
          </div>

          {/* Scheduled Reviews */}
          <div className="bg-gray-800/60 backdrop-blur-xl border border-emerald-400/10 rounded-xl p-5 hover:shadow-[0_0_15px_rgba(74,222,128,0.05)] transition-shadow">
            <h4 className="text-sm font-semibold mb-4">Reviews</h4>
            <div className="space-y-2">
              {SCHEDULED_REVIEWS.map((review) => (
                <div
                  key={review.id}
                  className="flex items-center gap-3 p-2.5 bg-slate-800/40 rounded-lg hover:bg-slate-800/70 transition-colors cursor-pointer group"
                >
                  <span className="shrink-0 group-hover:scale-110 transition-transform">
                    {review.icon}
                  </span>
                  <div className="min-w-0 text-xs">
                    <p className="font-semibold text-slate-200 truncate">{review.title}</p>
                    <p className="text-slate-500">{review.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-gray-800/60 backdrop-blur-xl border border-emerald-400/10 rounded-xl p-5 hover:shadow-[0_0_15px_rgba(74,222,128,0.05)] transition-shadow">
            <h4 className="text-sm font-semibold mb-4">Activity</h4>
            <div className="space-y-3">
              {ACTIVITY_FEED.map((item) => (
                <div key={item.id} className="flex gap-3 group">
                  <div className="mt-1.5 shrink-0">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/40 group-hover:bg-emerald-400 transition-colors" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-400 text-xs leading-relaxed group-hover:text-slate-200 transition-colors">{item.text}</p>
                    <p className="text-slate-600 text-[10px] mt-0.5 flex items-center gap-1">
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

      {/* ── MOBILE BOTTOM NAV ────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-800 p-2 flex justify-around lg:hidden z-50">
        <a href="/dashboard" className="flex flex-col items-center gap-0.5 text-emerald-400">
          <Activity className="h-5 w-5" />
          <span className="text-[8px] font-medium">Home</span>
        </a>
        <a href="/patients" className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-200 transition-colors">
          <Users className="h-5 w-5" />
          <span className="text-[8px]">Patients</span>
        </a>
        <a href="/protocols" className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-200 transition-colors">
          <FileText className="h-5 w-5" />
          <span className="text-[8px]">Docs</span>
        </a>
        <a href="/settings" className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-200 transition-colors">
          <Brain className="h-5 w-5" />
          <span className="text-[8px]">Setup</span>
        </a>
      </nav>
    </div>
  )
}
