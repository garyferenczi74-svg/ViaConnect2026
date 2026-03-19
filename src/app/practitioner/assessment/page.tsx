"use client";

import ConstitutionalTyping from "@/components/ConstitutionalTyping";
import VitalityScoreGrid from "@/components/VitalityScoreGrid";
import InteractiveBodyMap from "@/components/InteractiveBodyMap";
import AssessmentTimeline from "@/components/AssessmentTimeline";
import {
  constitutionalData,
  constitutionalType,
  vitalityDimensions,
  overallVitality,
  bodyZones,
  assessmentHistory,
} from "@/data/assessment";

export default function AssessmentPage() {
  return (
    <div className="min-h-screen bg-[#0c1322] text-[#dce2f7]">
      {/* Top Navigation */}
      <header className="bg-[#0c1322] flex justify-between items-center px-6 py-4 w-full sticky top-0 z-40 border-b border-[#3d4a3e]/15">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-[#6bfb9a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          <h1 className="text-xl font-bold tracking-tighter text-[#6bfb9a]">The Clinical Nexus</h1>
        </div>
        <div className="hidden md:flex gap-8 items-center">
          <nav className="flex gap-6">
            <a className="font-bold text-[#dce2f7]/60 uppercase text-sm tracking-tight hover:text-[#6bfb9a] transition-colors" href="/practitioner/formulary">Database</a>
            <a className="font-bold text-[#dce2f7]/60 uppercase text-sm tracking-tight hover:text-[#6bfb9a] transition-colors" href="#">Formulary</a>
            <a className="font-bold text-[#6bfb9a] uppercase text-sm tracking-tight" href="#">Assessment</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 lg:p-10">
        {/* Page Header */}
        <section className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="text-4xl font-extrabold tracking-tight mb-2">
                Integrative Health Assessment
              </h2>
              <p className="text-[#bccabb] text-sm max-w-xl">
                Holistic patient evaluation combining constitutional typing, vitality scoring, and somatic mapping. Last updated March 15, 2026.
              </p>
            </div>
            <div className="flex gap-3">
              <button className="bg-[#232a3a] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border border-[#3d4a3e]/10 hover:border-[#4ade80]/40 transition-all flex items-center gap-2 text-[#dce2f7]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export PDF
              </button>
              <button className="bg-[#4ade80] text-[#003919] font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-[#6bfb9a] transition-colors shadow-lg shadow-[#4ade80]/20">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New Assessment
              </button>
            </div>
          </div>
        </section>

        {/* Row 1: Constitutional Typing + Vitality Scores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ConstitutionalTyping
            data={constitutionalData}
            constitutionalType={constitutionalType}
          />
          <VitalityScoreGrid
            dimensions={vitalityDimensions}
            overallScore={overallVitality}
          />
        </div>

        {/* Row 2: Interactive Body Map */}
        <div className="mb-6">
          <InteractiveBodyMap zones={bodyZones} />
        </div>

        {/* Row 3: Assessment History */}
        <div>
          <AssessmentTimeline history={assessmentHistory} />
        </div>
      </main>
    </div>
  );
}
