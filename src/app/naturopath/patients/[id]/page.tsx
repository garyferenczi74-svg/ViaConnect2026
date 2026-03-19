"use client";

import { useState } from "react";
import {
  AlertTriangle,
  X,
  Pencil,
  StickyNote,
  CalendarPlus,
  Share2,
  FileDown,
  ClipboardList,
  Activity,
} from "lucide-react";
import VitalityGauge from "@/components/patient/VitalityGauge";
import GenomicSummary from "@/components/patient/GenomicSummary";
import HealthTimeline from "@/components/patient/HealthTimeline";
import PatientSidebar from "@/components/patient/PatientSidebar";

/* ───────── Data ───────── */

const tabs = [
  "Overview",
  "Protocols",
  "Genomics",
  "Outcomes",
  "Labs",
  "Notes",
  "Botanical Hx",
] as const;

const actionButtons = [
  { label: "Edit", icon: Pencil },
  { label: "Add Note", icon: StickyNote },
  { label: "Schedule", icon: CalendarPlus },
  { label: "Share with EHR", icon: Share2 },
  { label: "Export PDF", icon: FileDown },
];

/* ───────── Page ───────── */

export default function PatientDetailPage() {
  const [activeTab, setActiveTab] = useState<string>("Overview");
  const [alertVisible, setAlertVisible] = useState(true);

  return (
    <div className="space-y-6">
      {/* ── Alert Banner ── */}
      {alertVisible && (
        <div className="bg-red-400/10 border border-red-400/30 rounded-xl px-5 py-3 flex items-center gap-4">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-white/80 flex-1">
            <span className="font-semibold text-red-400">Interaction Alert:</span>{" "}
            CYP2D6 poor metabolizer status — review current Metformin dosing
          </p>
          <button className="text-red-400 text-xs font-semibold hover:underline shrink-0">
            Review
          </button>
          <button
            onClick={() => setAlertVisible(false)}
            className="text-white/40 hover:text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Patient Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">Jane Smith</h1>
            <span className="bg-green-400/20 text-green-400 text-xs font-semibold px-3 py-0.5 rounded-full">
              Active
            </span>
          </div>
          <p className="text-sm text-white/60">
            Female &bull; 45 years &bull; MRN: 1042
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actionButtons.map((btn) => (
            <button
              key={btn.label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-green-400 border border-green-400/20 hover:bg-green-400/10 transition-colors duration-200"
            >
              <btn.icon className="w-4 h-4" />
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex gap-6">
        {/* Left Sidebar */}
        <div className="hidden lg:block">
          <PatientSidebar />
        </div>

        {/* Main Panel */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Tab Nav */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab
                    ? "bg-green-400 text-gray-900"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Overview Tab Content */}
          {activeTab === "Overview" && (
            <div className="space-y-6">
              {/* Top Row — 3 summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Vitality Score */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5">
                  <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4 text-center">
                    Vitality Score
                  </h4>
                  <VitalityGauge score={72} />
                </div>

                {/* Active Protocols */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5 flex flex-col items-center justify-center">
                  <div className="bg-green-400/20 text-green-400 w-12 h-12 rounded-lg flex items-center justify-center mb-3">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <p className="text-4xl font-bold text-green-400 tabular-nums">
                    3
                  </p>
                  <p className="text-xs font-medium text-white/40 uppercase tracking-wider mt-1">
                    Active Protocols
                  </p>
                  <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                    {["Methylation Support", "Adrenal Recovery", "GI Restore"].map(
                      (p) => (
                        <span
                          key={p}
                          className="bg-green-400/10 text-green-400 text-[10px] font-medium px-2 py-0.5 rounded-full"
                        >
                          {p}
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Constitutional Type */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5 flex flex-col items-center justify-center">
                  <div className="bg-purple-400/20 text-purple-400 w-12 h-12 rounded-lg flex items-center justify-center mb-3">
                    <Activity className="w-6 h-6" />
                  </div>
                  <p className="text-2xl font-bold text-purple-400">
                    Vata-Pitta
                  </p>
                  <p className="text-xs font-medium text-white/40 uppercase tracking-wider mt-1">
                    Constitutional Type
                  </p>
                  <p className="text-xs text-white/50 mt-2 text-center">
                    Tendency toward anxiety, inflammation, and irregular digestion
                  </p>
                </div>
              </div>

              {/* Genomic Summary */}
              <GenomicSummary />

              {/* Health Timeline */}
              <HealthTimeline />
            </div>
          )}

          {/* Placeholder for other tabs */}
          {activeTab !== "Overview" && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-12 text-center">
              <p className="text-white/40 text-sm">
                {activeTab} content coming soon
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
