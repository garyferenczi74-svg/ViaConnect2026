"use client"

import { useState } from "react"
import {
  Server,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpDown,
  Database,
  Shield,
  Settings2,
  Link2,
  FileText,
  ArrowDownToLine,
  ArrowUpFromLine,
  Terminal,
  Zap,
  AlertTriangle,
  ChevronRight,
  Network,
  Activity,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

type ConnectionStatus = "connected" | "degraded" | "error" | "disconnected"

interface EHRSystem {
  id: string
  name: string
  fhirVersion: string
  status: ConnectionStatus
  lastSync: string | null
  latency: string | null
  recordsSynced: number
}

interface ActivityEvent {
  id: string
  type: string
  detail: string
  time: string
  highlight: boolean
}

interface MedSyncItem {
  id: string
  drug: string
  dosage: string
  status: "verified" | "pending" | "conflict"
}

interface ProtocolPush {
  id: string
  name: string
  progress: number
  status: "pushing" | "queued" | "complete"
}

interface SyncRecord {
  id: string
  date: string
  system: string
  records: number
  direction: "Import" | "Export"
  status: "Completed" | "Failed" | "In Progress"
  duration: string
}

interface FHIRMapping {
  resource: string
  localField: string
  fhirPath: string
  status: "Mapped" | "Partial" | "Unmapped"
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const EHR_SYSTEMS: EHRSystem[] = [
  { id: "epic", name: "EPIC", fhirVersion: "FHIR R4", status: "connected", lastSync: "14:02:11 UTC", latency: "24ms", recordsSynced: 12847 },
  { id: "cerner", name: "CERNER", fhirVersion: "FHIR R4", status: "connected", lastSync: "08:45:00 UTC", latency: "67ms", recordsSynced: 8234 },
  { id: "athena", name: "ATHENA", fhirVersion: "FHIR R4", status: "error", lastSync: null, latency: null, recordsSynced: 0 },
  { id: "fhir", name: "FHIR_v4", fhirVersion: "FHIR R4", status: "connected", lastSync: "13:58:22 UTC", latency: "112ms", recordsSynced: 3421 },
]

const ACTIVITY_EVENTS: ActivityEvent[] = [
  { id: "a1", type: "MED_UPDATE", detail: "Lisinopril 10mg", time: "2m ago", highlight: true },
  { id: "a2", type: "LAB_SYNC", detail: "Panel: Metabolic", time: "5m ago", highlight: false },
  { id: "a3", type: "PROTOCOL_PUSH", detail: "Hypertension v2.4", time: "12m ago", highlight: false },
  { id: "a4", type: "AUTH_REFRESH", detail: "Epic OAuth token", time: "18m ago", highlight: true },
  { id: "a5", type: "PATIENT_IMPORT", detail: "Batch: 234 records", time: "25m ago", highlight: false },
  { id: "a6", type: "ERROR", detail: "Athena: Token Expired", time: "32m ago", highlight: true },
]

const MED_SYNC_QUEUE: MedSyncItem[] = [
  { id: "m1", drug: "Atorvastatin", dosage: "40mg PO QD", status: "verified" },
  { id: "m2", drug: "Metformin", dosage: "500mg PO BID", status: "verified" },
  { id: "m3", drug: "Lisinopril", dosage: "10mg PO QD", status: "verified" },
  { id: "m4", drug: "Levothyroxine", dosage: "50mcg PO QD", status: "pending" },
  { id: "m5", drug: "Omeprazole", dosage: "20mg PO QD", status: "conflict" },
]

const PROTOCOL_PUSHES: ProtocolPush[] = [
  { id: "p1", name: "Hypertension v2.4", progress: 65, status: "pushing" },
  { id: "p2", name: "T2D Methylation", progress: 0, status: "queued" },
]

const SYNC_HISTORY: SyncRecord[] = [
  { id: "s1", date: "2026-03-18 09:45", system: "Epic", records: 234, direction: "Import", status: "Completed", duration: "2m 14s" },
  { id: "s2", date: "2026-03-17 15:30", system: "Epic", records: 189, direction: "Export", status: "Completed", duration: "1m 48s" },
  { id: "s3", date: "2026-03-17 09:00", system: "Cerner", records: 312, direction: "Import", status: "Completed", duration: "3m 02s" },
  { id: "s4", date: "2026-03-16 16:15", system: "Athena", records: 0, direction: "Import", status: "Failed", duration: "0m 32s" },
  { id: "s5", date: "2026-03-16 09:00", system: "Epic", records: 276, direction: "Import", status: "Completed", duration: "2m 37s" },
  { id: "s6", date: "2026-03-15 14:00", system: "FHIR_v4", records: 145, direction: "Export", status: "Completed", duration: "1m 22s" },
]

const FHIR_MAPPINGS: FHIRMapping[] = [
  { resource: "Patient", localField: "patient_demographics", fhirPath: "Patient/{id}", status: "Mapped" },
  { resource: "Observation", localField: "lab_results", fhirPath: "Observation?patient={id}", status: "Mapped" },
  { resource: "MedicationRequest", localField: "prescriptions", fhirPath: "MedicationRequest?patient={id}", status: "Mapped" },
  { resource: "DiagnosticReport", localField: "diagnostic_reports", fhirPath: "DiagnosticReport?patient={id}", status: "Partial" },
  { resource: "CarePlan", localField: "treatment_protocols", fhirPath: "CarePlan?patient={id}", status: "Partial" },
  { resource: "AllergyIntolerance", localField: "allergies", fhirPath: "AllergyIntolerance?patient={id}", status: "Mapped" },
  { resource: "Condition", localField: "conditions", fhirPath: "Condition?patient={id}", status: "Mapped" },
  { resource: "Immunization", localField: "immunizations", fhirPath: "Immunization?patient={id}", status: "Unmapped" },
]

// ─── Vital pulse bar heights (mock) ─────────────────────────────────────────
const PULSE_BARS = [50, 67, 33, 75, 100, 67, 42, 83, 58, 92, 50, 75, 33, 67, 83, 50, 92, 42, 67, 100]

// ─── Status helpers ─────────────────────────────────────────────────────────

function connectionIndicator(status: ConnectionStatus) {
  switch (status) {
    case "connected": return "bg-[#4ade80] shadow-[0_0_8px_#4ade80]"
    case "degraded": return "bg-[#fbbf24] shadow-[0_0_8px_#fbbf24]"
    case "error": return "bg-[#f87171] shadow-[0_0_8px_#f87171]"
    case "disconnected": return "bg-slate-600"
  }
}

function medStatusBadge(status: MedSyncItem["status"]) {
  switch (status) {
    case "verified": return { text: "VERIFIED", color: "bg-[#4ade80]/10 text-[#4ade80]" }
    case "pending": return { text: "PENDING", color: "bg-[#fbbf24]/10 text-[#fbbf24]" }
    case "conflict": return { text: "CONFLICT", color: "bg-[#f87171]/10 text-[#f87171]" }
  }
}

// ─── Card base ──────────────────────────────────────────────────────────────

const card = "bg-[#141b2b] rounded-xl"
const cardBorder = `${card} border border-[#3d4a3e]/15`

// ─── Component ──────────────────────────────────────────────────────────────

export default function EHRIntegrationPage() {
  const [fhirUrl, setFhirUrl] = useState("https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4")
  const [clientId, setClientId] = useState("viaconnect-prod-2026")
  const [clientSecret, setClientSecret] = useState("")
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["patient", "observation", "medication"])
  const [testingConnection, setTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null)

  function handleToggleScope(id: string) {
    setSelectedScopes((p) => p.includes(id) ? p.filter((s) => s !== id) : [...p, id])
  }

  function handleTest() {
    setTestingConnection(true)
    setTestResult(null)
    setTimeout(() => { setTestingConnection(false); setTestResult("success") }, 2000)
  }

  const connectedCount = EHR_SYSTEMS.filter((s) => s.status === "connected").length
  const totalRecords = EHR_SYSTEMS.reduce((sum, s) => sum + s.recordsSynced, 0)

  const FHIR_SCOPES = [
    { id: "patient", label: "Patient", desc: "Read/write patient demographics" },
    { id: "observation", label: "Observation", desc: "Lab results and vital signs" },
    { id: "medication", label: "MedicationRequest", desc: "Prescription and medication data" },
    { id: "diagnostic", label: "DiagnosticReport", desc: "Diagnostic and imaging reports" },
    { id: "careplan", label: "CarePlan", desc: "Treatment plans and protocols" },
  ]

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 min-h-screen bg-[#0c1322] text-[#dce2f7] pb-24 lg:pb-12">
      {/* ── HEADER ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#0c1322] shadow-[0_20px_40px_rgba(0,0,0,0.4)] border-b border-[#3d4a3e]/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Network className="h-5 w-5 text-[#6bfb9a]" />
            <span className="text-xl font-black text-[#6bfb9a] tracking-tighter">ViaConnect</span>
          </div>
          <div className="hidden md:flex gap-6 font-bold tracking-tight text-sm">
            <span className="text-[#6bfb9a] border-b-2 border-[#6bfb9a] pb-1">EHR Integration</span>
            <span className="opacity-50 cursor-pointer hover:opacity-70 transition-opacity">Connections</span>
            <span className="opacity-50 cursor-pointer hover:opacity-70 transition-opacity">Medications</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#6bfb9a]/20 border border-[#6bfb9a]/40 flex items-center justify-center text-[10px] font-bold">DR</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* ── SYSTEM VITAL PULSE (8-col) ─────────────────────── */}
        <section className={`md:col-span-8 ${card} p-6 relative overflow-hidden`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-[#6bfb9a]">System Vital Pulse</h2>
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-[10px] opacity-50 uppercase">Latency</p>
                <p className="font-mono text-sm text-[#6bfb9a]">24ms</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] opacity-50 uppercase">Uptime</p>
                <p className="font-mono text-sm text-[#6bfb9a]">99.98%</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] opacity-50 uppercase">Records</p>
                <p className="font-mono text-sm text-[#6bfb9a]">{totalRecords.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="h-32 flex items-end gap-1">
            {PULSE_BARS.map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-sm transition-all duration-300 ${i === PULSE_BARS.length - 1 ? "bg-[#6bfb9a]" : `bg-[#6bfb9a]/${Math.max(15, Math.round(h * 0.6))}`}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-4 text-[10px] text-[#6bfb9a]/40">
            <Activity className="h-3 w-3" />
            <span className="font-mono uppercase tracking-wider">Live — 20 data points — 5min window</span>
          </div>
        </section>

        {/* ── ACTIVITY STREAM (4-col) ────────────────────────── */}
        <section className={`md:col-span-4 bg-[#232a3a] p-6 rounded-xl border border-[#3d4a3e]/15`}>
          <h3 className="font-mono text-xs mb-4 flex items-center gap-2 text-[#dce2f7]/60">
            <Terminal className="h-3.5 w-3.5" /> Activity Stream
          </h3>
          <div className="space-y-3">
            {ACTIVITY_EVENTS.map((evt) => (
              <div
                key={evt.id}
                className={`flex justify-between items-start pl-3 py-2 border-l-2 ${
                  evt.highlight ? "border-[#6bfb9a] bg-[#070e1d]/50" : "border-[#3d4a3e]"
                }`}
              >
                <div>
                  <p className="text-xs font-bold">{evt.type}</p>
                  <p className="text-[10px] opacity-50">{evt.detail}</p>
                </div>
                <span className="text-[9px] font-mono opacity-30 shrink-0">{evt.time}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── EHR CONNECTION GRID (full-width) ───────────────── */}
        <div className="md:col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {EHR_SYSTEMS.map((sys) => (
            <div
              key={sys.id}
              className={`bg-[#070e1d] p-4 rounded-xl border transition-all hover:border-[#6bfb9a]/40 ${
                sys.status === "error"
                  ? "border-[#f87171]/30"
                  : sys.status === "connected"
                  ? "border-[#6bfb9a]/10"
                  : "border-[#3d4a3e]/20"
              } ${sys.status === "error" ? "" : "opacity-90 hover:opacity-100"}`}
            >
              <div className="flex justify-between mb-4">
                <span className={`font-black tracking-tighter ${sys.status === "error" ? "text-[#f87171]" : ""}`}>
                  {sys.name}
                </span>
                {sys.status === "error" ? (
                  <AlertTriangle className="h-4 w-4 text-[#f87171]" />
                ) : (
                  <span className={`w-2 h-2 rounded-full ${connectionIndicator(sys.status)}`} />
                )}
              </div>
              <p className="text-[10px] opacity-50 mb-1">
                {sys.status === "error" ? "Status" : "Last Sync"}
              </p>
              <p className={`font-mono text-xs ${sys.status === "error" ? "text-[#f87171]" : ""}`}>
                {sys.status === "error" ? "Token Expired" : sys.lastSync ?? "—"}
              </p>
              {sys.latency && (
                <div className="mt-2">
                  <p className="text-[10px] opacity-50">Latency</p>
                  <p className="font-mono text-xs">{sys.latency}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── MEDICATION SYNC QUEUE (7-col) ───────────────────── */}
        <section className={`md:col-span-7 bg-[#191f2f] p-1 rounded-2xl overflow-hidden`}>
          <div className="px-6 py-4 flex justify-between items-center">
            <h3 className="text-sm font-bold">Medication Sync Queue</h3>
            <button className="text-[10px] font-mono bg-[#6bfb9a]/10 text-[#6bfb9a] px-3 py-1.5 rounded-full uppercase tracking-[0.15em] hover:bg-[#6bfb9a] hover:text-[#003919] transition-colors">
              Sync All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#323949]/50 font-mono text-[#3d4a3e] text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Drug</th>
                  <th className="px-6 py-3">Dosage</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3d4a3e]/10">
                {MED_SYNC_QUEUE.map((med, i) => {
                  const badge = medStatusBadge(med.status)
                  return (
                    <tr key={med.id} className={`${i % 2 === 0 ? "bg-[#070e1d]/30" : "bg-[#141b2b]/30"} hover:bg-[#232a3a] transition-colors`}>
                      <td className="px-6 py-4 font-bold">{med.drug}</td>
                      <td className="px-6 py-4 font-mono text-slate-400">{med.dosage}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${badge.color}`}>
                          {badge.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <RefreshCw className="h-3.5 w-3.5 text-slate-500 hover:text-[#6bfb9a] cursor-pointer transition-colors inline-block" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── PROTOCOL PUSH + STATS (5-col) ───────────────────── */}
        <section className="md:col-span-5 flex flex-col gap-4">
          {/* Protocol Push */}
          <div className={`${card} p-6 border-l-4 border-[#6bfb9a] shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-[#6bfb9a]">Protocol Push Outbound</h3>
              <span className="text-[10px] px-2.5 py-1 bg-[#6bfb9a]/20 text-[#6bfb9a] rounded font-semibold">
                {PROTOCOL_PUSHES.length} QUEUED
              </span>
            </div>
            <div className="space-y-3">
              {PROTOCOL_PUSHES.map((proto) => (
                <div key={proto.id} className="bg-[#070e1d] p-3 rounded-lg flex items-center gap-4">
                  <FileText className="h-4 w-4 text-[#6bfb9a]/60 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{proto.name}</p>
                    <div className="w-full bg-[#2e3545] h-1 rounded-full mt-2 overflow-hidden">
                      <div className="bg-[#6bfb9a] h-full transition-all duration-500" style={{ width: `${proto.progress}%` }} />
                    </div>
                  </div>
                  <span className="text-[10px] font-mono shrink-0">{proto.progress}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Glass Stats */}
          <div className="bg-[#232a3a]/60 backdrop-blur-xl p-6 rounded-xl border border-white/5 flex justify-around">
            <div className="text-center">
              <p className="text-2xl font-black text-[#6bfb9a]">1.2k</p>
              <p className="text-[10px] uppercase opacity-50">Push/Hr</p>
            </div>
            <div className="w-px bg-[#3d4a3e]/30" />
            <div className="text-center">
              <p className="text-2xl font-black text-[#6bfb9a]">0.02%</p>
              <p className="text-[10px] uppercase opacity-50">Fail Rate</p>
            </div>
            <div className="w-px bg-[#3d4a3e]/30" />
            <div className="text-center">
              <p className="text-2xl font-black text-[#6bfb9a]">{connectedCount}/{EHR_SYSTEMS.length}</p>
              <p className="text-[10px] uppercase opacity-50">Connected</p>
            </div>
          </div>
        </section>

        {/* ── SYNC HISTORY (full-width) ───────────────────────── */}
        <section className={`md:col-span-12 bg-[#191f2f] rounded-2xl overflow-hidden`}>
          <div className="px-6 py-4 flex justify-between items-center border-b border-[#3d4a3e]/15">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-[#6bfb9a]/60" /> Sync History
            </h3>
            <button className="text-[10px] text-[#6bfb9a] font-semibold flex items-center gap-1 hover:underline">
              View All <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#323949]/30 font-mono text-[#3d4a3e] text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">System</th>
                  <th className="px-6 py-3">Records</th>
                  <th className="px-6 py-3">Direction</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3d4a3e]/10">
                {SYNC_HISTORY.map((rec) => (
                  <tr key={rec.id} className="hover:bg-[#232a3a]/50 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-slate-400">{rec.date}</td>
                    <td className="px-6 py-3.5 font-bold text-white">{rec.system}</td>
                    <td className="px-6 py-3.5 font-mono">{rec.records.toLocaleString()}</td>
                    <td className="px-6 py-3.5">
                      <span className="flex items-center gap-1.5">
                        {rec.direction === "Import" ? (
                          <ArrowDownToLine className="h-3 w-3 text-blue-400" />
                        ) : (
                          <ArrowUpFromLine className="h-3 w-3 text-amber-400" />
                        )}
                        <span className="text-slate-400">{rec.direction}</span>
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        rec.status === "Completed" ? "bg-[#4ade80]/10 text-[#4ade80]" :
                        rec.status === "Failed" ? "bg-[#f87171]/10 text-[#f87171]" :
                        "bg-[#fbbf24]/10 text-[#fbbf24]"
                      }`}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-500">{rec.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── FHIR CONFIGURATION (full-width) ─────────────────── */}
        <section className={`md:col-span-12 ${cardBorder} p-6 space-y-6`}>
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/10 p-2 rounded-lg">
              <Shield className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold">FHIR Configuration</h3>
              <p className="text-[10px] text-slate-500">Configure server connection parameters</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">FHIR Server URL</label>
              <input
                value={fhirUrl}
                onChange={(e) => setFhirUrl(e.target.value)}
                className="w-full bg-[#070e1d] border border-[#3d4a3e]/30 rounded-lg px-4 py-2.5 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-[#6bfb9a]/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Client ID</label>
              <input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-[#070e1d] border border-[#3d4a3e]/30 rounded-lg px-4 py-2.5 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-[#6bfb9a]/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Client Secret</label>
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Enter client secret"
                className="w-full bg-[#070e1d] border border-[#3d4a3e]/30 rounded-lg px-4 py-2.5 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-[#6bfb9a]/40"
              />
            </div>
          </div>

          <div className="border-t border-[#3d4a3e]/15 pt-5">
            <h4 className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-3">FHIR Scopes</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FHIR_SCOPES.map((scope) => {
                const checked = selectedScopes.includes(scope.id)
                return (
                  <label
                    key={scope.id}
                    className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                      checked
                        ? "border-[#6bfb9a]/30 bg-[#6bfb9a]/5"
                        : "border-[#3d4a3e]/20 hover:border-[#3d4a3e]/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleScope(scope.id)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-[#070e1d] accent-[#6bfb9a]"
                    />
                    <div>
                      <p className="text-xs font-semibold text-white">{scope.label}</p>
                      <p className="text-[10px] text-slate-500">{scope.desc}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {testResult === "success" && (
            <div className="flex items-center gap-2 rounded-xl bg-[#4ade80]/5 border border-[#4ade80]/20 p-3 text-xs text-[#4ade80]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Connection test successful. FHIR server is reachable and responding.
            </div>
          )}
          {testResult === "error" && (
            <div className="flex items-center gap-2 rounded-xl bg-[#f87171]/5 border border-[#f87171]/20 p-3 text-xs text-[#f87171]">
              <XCircle className="h-4 w-4 shrink-0" />
              Connection test failed. Verify credentials and server URL.
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleTest}
              disabled={testingConnection}
              className="border border-[#3d4a3e]/30 text-slate-300 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#232a3a] transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${testingConnection ? "animate-spin" : ""}`} />
              {testingConnection ? "Testing..." : "Test Connection"}
            </button>
            <button className="bg-[#6bfb9a] text-[#003919] px-5 py-2 rounded-lg text-xs font-bold hover:bg-[#6bfb9a]/80 transition-colors">
              Save Configuration
            </button>
          </div>
        </section>

        {/* ── DATA MAPPING TABLE (full-width) ─────────────────── */}
        <section className={`md:col-span-12 bg-[#191f2f] rounded-2xl overflow-hidden`}>
          <div className="px-6 py-4 flex items-center gap-3 border-b border-[#3d4a3e]/15">
            <FileText className="h-4 w-4 text-amber-400/60" />
            <div>
              <h3 className="text-sm font-bold">Data Mapping</h3>
              <p className="text-[10px] text-slate-500">FHIR resource to local data field mappings</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#323949]/30 font-mono text-[#3d4a3e] text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">FHIR Resource</th>
                  <th className="px-6 py-3">Local Field</th>
                  <th className="px-6 py-3">FHIR Path</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3d4a3e]/10">
                {FHIR_MAPPINGS.map((m) => (
                  <tr key={m.resource} className="hover:bg-[#232a3a]/50 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-white">{m.resource}</td>
                    <td className="px-6 py-3.5">
                      <code className="bg-[#070e1d] border border-[#3d4a3e]/20 px-2 py-0.5 rounded text-[10px] font-mono text-slate-400">
                        {m.localField}
                      </code>
                    </td>
                    <td className="px-6 py-3.5">
                      <code className="bg-[#070e1d] border border-[#3d4a3e]/20 px-2 py-0.5 rounded text-[10px] font-mono text-slate-500">
                        {m.fhirPath}
                      </code>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        m.status === "Mapped" ? "bg-[#4ade80]/10 text-[#4ade80]" :
                        m.status === "Partial" ? "bg-[#fbbf24]/10 text-[#fbbf24]" :
                        "bg-slate-700/50 text-slate-400"
                      }`}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* ── MOBILE NAV ─────────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 bg-[#0c1322]/80 backdrop-blur-xl border-t border-[#3d4a3e]/15 flex justify-around items-center px-4 pb-4 pt-2 md:hidden z-50">
        {[
          { icon: <Server className="h-5 w-5" />, label: "Dash", active: true },
          { icon: <ArrowUpDown className="h-5 w-5" />, label: "Connect", active: false },
          { icon: <Database className="h-5 w-5" />, label: "Meds", active: false },
          { icon: <Terminal className="h-5 w-5" />, label: "Rules", active: false },
          { icon: <Zap className="h-5 w-5" />, label: "Hooks", active: false },
        ].map((item, i) => (
          <div key={i} className={`flex flex-col items-center justify-center ${
            item.active ? "bg-[#6bfb9a]/10 text-[#6bfb9a] rounded-xl px-3 py-1" : "text-[#dce2f7]/30"
          }`}>
            {item.icon}
            <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  )
}
