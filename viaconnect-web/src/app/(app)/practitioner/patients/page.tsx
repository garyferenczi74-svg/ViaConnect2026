"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, UserPlus, ChevronLeft, ChevronRight } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type PatientStatus = "alert" | "warning" | "good";

type Patient = {
  id: string;
  name: string;
  age: number;
  variants: string[];
  compliance: number;
  panels: string;
  lastVisit: string;
  status: PatientStatus;
};

// ─── Mock Data ───────────────────────────────────────────────────────────────

const PATIENTS: Patient[] = [
  { id: "1", name: "John Davis", age: 45, variants: ["MTHFR CT", "COMT AG"], compliance: 78, panels: "3/6", lastVisit: "Mar 24", status: "alert" },
  { id: "2", name: "Sarah Kim", age: 32, variants: ["VDR TT", "CYP1A2 AA"], compliance: 94, panels: "4/6", lastVisit: "Mar 22", status: "good" },
  { id: "3", name: "Maria Santos", age: 58, variants: ["MTHFR TT", "APOE E4"], compliance: 45, panels: "2/6", lastVisit: "Mar 20", status: "warning" },
  { id: "4", name: "Alex Thompson", age: 29, variants: ["COMT GG", "MAOA TT"], compliance: 88, panels: "6/6", lastVisit: "Mar 18", status: "good" },
  { id: "5", name: "Lisa Chen", age: 41, variants: ["FTO AA", "BDNF Val66Met"], compliance: 91, panels: "5/6", lastVisit: "Mar 15", status: "good" },
  { id: "6", name: "Mike Rodriguez", age: 53, variants: ["CYP2D6 PM", "MTHFR CT"], compliance: 62, panels: "1/6", lastVisit: "Mar 10", status: "warning" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusConfig: Record<PatientStatus, { dot: string; label: string }> = {
  alert: { dot: "bg-red-400", label: "Alert" },
  warning: { dot: "bg-amber-400", label: "Warning" },
  good: { dot: "bg-emerald-400", label: "Good" },
};

function complianceColor(pct: number): string {
  if (pct >= 80) return "text-emerald-400";
  if (pct >= 60) return "text-amber-400";
  return "text-red-400";
}

type FilterKey = "all" | "high-alert" | "low-compliance" | "pending-results" | "GENEX-M" | "GeneX360" | "PeptideIQ";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "high-alert", label: "High Alert" },
  { key: "low-compliance", label: "Low Compliance" },
  { key: "pending-results", label: "Pending Results" },
  { key: "GENEX-M", label: "GENEX-M" },
  { key: "GeneX360", label: "GeneX360" },
  { key: "PeptideIQ", label: "PeptideIQ" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const filtered = useMemo(() => {
    let list = PATIENTS;

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }

    // Filter pills
    switch (activeFilter) {
      case "high-alert":
        list = list.filter((p) => p.status === "alert");
        break;
      case "low-compliance":
        list = list.filter((p) => p.compliance < 70);
        break;
      case "pending-results":
        // Mock: show patients with fewer completed panels
        list = list.filter((p) => parseInt(p.panels) < 3);
        break;
      case "GENEX-M":
      case "GeneX360":
      case "PeptideIQ":
        // Mock: show all for panel filters
        break;
      default:
        break;
    }

    return list;
  }, [search, activeFilter]);

  return (
    <div className="min-h-screen bg-dark-bg p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h1 className="text-heading-2 text-[#B75E18]">Patients</h1>
          <Link href="#">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-[#4A90D9] to-[#3A7BC8] hover:opacity-90 transition-opacity">
              <UserPlus className="w-4 h-4" />
              + Add Patient
            </button>
          </Link>
        </div>

        {/* ── Search Bar ───────────────────────────────────────────── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients..."
            className="w-full h-10 pl-9 pr-3 rounded-lg text-sm text-white placeholder:text-gray-600 outline-none transition-colors
              bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm focus:border-[#4A90D9]/50 focus:ring-1 focus:ring-[#4A90D9]/20"
          />
        </div>

        {/* ── Filter Pills ─────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeFilter === filter.key
                  ? "bg-[#4A90D9]/15 text-[#4A90D9]"
                  : "bg-white/[0.04] text-gray-400 hover:bg-white/[0.06] hover:text-gray-300"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* ── Patient Table ────────────────────────────────────────── */}
        <div className="glass-v2 p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-xs text-secondary uppercase font-medium py-2 px-3">Name</th>
                <th className="text-xs text-secondary uppercase font-medium py-2 px-3">Age</th>
                <th className="text-xs text-secondary uppercase font-medium py-2 px-3">Key Variants</th>
                <th className="text-xs text-secondary uppercase font-medium py-2 px-3">Compliance</th>
                <th className="text-xs text-secondary uppercase font-medium py-2 px-3">Panels</th>
                <th className="text-xs text-secondary uppercase font-medium py-2 px-3">Last Visit</th>
                <th className="text-xs text-secondary uppercase font-medium py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((patient, i) => {
                const status = statusConfig[patient.status];
                return (
                  <Link
                    key={patient.id}
                    href="#"
                    className="contents"
                  >
                    <tr
                      className={`hover:bg-white/[0.03] cursor-pointer transition-colors ${
                        i % 2 === 1 ? "bg-white/[0.02]" : ""
                      }`}
                    >
                      <td className="text-xs font-medium text-white py-2 px-3">{patient.name}</td>
                      <td className="text-xs text-gray-300 py-2 px-3">{patient.age}</td>
                      <td className="text-xs py-2 px-3">
                        <div className="flex flex-wrap gap-1">
                          {patient.variants.map((v) => (
                            <span
                              key={v}
                              className="inline-block rounded-full bg-blue-500/10 text-[#4A90D9] text-[10px] font-mono px-2 py-0.5"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="text-xs py-2 px-3">
                        <span className={`font-medium ${complianceColor(patient.compliance)}`}>
                          {patient.compliance}%
                        </span>
                      </td>
                      <td className="text-xs text-gray-300 py-2 px-3">{patient.panels}</td>
                      <td className="text-xs text-gray-400 py-2 px-3">{patient.lastVisit}</td>
                      <td className="text-xs py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                          <span className="text-gray-300">{status.label}</span>
                        </div>
                      </td>
                    </tr>
                  </Link>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-secondary">
            Showing 1-{filtered.length} of 42 patients
          </p>
          <div className="flex gap-2">
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-gray-400 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
              <ChevronLeft className="w-3 h-3" />
              Previous
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-gray-400 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
              Next
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
