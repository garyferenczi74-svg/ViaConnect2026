"use client";

import { useState } from "react";
import {
  RefreshCw,
  ArrowRightLeft,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Check,
  X,
  Loader2,
  Activity,
  FileText,
} from "lucide-react";

/* ───────── Data ───────── */

interface System {
  id: string;
  name: string;
  type: string;
  connected: boolean;
  lastSync: string;
  direction: "rw" | "ro" | "wo";
  enabled: boolean;
}

const systems: System[] = [
  { id: "epic", name: "Epic", type: "EHR", connected: true, lastSync: "2 min ago", direction: "rw", enabled: true },
  { id: "cerner", name: "Cerner", type: "EHR", connected: true, lastSync: "15 min ago", direction: "ro", enabled: true },
  { id: "labcorp", name: "LabCorp", type: "Lab", connected: true, lastSync: "1 hr ago", direction: "ro", enabled: true },
  { id: "quest", name: "Quest Diagnostics", type: "Lab", connected: false, lastSync: "Never", direction: "ro", enabled: false },
  { id: "apple", name: "Apple Health", type: "Wearable", connected: true, lastSync: "5 min ago", direction: "ro", enabled: true },
  { id: "viaconnect", name: "ViaConnect App", type: "Patient Portal", connected: true, lastSync: "Just now", direction: "rw", enabled: true },
];

const directionLabel: Record<string, { label: string; icon: typeof ArrowRightLeft }> = {
  rw: { label: "Read/Write", icon: ArrowRightLeft },
  ro: { label: "Read Only", icon: ArrowLeft },
  wo: { label: "Write Only", icon: ArrowRight },
};

interface SyncItem {
  system: string;
  status: "syncing" | "complete" | "error";
  progress: number;
  detail: string;
}

const syncItems: SyncItem[] = [
  { system: "Epic", status: "syncing", progress: 68, detail: "Syncing patient demographics..." },
  { system: "LabCorp", status: "complete", progress: 100, detail: "14 results imported" },
  { system: "Apple Health", status: "syncing", progress: 42, detail: "Importing HRV data..." },
  { system: "Cerner", status: "error", progress: 35, detail: "Auth token expired — re-authenticate" },
];

interface LabResult {
  id: string;
  patient: string;
  labType: string;
  date: string;
  abnormal: number;
  status: "New" | "Reviewed" | "Pending Review";
}

const labResults: LabResult[] = [
  { id: "l1", patient: "Jane Smith", labType: "Comprehensive Metabolic", date: "Mar 18, 2026", abnormal: 3, status: "New" },
  { id: "l2", patient: "Kevin Brown", labType: "Thyroid Panel", date: "Mar 17, 2026", abnormal: 1, status: "Pending Review" },
  { id: "l3", patient: "Maria Chen", labType: "Homocysteine + B12", date: "Mar 17, 2026", abnormal: 2, status: "New" },
  { id: "l4", patient: "Raj Patel", labType: "GI-MAP Stool Analysis", date: "Mar 16, 2026", abnormal: 4, status: "Pending Review" },
  { id: "l5", patient: "Sarah Wilson", labType: "CBC with Differential", date: "Mar 16, 2026", abnormal: 0, status: "Reviewed" },
  { id: "l6", patient: "Tom Rivera", labType: "Lipid Panel + hsCRP", date: "Mar 15, 2026", abnormal: 1, status: "Reviewed" },
  { id: "l7", patient: "Emily Chang", labType: "Iron Studies", date: "Mar 15, 2026", abnormal: 2, status: "New" },
  { id: "l8", patient: "Ben Taylor", labType: "Cortisol (4-point)", date: "Mar 14, 2026", abnormal: 3, status: "Pending Review" },
];

const statusStyle: Record<string, string> = {
  New: "bg-green-400/20 text-green-400",
  "Pending Review": "bg-yellow-400/20 text-yellow-400",
  Reviewed: "bg-white/10 text-white/40",
};

/* ───────── Page ───────── */

export default function IntegrationsPage() {
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(systems.map((s) => [s.id, s.enabled]))
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-green-400" /> EHR & Lab Integration Hub
        </h1>
        <p className="text-sm text-white/60">Manage connected systems, sync status, and lab results</p>
      </div>

      {/* ── Connected Systems ── */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Connected Systems</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {systems.map((s) => {
            const dir = directionLabel[s.direction];
            const DirIcon = dir.icon;
            return (
              <div key={s.id} className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center text-white/40 text-xs font-bold uppercase">
                      {s.name.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{s.name}</h3>
                      <p className="text-[10px] text-white/40">{s.type}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    s.connected ? "bg-green-400/20 text-green-400" : "bg-red-400/20 text-red-400"
                  }`}>
                    {s.connected ? "Connected" : "Disconnected"}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-white/40">
                    <span>Last sync</span>
                    <span className="text-white/60">{s.lastSync}</span>
                  </div>
                  <div className="flex justify-between text-white/40">
                    <span>Data flow</span>
                    <span className="text-white/60 flex items-center gap-1">
                      <DirIcon className="w-3 h-3" /> {dir.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700/50">
                  <span className="text-[10px] text-white/30">
                    {toggles[s.id] ? "Enabled" : "Disabled"}
                  </span>
                  <button
                    onClick={() => setToggles((p) => ({ ...p, [s.id]: !p[s.id] }))}
                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                      toggles[s.id] ? "bg-green-400" : "bg-gray-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                        toggles[s.id] ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Sync Status ── */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Sync Status</h2>
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl divide-y divide-gray-700/30">
          {syncItems.map((s) => (
            <div key={s.system} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="sm:w-32 shrink-0 flex items-center gap-2">
                {s.status === "syncing" && <Loader2 className="w-4 h-4 text-green-400 animate-spin" />}
                {s.status === "complete" && <Check className="w-4 h-4 text-green-400" />}
                {s.status === "error" && <X className="w-4 h-4 text-red-400" />}
                <span className="text-sm font-medium text-white">{s.system}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-white/50">{s.detail}</span>
                  <span className="text-xs text-white/40">{s.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-900/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      s.status === "error" ? "bg-red-400" : s.status === "complete" ? "bg-green-400" : "bg-green-400"
                    }`}
                    style={{ width: `${s.progress}%` }}
                  />
                </div>
              </div>
              {s.status === "error" && (
                <button className="flex items-center gap-1 text-xs text-red-400 hover:underline shrink-0">
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Lab Results Queue ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-400" /> Lab Results Queue
          </h2>
          <span className="text-xs text-white/40">
            {labResults.filter((l) => l.status === "New").length} new results
          </span>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-gray-800 text-xs font-medium text-white/40 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Patient</th>
                  <th className="px-5 py-3 text-left">Lab Type</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Abnormal</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {labResults.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-700/20 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-white">{l.patient}</td>
                    <td className="px-5 py-3 text-sm text-white/60">{l.labType}</td>
                    <td className="px-5 py-3 text-sm text-white/60">{l.date}</td>
                    <td className="px-5 py-3">
                      {l.abnormal > 0 ? (
                        <span className="bg-red-400/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                          <AlertCircle className="w-3 h-3" /> {l.abnormal}
                        </span>
                      ) : (
                        <span className="text-xs text-white/30">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusStyle[l.status]}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button className="text-green-400 text-xs font-medium hover:underline">
                        {l.status === "Reviewed" ? "View" : "Review"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
