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

const SIDEBAR_NAV = [
  { label: "Health Assessment", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z", active: true },
  { label: "Body Map", icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z", active: false },
  { label: "Vitality Metrics", icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z", active: false },
  { label: "History", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z", active: false },
  { label: "Integrative Insights", icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z", active: false },
];

export default function AssessmentPage() {
  return (
    <div className="min-h-screen bg-[#0c1322] text-[#dce2f7]">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col h-screen w-72 fixed left-0 top-0 bg-[#141b2b] shadow-2xl z-50 py-8">
        <div className="px-6 mb-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#4ade80]/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#6bfb9a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
          </div>
          <span className="font-black text-[#6bfb9a] text-xl tracking-tighter">Clinical Nexus</span>
        </div>

        {/* Patient Card */}
        <div className="px-6 mb-8">
          <div className="flex items-center gap-4 p-3 bg-[#191f2f] rounded-xl">
            <div className="w-12 h-12 rounded-lg bg-[#323949] flex items-center justify-center">
              <svg className="w-6 h-6 text-[#6bfb9a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div>
              <div className="text-[#dce2f7] font-bold text-sm">Dr. Nexus</div>
              <div className="text-[#6bfb9a] text-[10px] font-mono uppercase tracking-widest">Nexus-01</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {SIDEBAR_NAV.map((item) => (
            <a
              key={item.label}
              href="#"
              className={`flex items-center gap-4 px-6 py-4 font-mono text-sm uppercase tracking-widest transition-all duration-300 ${
                item.active
                  ? "bg-[#232a3a] text-[#6bfb9a] border-l-4 border-[#6bfb9a]"
                  : "text-[#dce2f7]/50 hover:text-[#dce2f7] hover:bg-[#232a3a]/50"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className="text-xs">{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="px-6 pt-6 mt-auto border-t border-[#3d4a3e]/10">
          <div className="flex items-center justify-between text-[#dce2f7]/40 text-[10px] font-mono uppercase">
            <span>System Active</span>
            <span className="w-2 h-2 rounded-full bg-[#6bfb9a] animate-pulse" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-72 min-h-screen pb-24 md:pb-12">
        {/* Top App Bar */}
        <header className="sticky top-0 z-40 bg-[#0c1322] flex items-center justify-between px-6 py-4 w-full shadow-[0px_20px_40px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-4">
            <div className="md:hidden w-8 h-8 rounded-full bg-[#4ade80]/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#6bfb9a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </div>
            <h1 className="tracking-tight font-bold text-[#dce2f7] text-xl">Integrative Health Assessment</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end mr-4">
              <span className="text-[10px] font-mono text-[#6bfb9a] uppercase">Precision Medicine</span>
              <span className="text-xs text-[#dce2f7]/60">Patient: Nexus-Alpha-09</span>
            </div>
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#232a3a] transition-colors active:scale-95">
              <svg className="w-5 h-5 text-[#dce2f7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </header>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
          {/* Row 1: Overall Vitality + Constitutional Profile */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Overall Vitality Score Card */}
            <div className="lg:col-span-4 glass-card p-8 flex flex-col items-center justify-center text-center">
              <h3 className="text-[#dce2f7]/60 text-xs uppercase tracking-widest mb-6 font-medium">
                Overall Vitality Score
              </h3>
              <VitalityScoreGrid
                dimensions={vitalityDimensions}
                overallScore={overallVitality}
                mode="overall-only"
              />
              <div className="mt-6 flex items-center gap-2 px-4 py-2 rounded-full bg-[#ffb657]/10 border border-[#ffb657]/20">
                <svg className="w-4 h-4 text-[#ffb657]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
                <span className="text-[#ffb657] text-xs font-bold uppercase tracking-tighter">+4.2% from last cycle</span>
              </div>
            </div>

            {/* Constitutional Profile */}
            <div className="lg:col-span-8">
              <ConstitutionalTyping
                data={constitutionalData}
                constitutionalType={constitutionalType}
              />
            </div>
          </div>

          {/* Row 2: Vitality Matrix + Body Map */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-7">
              <VitalityScoreGrid
                dimensions={vitalityDimensions}
                overallScore={overallVitality}
                mode="grid-only"
              />
            </div>
            <div className="xl:col-span-5">
              <InteractiveBodyMap zones={bodyZones} />
            </div>
          </div>

          {/* Row 3: Assessment History */}
          <AssessmentTimeline history={assessmentHistory} />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 z-50 rounded-t-3xl border-t border-[#3d4a3e]/15" style={{ background: "rgba(12, 19, 34, 0.8)", backdropFilter: "blur(20px)" }}>
        {[
          { label: "Assess", icon: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z", active: true },
          { label: "Vitals", icon: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z", active: false },
          { label: "Body", icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z", active: false },
          { label: "Log", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z", active: false },
        ].map((item) => (
          <a
            key={item.label}
            href="#"
            className={`flex flex-col items-center justify-center px-3 py-1 transition-transform active:scale-90 ${
              item.active ? "bg-[#6bfb9a]/10 text-[#6bfb9a] rounded-xl" : "text-[#dce2f7]/40 hover:text-[#6bfb9a]"
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
            <span className="text-[10px] font-medium">{item.label}</span>
          </a>
        ))}
      </nav>

      <style jsx>{`
        .glass-card {
          background: rgba(46, 53, 69, 0.4);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(107, 251, 154, 0.15);
          border-radius: 1.5rem;
        }
      `}</style>
    </div>
  );
}
