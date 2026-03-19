"use client"

import * as React from "react"
import Link from "next/link"
import {
  User,
  Plus,
  RefreshCw,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

type PatientStatus = "Critical" | "Stable" | "Observing"
type ProtocolPriority = "High" | "Normal" | "Emergency"
type ProtocolStatus = "Active" | "Queued" | "In Progress"

interface MonitoredPatient {
  id: string
  name: string
  ref: string
  hr: string
  spo2: string
  status: PatientStatus
}

interface Protocol {
  id: string
  type: string
  priority: ProtocolPriority
  clinician: string
  status: ProtocolStatus
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MONITORED_PATIENTS: MonitoredPatient[] = [
  { id: "1", name: "Marcus Sterling", ref: "NX-9022-A", hr: "102 BPM", spo2: "94%", status: "Critical" },
  { id: "2", name: "Elena Vance", ref: "NX-4412-C", hr: "72 BPM", spo2: "99%", status: "Stable" },
  { id: "3", name: "Sarah Chen", ref: "NX-3819-F", hr: "84 BPM", spo2: "97%", status: "Observing" },
]

const PROTOCOLS: Protocol[] = [
  { id: "P-9102", type: "Neural Mapping Phase II", priority: "High", clinician: "Dr. Aris Thorne", status: "Active" },
  { id: "P-4421", type: "Cellular Regrowth V3", priority: "Normal", clinician: "Dr. Kaelen Moss", status: "Queued" },
  { id: "P-8002", type: "Synaptic Re-linkage", priority: "Emergency", clinician: "Dr. Julian Vane", status: "In Progress" },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusBadge(status: PatientStatus) {
  switch (status) {
    case "Critical":
      return "bg-[#a40217] text-[#ffaea8]"
    case "Stable":
      return "bg-[#2e3545] text-[#dce2f7]/40"
    case "Observing":
      return "bg-[#2e3545] text-[#dce2f7]/40"
  }
}

function priorityBadge(priority: ProtocolPriority) {
  switch (priority) {
    case "High":
      return "bg-[#ffb657] text-[#734700]"
    case "Normal":
      return "bg-[#2e3545] text-[#dce2f7]/40"
    case "Emergency":
      return "bg-[#a40217] text-[#ffaea8]"
  }
}

function protocolStatusIndicator(status: ProtocolStatus) {
  switch (status) {
    case "Active":
    case "In Progress":
      return { dot: "bg-[#6bfb9a]", text: "text-[#6bfb9a]" }
    case "Queued":
      return { dot: "bg-[#dce2f7]/20", text: "text-[#dce2f7]/40" }
  }
}

// ─── Dashboard Page ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* ── Asymmetric Bento Header ──────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Welcome Panel (2/3) */}
        <div className="md:col-span-2 bg-[#232a3a]/40 backdrop-blur-[20px] p-8 rounded-3xl border-l border-[#6bfb9a]/20 flex flex-col justify-between min-h-[240px]">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">Systems Nominal.</h1>
            <p className="text-[#dce2f7]/60 max-w-lg">
              Welcome back, Dr. Vane. You have 4 surgical procedures scheduled and 12
              record reviews pending for the Alpha-7 cluster.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-[#6bfb9a]/10 rounded-full border border-[#6bfb9a]/10">
              <span className="w-2 h-2 rounded-full bg-[#6bfb9a] animate-pulse" />
              <span className="text-xs font-mono text-[#6bfb9a] uppercase">EHR Sync Active</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-[#2e3545] rounded-full border border-[#3d4a3e]/10">
              <RefreshCw className="h-3 w-3 text-[#dce2f7]/40" />
              <span className="text-xs font-mono text-[#dce2f7]/60 uppercase">Last Sync: 2m ago</span>
            </div>
          </div>
        </div>

        {/* Diagnostic Accuracy (1/3) */}
        <div className="bg-[#141b2b] p-8 rounded-3xl flex flex-col justify-center items-center text-center">
          <span className="text-5xl font-black text-[#6bfb9a] mb-2 font-mono">98.2%</span>
          <span className="text-xs uppercase tracking-[0.2em] text-[#dce2f7]/40">
            Diagnostic Accuracy
          </span>
          <div className="w-full bg-[#070e1d] h-1.5 mt-6 rounded-full overflow-hidden">
            <div className="bg-[#6bfb9a] h-full rounded-full" style={{ width: "98.2%" }} />
          </div>
        </div>
      </section>

      {/* ── Critical Monitoring ──────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg uppercase tracking-widest text-[#dce2f7]/70">
            Critical Monitoring
          </h3>
          <Link
            href="/patients"
            className="text-[#6bfb9a] text-xs font-bold hover:underline transition-all"
          >
            VIEW ALL PATIENTS
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {MONITORED_PATIENTS.map((patient) => {
            const isCritical = patient.status === "Critical"
            return (
              <div
                key={patient.id}
                className={`p-6 rounded-3xl transition-all group ${
                  isCritical
                    ? "bg-[#232a3a]/40 backdrop-blur-[20px] border-t border-white/5 hover:border-[#6bfb9a]/30"
                    : "bg-[#070e1d] border border-transparent hover:border-[#3d4a3e]/30"
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-[#2e3545] flex items-center justify-center">
                    <User className={`h-5 w-5 ${isCritical ? "text-[#6bfb9a]" : "text-[#dce2f7]/40"}`} />
                  </div>
                  <span
                    className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${statusBadge(patient.status)}`}
                  >
                    {patient.status}
                  </span>
                </div>
                <h4 className="font-bold text-lg mb-1">{patient.name}</h4>
                <p className="font-mono text-[10px] text-[#dce2f7]/40 mb-4 uppercase tracking-tighter">
                  REF: {patient.ref}
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#dce2f7]/40">HR</span>
                    <span className={isCritical ? "text-[#6bfb9a]" : "text-[#dce2f7]"}>
                      {patient.hr}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#dce2f7]/40">SPO2</span>
                    <span className="text-[#dce2f7]">{patient.spo2}</span>
                  </div>
                </div>
              </div>
            )
          })}

          {/* New Registry Card */}
          <Link
            href="/patients/new"
            className="bg-[#141b2b] p-6 rounded-3xl border border-[#6bfb9a]/10 border-dashed flex flex-col justify-center items-center gap-2 hover:border-[#6bfb9a]/30 transition-all"
          >
            <Plus className="h-8 w-8 text-[#6bfb9a]/40" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6bfb9a]/60">
              New Registry
            </p>
          </Link>
        </div>
      </section>

      {/* ── Protocol Queue ───────────────────────────────────── */}
      <section className="bg-[#141b2b] rounded-[2rem] overflow-hidden">
        <div className="p-8 pb-4">
          <h3 className="text-lg uppercase tracking-widest text-[#dce2f7]/70">
            Protocol Queue
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#323949]/30">
              <tr>
                {["ID", "Protocol Type", "Priority", "Clinician", "Status"].map((h) => (
                  <th
                    key={h}
                    className="px-8 py-4 font-mono text-[10px] uppercase tracking-wider text-[#dce2f7]/40 font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3d4a3e]/10">
              {PROTOCOLS.map((proto, i) => {
                const si = protocolStatusIndicator(proto.status)
                return (
                  <tr
                    key={proto.id}
                    className={`${
                      i % 2 === 0 ? "bg-[#070e1d]" : "bg-[#141b2b]"
                    } hover:bg-[#232a3a] transition-colors cursor-pointer`}
                  >
                    <td className="px-8 py-4 font-mono text-xs">{proto.id}</td>
                    <td className="px-8 py-4 text-sm font-bold">{proto.type}</td>
                    <td className="px-8 py-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${priorityBadge(proto.priority)}`}
                      >
                        {proto.priority}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-sm text-[#dce2f7]/60 italic">{proto.clinician}</td>
                    <td className="px-8 py-4">
                      <span className={`flex items-center gap-2 text-xs font-mono ${si.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${si.dot}`} />
                        {proto.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
