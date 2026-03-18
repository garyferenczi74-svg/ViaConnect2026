"use client"

import { useState, useMemo } from "react"
import {
  TrendingUp,
  Activity,
  Users,
  Layers,
  ChevronDown,
  FileDown,
  FileText,
  Database,
  Table2,
  Calendar,
  Filter,
  BarChart3,
  Sparkles,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
} from "recharts"

// ─── Types ──────────────────────────────────────────────────────────────────

interface Protocol {
  name: string
  patients: number
  improvement: number
  pValue: number
}

interface BiomarkerPoint {
  month: string
  median: number
  p25: number
  p75: number
  p10: number
  p90: number
}

interface BiomarkerConfig {
  label: string
  unit: string
  refLow: number
  refHigh: number
  data: BiomarkerPoint[]
}

interface CohortRow {
  id: string
  name: string
  indication: string
  size: number
  avgImprovement: number
  medianDays: number
  confidence: string
  status: "active" | "completed" | "enrolling"
}

// ─── Data ───────────────────────────────────────────────────────────────────

const PROTOCOLS: Protocol[] = [
  { name: "Methylation Support v4", patients: 84, improvement: 92, pValue: 0.001 },
  { name: "Mitochondrial Reset", patients: 67, improvement: 88, pValue: 0.002 },
  { name: "GI Core Protocol", patients: 91, improvement: 84, pValue: 0.003 },
  { name: "Adrenal Recovery", patients: 53, improvement: 79, pValue: 0.008 },
  { name: "Thyroid Optimization", patients: 72, improvement: 76, pValue: 0.005 },
  { name: "Detox Phase II", patients: 48, improvement: 74, pValue: 0.012 },
  { name: "Hormone Balance", patients: 63, improvement: 71, pValue: 0.009 },
  { name: "Neuro Support", patients: 41, improvement: 68, pValue: 0.021 },
  { name: "Cardiovascular Plus", patients: 58, improvement: 65, pValue: 0.015 },
  { name: "Immune Modulation", patients: 36, improvement: 61, pValue: 0.032 },
]

const BIOMARKERS: Record<string, BiomarkerConfig> = {
  vitD: {
    label: "Vitamin D",
    unit: "ng/mL",
    refLow: 30,
    refHigh: 80,
    data: [
      { month: "Jan", median: 22, p25: 18, p75: 28, p10: 14, p90: 35 },
      { month: "Feb", median: 26, p25: 21, p75: 32, p10: 16, p90: 38 },
      { month: "Mar", median: 32, p25: 26, p75: 39, p10: 20, p90: 45 },
      { month: "Apr", median: 38, p25: 31, p75: 46, p10: 24, p90: 52 },
      { month: "May", median: 44, p25: 36, p75: 52, p10: 28, p90: 58 },
      { month: "Jun", median: 48, p25: 40, p75: 56, p10: 32, p90: 62 },
      { month: "Jul", median: 52, p25: 44, p75: 60, p10: 36, p90: 66 },
      { month: "Aug", median: 55, p25: 47, p75: 63, p10: 38, p90: 70 },
      { month: "Sep", median: 54, p25: 46, p75: 62, p10: 37, p90: 68 },
      { month: "Oct", median: 52, p25: 44, p75: 60, p10: 35, p90: 66 },
      { month: "Nov", median: 48, p25: 40, p75: 56, p10: 32, p90: 62 },
      { month: "Dec", median: 46, p25: 38, p75: 54, p10: 30, p90: 60 },
    ],
  },
  b12: {
    label: "B12",
    unit: "pg/mL",
    refLow: 400,
    refHigh: 1100,
    data: [
      { month: "Jan", median: 320, p25: 260, p75: 400, p10: 200, p90: 480 },
      { month: "Feb", median: 380, p25: 310, p75: 460, p10: 240, p90: 540 },
      { month: "Mar", median: 440, p25: 360, p75: 530, p10: 280, p90: 620 },
      { month: "Apr", median: 510, p25: 420, p75: 610, p10: 330, p90: 710 },
      { month: "May", median: 560, p25: 470, p75: 660, p10: 370, p90: 760 },
      { month: "Jun", median: 620, p25: 520, p75: 730, p10: 410, p90: 840 },
      { month: "Jul", median: 660, p25: 560, p75: 770, p10: 450, p90: 880 },
      { month: "Aug", median: 690, p25: 590, p75: 800, p10: 480, p90: 910 },
      { month: "Sep", median: 710, p25: 610, p75: 820, p10: 500, p90: 930 },
      { month: "Oct", median: 700, p25: 600, p75: 810, p10: 490, p90: 920 },
      { month: "Nov", median: 680, p25: 580, p75: 790, p10: 470, p90: 900 },
      { month: "Dec", median: 670, p25: 570, p75: 780, p10: 460, p90: 890 },
    ],
  },
  omega3: {
    label: "Omega-3 Index",
    unit: "%",
    refLow: 8,
    refHigh: 12,
    data: [
      { month: "Jan", median: 4.2, p25: 3.4, p75: 5.1, p10: 2.8, p90: 6.0 },
      { month: "Feb", median: 4.8, p25: 3.9, p75: 5.8, p10: 3.2, p90: 6.7 },
      { month: "Mar", median: 5.6, p25: 4.6, p75: 6.7, p10: 3.7, p90: 7.8 },
      { month: "Apr", median: 6.4, p25: 5.3, p75: 7.6, p10: 4.3, p90: 8.8 },
      { month: "May", median: 7.1, p25: 5.9, p75: 8.4, p10: 4.8, p90: 9.7 },
      { month: "Jun", median: 7.8, p25: 6.5, p75: 9.2, p10: 5.3, p90: 10.5 },
      { month: "Jul", median: 8.3, p25: 7.0, p75: 9.7, p10: 5.7, p90: 11.0 },
      { month: "Aug", median: 8.6, p25: 7.3, p75: 10.0, p10: 6.0, p90: 11.3 },
      { month: "Sep", median: 8.8, p25: 7.5, p75: 10.2, p10: 6.2, p90: 11.5 },
      { month: "Oct", median: 8.7, p25: 7.4, p75: 10.1, p10: 6.1, p90: 11.4 },
      { month: "Nov", median: 8.5, p25: 7.2, p75: 9.9, p10: 5.9, p90: 11.2 },
      { month: "Dec", median: 8.4, p25: 7.1, p75: 9.8, p10: 5.8, p90: 11.1 },
    ],
  },
  iron: {
    label: "Iron (Ferritin)",
    unit: "ng/mL",
    refLow: 30,
    refHigh: 300,
    data: [
      { month: "Jan", median: 18, p25: 12, p75: 28, p10: 8, p90: 42 },
      { month: "Feb", median: 24, p25: 16, p75: 35, p10: 10, p90: 50 },
      { month: "Mar", median: 32, p25: 22, p75: 45, p10: 14, p90: 62 },
      { month: "Apr", median: 42, p25: 30, p75: 58, p10: 20, p90: 78 },
      { month: "May", median: 52, p25: 38, p75: 70, p10: 26, p90: 92 },
      { month: "Jun", median: 60, p25: 44, p75: 80, p10: 30, p90: 104 },
      { month: "Jul", median: 66, p25: 50, p75: 86, p10: 34, p90: 110 },
      { month: "Aug", median: 70, p25: 54, p75: 90, p10: 38, p90: 116 },
      { month: "Sep", median: 72, p25: 56, p75: 92, p10: 40, p90: 118 },
      { month: "Oct", median: 74, p25: 58, p75: 94, p10: 42, p90: 120 },
      { month: "Nov", median: 72, p25: 56, p75: 92, p10: 40, p90: 118 },
      { month: "Dec", median: 70, p25: 54, p75: 90, p10: 38, p90: 116 },
    ],
  },
  magnesium: {
    label: "Magnesium (RBC)",
    unit: "mg/dL",
    refLow: 4.2,
    refHigh: 6.8,
    data: [
      { month: "Jan", median: 3.6, p25: 3.1, p75: 4.2, p10: 2.6, p90: 4.8 },
      { month: "Feb", median: 3.9, p25: 3.3, p75: 4.5, p10: 2.8, p90: 5.1 },
      { month: "Mar", median: 4.2, p25: 3.6, p75: 4.9, p10: 3.0, p90: 5.5 },
      { month: "Apr", median: 4.5, p25: 3.9, p75: 5.2, p10: 3.3, p90: 5.9 },
      { month: "May", median: 4.8, p25: 4.2, p75: 5.5, p10: 3.5, p90: 6.2 },
      { month: "Jun", median: 5.0, p25: 4.4, p75: 5.7, p10: 3.7, p90: 6.4 },
      { month: "Jul", median: 5.2, p25: 4.6, p75: 5.9, p10: 3.9, p90: 6.6 },
      { month: "Aug", median: 5.3, p25: 4.7, p75: 6.0, p10: 4.0, p90: 6.7 },
      { month: "Sep", median: 5.4, p25: 4.8, p75: 6.1, p10: 4.1, p90: 6.8 },
      { month: "Oct", median: 5.3, p25: 4.7, p75: 6.0, p10: 4.0, p90: 6.7 },
      { month: "Nov", median: 5.2, p25: 4.6, p75: 5.9, p10: 3.9, p90: 6.6 },
      { month: "Dec", median: 5.1, p25: 4.5, p75: 5.8, p10: 3.8, p90: 6.5 },
    ],
  },
}

const OUTCOME_DATA = [
  { name: "Improving", value: 525, color: "#4ade80" },
  { name: "Stable", value: 237, color: "#fbbf24" },
  { name: "Declining", value: 85, color: "#f87171" },
]
const TOTAL_PATIENTS = 847

const COHORTS: CohortRow[] = [
  { id: "c1", name: "T2D Remission Alpha", indication: "Type 2 Diabetes", size: 42, avgImprovement: 34.2, medianDays: 127, confidence: "95% CI", status: "active" },
  { id: "c2", name: "AutoImmune Diet-Plus", indication: "Autoimmune", size: 28, avgImprovement: 45.1, medianDays: 94, confidence: "99% CI", status: "active" },
  { id: "c3", name: "MTHFR Methylation", indication: "Methylation", size: 67, avgImprovement: 38.7, medianDays: 83, confidence: "95% CI", status: "completed" },
  { id: "c4", name: "Thyroid Restore", indication: "Thyroid", size: 35, avgImprovement: 29.4, medianDays: 156, confidence: "90% CI", status: "active" },
  { id: "c5", name: "GI Microbiome Reset", indication: "GI/Digestive", size: 51, avgImprovement: 41.8, medianDays: 112, confidence: "95% CI", status: "enrolling" },
  { id: "c6", name: "Cardio Prevention", indication: "Cardiovascular", size: 44, avgImprovement: 22.6, medianDays: 180, confidence: "95% CI", status: "active" },
  { id: "c7", name: "Neuro Longevity", indication: "Neurological", size: 19, avgImprovement: 18.3, medianDays: 210, confidence: "90% CI", status: "enrolling" },
  { id: "c8", name: "Metabolic Syndrome", indication: "Metabolic", size: 56, avgImprovement: 36.5, medianDays: 140, confidence: "99% CI", status: "completed" },
]

const INDICATIONS = ["All Indications", "Type 2 Diabetes", "Autoimmune", "Methylation", "Thyroid", "GI/Digestive", "Cardiovascular", "Neurological", "Metabolic"]

// ─── Custom Tooltip ─────────────────────────────────────────────────────────

function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-400 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-white">
          <span className="text-slate-500">{p.name}: </span>
          <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Outcome Tooltip ────────────────────────────────────────────────────────

function OutcomeTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name?: string; value?: number }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  if (!d) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <span className="text-white font-medium">{d.name}: </span>
      <span className="text-slate-400">{d.value} patients ({Math.round(((d.value ?? 0) / TOTAL_PATIENTS) * 100)}%)</span>
    </div>
  )
}

// ─── Bio Tooltip ────────────────────────────────────────────────────────────

function BioTooltip({ active, payload, label, unit }: { active?: boolean; payload?: Array<{ payload: BiomarkerPoint }>; label?: string; unit: string }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 shadow-xl text-xs space-y-1">
      <p className="text-slate-400 font-medium">{label}</p>
      <p className="text-white">Median: <span className="font-bold text-[#4ade80]">{d.median} {unit}</span></p>
      <p className="text-slate-500">IQR: {d.p25} – {d.p75}</p>
      <p className="text-slate-600">P10-P90: {d.p10} – {d.p90}</p>
    </div>
  )
}

// ─── Protocol Tooltip ───────────────────────────────────────────────────────

function ProtocolTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Protocol }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 shadow-xl text-xs space-y-1">
      <p className="text-white font-semibold">{d.name}</p>
      <p className="text-slate-400">Patients: <span className="text-white font-medium">{d.patients}</span></p>
      <p className="text-slate-400">Avg Improvement: <span className="text-[#4ade80] font-medium">{d.improvement}%</span></p>
      <p className="text-slate-400">P-Value: <span className="text-[#a78bfa] font-mono">{d.pValue}</span></p>
    </div>
  )
}

// ─── KPI Ring ───────────────────────────────────────────────────────────────

function KpiRing({ value, size = 56 }: { value: number; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={4} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="#4ade80" strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
        {value}%
      </span>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [selectedBiomarker, setSelectedBiomarker] = useState("vitD")
  const [cohortIndication, setCohortIndication] = useState("All Indications")
  const [cohortMinDays, setCohortMinDays] = useState(30)
  const [exportFormat, setExportFormat] = useState("pdf")
  const [dateFrom, setDateFrom] = useState("2025-10-01")
  const [dateTo, setDateTo] = useState("2026-03-18")

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const bio = BIOMARKERS[selectedBiomarker]!

  const filteredCohorts = useMemo(() => {
    return COHORTS.filter((c) => {
      if (cohortIndication !== "All Indications" && c.indication !== cohortIndication) return false
      if (c.medianDays < cohortMinDays) return false
      return true
    })
  }, [cohortIndication, cohortMinDays])

  // Card base class
  const card = "bg-gray-800/50 backdrop-blur-sm border border-[#4ade80]/15 rounded-xl p-6"

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 min-h-screen bg-[#111827] text-slate-100 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#111827]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#4ade80]/10 p-1.5 rounded-lg">
              <BarChart3 className="h-5 w-5 text-[#4ade80]" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight block leading-tight">
                ViaConnect <span className="text-[#4ade80]">GeneX360</span>
              </span>
              <span className="text-[9px] text-slate-500 uppercase tracking-widest">Analytics Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#4ade80] font-bold bg-[#4ade80]/10 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#4ade80] rounded-full animate-pulse" />
              LIVE
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4ade80] to-emerald-600 border border-[#4ade80]/20 flex items-center justify-center text-xs font-bold text-gray-900">
              DR
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ─── 1. KPI ROW ────────────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Protocol Success Rate */}
          <div className={card}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Protocol Success</p>
                <h3 className="text-3xl font-bold mt-1 text-white">78%</h3>
                <p className="text-[11px] text-[#4ade80] flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" /> +4% vs last quarter
                </p>
              </div>
              <KpiRing value={78} />
            </div>
          </div>

          {/* Time-to-Improvement */}
          <div className={card}>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Avg Time-to-Improvement</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-4xl font-bold text-[#4ade80]">47</h3>
              <span className="text-sm text-slate-400">days</span>
            </div>
            <div className="mt-3 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { d: "W1", v: 68 }, { d: "W2", v: 62 }, { d: "W3", v: 58 },
                  { d: "W4", v: 54 }, { d: "W5", v: 52 }, { d: "W6", v: 49 },
                  { d: "W7", v: 48 }, { d: "W8", v: 47 },
                ]} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ttiGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#4ade80" strokeWidth={2} fill="url(#ttiGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Patient Adherence */}
          <div className={card}>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Patient Adherence</p>
            <h3 className="text-3xl font-bold mt-1 text-white">84%</h3>
            <div className="mt-3 h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-[#4ade80] rounded-full transition-all duration-1000 ease-out" style={{ width: "84%" }} />
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Target: 80%</p>
          </div>

          {/* Active Cohorts */}
          <div className={card}>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Active Cohorts</p>
            <h3 className="text-3xl font-bold mt-1 text-white">12</h3>
            <div className="mt-3 space-y-1.5 text-[10px]">
              <div className="flex justify-between text-slate-400"><span>Metabolic</span><span className="font-semibold text-white">4</span></div>
              <div className="flex justify-between text-slate-400"><span>Autoimmune</span><span className="font-semibold text-white">3</span></div>
              <div className="flex justify-between text-slate-400"><span>Neurological</span><span className="font-semibold text-white">3</span></div>
              <div className="flex justify-between text-slate-400"><span>Cardiovascular</span><span className="font-semibold text-white">2</span></div>
            </div>
          </div>
        </section>

        {/* ─── 2. PROTOCOL EFFECTIVENESS ─────────────────────── */}
        <section className={card}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#4ade80]" />
                Protocol Effectiveness — Top 10
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Average improvement percentage by protocol</p>
            </div>
            <span className="text-[10px] text-[#4ade80] font-bold bg-[#4ade80]/10 px-2 py-1 rounded">LIVE</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PROTOCOLS} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  height={70}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <ReTooltip content={<ProtocolTooltip />} cursor={{ fill: "rgba(74,222,128,0.05)" }} />
                <Bar
                  dataKey="improvement"
                  fill="#4ade80"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ─── 3 & 4. BIOMARKER TRENDS + OUTCOME DISTRIBUTION ── */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Biomarker Trends (2/3) */}
          <div className={`xl:col-span-2 ${card}`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-sm">Biomarker Trends</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Median across cohorts • Shaded = reference range</p>
              </div>
              <div className="relative">
                <select
                  value={selectedBiomarker}
                  onChange={(e) => setSelectedBiomarker(e.target.value)}
                  className="appearance-none bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-8 py-2 text-xs text-white focus:outline-none focus:border-[#4ade80]/40 cursor-pointer"
                >
                  <option value="vitD">Vitamin D</option>
                  <option value="b12">B12</option>
                  <option value="omega3">Omega-3 Index</option>
                  <option value="iron">Iron (Ferritin)</option>
                  <option value="magnesium">Magnesium (RBC)</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bio.data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="bioGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v: number) => `${v}`} />
                  {/* Reference range band rendered as constant-value areas */}
                  <Area type="monotone" dataKey={() => bio.refHigh} stroke="none" fill="#374151" fillOpacity={0.3} isAnimationActive={false} />
                  <Area type="monotone" dataKey={() => bio.refLow} stroke="none" fill="#111827" fillOpacity={1} isAnimationActive={false} />
                  <ReTooltip content={<BioTooltip unit={bio.unit} />} />
                  {/* P10-P90 band */}
                  <Area type="monotone" dataKey="p90" stroke="none" fill="#4ade80" fillOpacity={0.04} stackId="band" />
                  <Area type="monotone" dataKey="p10" stroke="none" fill="#111827" fillOpacity={1} stackId="band" />
                  {/* P25-P75 band */}
                  <Area type="monotone" dataKey="p75" stroke="none" fill="#4ade80" fillOpacity={0.08} />
                  <Area type="monotone" dataKey="p25" stroke="none" fill="#111827" fillOpacity={1} />
                  {/* Median line */}
                  <Line
                    type="monotone"
                    dataKey="median"
                    stroke="#4ade80"
                    strokeWidth={2.5}
                    dot={{ fill: "#4ade80", r: 3, stroke: "#111827", strokeWidth: 2 }}
                    activeDot={{ r: 5, stroke: "#4ade80", strokeWidth: 2, fill: "#111827" }}
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500">
              <span>Unit: {bio.unit}</span>
              <span className="flex items-center gap-1.5">
                <span className="w-6 h-2 bg-[#374151]/60 rounded inline-block" /> Reference Range ({bio.refLow}–{bio.refHigh})
              </span>
            </div>
          </div>

          {/* Outcome Distribution (1/3) */}
          <div className={card}>
            <h3 className="font-bold text-sm mb-6">Outcome Distribution</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={OUTCOME_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    animationDuration={1200}
                    animationEasing="ease-out"
                  >
                    {OUTCOME_DATA.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <ReTooltip content={<OutcomeTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Center label (positioned over chart) */}
            <div className="flex flex-col items-center -mt-[150px] mb-[90px] pointer-events-none">
              <span className="text-2xl font-bold text-white">{TOTAL_PATIENTS}</span>
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">patients</span>
            </div>
            {/* Legend */}
            <div className="space-y-3 mt-2">
              {OUTCOME_DATA.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: d.color }} />
                    <span className="text-xs text-slate-300">{d.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-white">{Math.round((d.value / TOTAL_PATIENTS) * 100)}%</span>
                    <span className="text-[10px] text-slate-500 ml-2">{d.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 5. COHORT ANALYSIS TOOL ───────────────────────── */}
        <section className={card}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#a78bfa]" />
                Cohort Analysis Tool
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Filter and analyze cohort outcomes</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-slate-900/40 rounded-xl border border-slate-800/60">
            {/* Indication */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1">
                <Filter className="h-3 w-3" /> Indication
              </label>
              <div className="relative">
                <select
                  value={cohortIndication}
                  onChange={(e) => setCohortIndication(e.target.value)}
                  className="appearance-none bg-slate-800 border border-slate-700 rounded-lg pl-3 pr-8 py-2 text-xs text-white focus:outline-none focus:border-[#4ade80]/40 cursor-pointer min-w-[160px]"
                >
                  {INDICATIONS.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* Min Duration Slider */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Min Duration: {cohortMinDays} days
              </label>
              <input
                type="range"
                min={30}
                max={360}
                step={10}
                value={cohortMinDays}
                onChange={(e) => setCohortMinDays(Number(e.target.value))}
                className="w-48 h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-[#4ade80]"
              />
            </div>

            <div className="ml-auto">
              <button className="border border-[#4ade80]/30 text-[#4ade80] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#4ade80]/10 transition-colors flex items-center gap-1.5">
                <FileDown className="h-3.5 w-3.5" /> Export Cohort Data
              </button>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-800/60">
                <tr>
                  <th className="pb-3 pr-4 font-semibold">Cohort</th>
                  <th className="pb-3 px-4 font-semibold">Size</th>
                  <th className="pb-3 px-4 font-semibold">Avg Improvement</th>
                  <th className="pb-3 px-4 font-semibold">Median Days</th>
                  <th className="pb-3 px-4 font-semibold">Confidence</th>
                  <th className="pb-3 pl-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredCohorts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No cohorts match the current filters
                    </td>
                  </tr>
                ) : (
                  filteredCohorts.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/20 transition-colors cursor-pointer">
                      <td className="py-3.5 pr-4">
                        <div>
                          <span className="font-medium text-white">{c.name}</span>
                          <span className="block text-[10px] text-slate-500 mt-0.5">{c.indication}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">{c.size}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-[#4ade80] font-semibold">+{c.avgImprovement}%</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono">{c.medianDays}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-[#a78bfa] font-mono text-[10px]">{c.confidence}</span>
                      </td>
                      <td className="py-3.5 pl-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          c.status === "active"
                            ? "bg-[#4ade80]/15 text-[#4ade80]"
                            : c.status === "completed"
                            ? "bg-slate-700/50 text-slate-400"
                            : "bg-[#fbbf24]/15 text-[#fbbf24]"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ─── 6. RWE EXPORT PANEL ───────────────────────────── */}
        <section className={card}>
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="h-4 w-4 text-[#a78bfa]" />
            <h3 className="font-bold text-sm">Generate Real-World Evidence Report</h3>
          </div>

          <div className="flex flex-wrap items-end gap-6">
            {/* Format */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Format</label>
              <div className="flex gap-2">
                {[
                  { value: "pdf", label: "PDF", icon: <FileText className="h-3.5 w-3.5" /> },
                  { value: "fhir", label: "FHIR", icon: <Database className="h-3.5 w-3.5" /> },
                  { value: "csv", label: "CSV", icon: <Table2 className="h-3.5 w-3.5" /> },
                ].map((fmt) => (
                  <button
                    key={fmt.value}
                    onClick={() => setExportFormat(fmt.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      exportFormat === fmt.value
                        ? "bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30"
                        : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    {fmt.icon} {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Date Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#4ade80]/40"
                />
                <span className="text-slate-600 text-xs">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#4ade80]/40"
                />
              </div>
            </div>

            {/* Generate */}
            <button className="bg-[#4ade80] text-gray-900 font-bold rounded-lg px-6 py-2.5 text-sm hover:bg-[#6ee7a0] transition-colors flex items-center gap-2 shadow-[0_0_16px_rgba(74,222,128,0.2)]">
              <FileDown className="h-4 w-4" />
              Generate
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
