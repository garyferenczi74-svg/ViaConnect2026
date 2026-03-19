"use client";

import ComplianceScoreGauge from "@/components/ComplianceScoreGauge";
import AuditLogTable from "@/components/AuditLogTable";
import SecurityEventsTimeline from "@/components/SecurityEventsTimeline";
import {
  overallScore,
  categories,
  auditLog,
  securityEvents,
} from "@/data/compliance";

const SIDEBAR_NAV = [
  { label: "Compliance Overview", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z", active: true },
  { label: "Audit Logs", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z", active: false },
  { label: "Encryption", icon: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z", active: false },
  { label: "Access Control", icon: "M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z", active: false },
  { label: "System Settings", icon: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z", active: false },
];

const MOBILE_NAV = [
  { label: "Pulse", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z", active: true },
  { label: "Logs", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z", active: false },
  { label: "Shield", icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z", active: false },
  { label: "Profile", icon: "M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z", active: false },
];

export default function CompliancePage() {
  return (
    <div className="min-h-screen bg-[#0c1322] text-[#dce2f7]">
      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 bg-[#141b2b] shadow-[0px_20px_40px_rgba(0,0,0,0.4)] flex justify-between items-center px-6 h-16">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-[#6bfb9a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <h1 className="text-xl font-bold tracking-tighter text-[#6bfb9a]">The Clinical Nexus</h1>
        </div>
        <div className="hidden md:flex gap-8">
          <a href="#" className="tracking-tight font-bold text-[#6bfb9a] border-b-2 border-[#6bfb9a]">Compliance Overview</a>
          <a href="#" className="tracking-tight font-bold text-[#dce2f7]/60 hover:bg-[#232a3a] transition-colors duration-200 p-1 px-2 rounded">Audit Logs</a>
          <a href="#" className="tracking-tight font-bold text-[#dce2f7]/60 hover:bg-[#232a3a] transition-colors duration-200 p-1 px-2 rounded">Encryption</a>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-[#6bfb9a] bg-[#6bfb9a]/10 px-2 py-1 rounded-full border border-[#6bfb9a]/20">SYSTEM: ONLINE</span>
          <div className="w-8 h-8 rounded-full bg-[#2e3545] border border-[#3d4a3e] flex items-center justify-center text-[10px] font-bold">AU</div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-[#141b2b] flex-col py-4 pt-20 border-r border-[#3d4a3e]/10 z-40">
        <div className="px-6 mb-8">
          <h2 className="text-[#6bfb9a] font-black text-xs uppercase tracking-[0.2em]">Mission Control</h2>
        </div>
        <nav className="flex-1 space-y-1 px-2">
          {SIDEBAR_NAV.map((item) => (
            <a
              key={item.label}
              href="#"
              className={`flex items-center gap-3 mx-2 my-1 px-4 py-3 font-semibold text-sm transition-all ${
                item.active
                  ? "bg-[#232a3a] text-[#6bfb9a] rounded-lg"
                  : "text-[#dce2f7]/70 hover:text-[#dce2f7] hover:bg-[#232a3a]/50"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="pt-24 pb-24 lg:pb-12 lg:pl-72 px-6 max-w-7xl mx-auto">
        {/* Bento Grid Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Large Compliance Gauge */}
          <div className="md:col-span-2 glass-card p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#6bfb9a]/5 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="relative z-10 text-center md:text-left">
              <h3 className="text-[#bccabb] text-sm uppercase tracking-widest mb-2">Security Posture</h3>
              <h2 className="text-4xl font-extrabold tracking-tight mb-4">Overall Compliance Score</h2>
              <p className="text-[#bccabb] text-sm max-w-md">Your HIPAA alignment is currently within the high-performance threshold. Continue regular security training to maintain certification.</p>
            </div>
            <ComplianceScoreGauge score={overallScore} />
          </div>

          {/* Risk Assessment Card */}
          <div className="glass-card p-6 rounded-3xl flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <h3 className="font-bold text-lg">Risk Assessment</h3>
              <svg className="w-6 h-6 text-[#6bfb9a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#bccabb]">Active Threats</span>
                <span className="text-[#6bfb9a]">00</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#bccabb]">System Latency</span>
                <span className="text-[#6bfb9a]">12ms</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#bccabb]">Last Audit</span>
                <span className="text-[#6bfb9a]">2h ago</span>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-[#3d4a3e]/20">
              <button className="w-full py-2 bg-[#6bfb9a] text-[#003919] font-bold rounded-xl text-sm transition-transform active:scale-95 shadow-lg shadow-[#6bfb9a]/20">
                Run Full Security Scan
              </button>
            </div>
          </div>
        </div>

        {/* Compliance Breakdown & Security Events */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10">
          {/* Category Metrics */}
          <div className="lg:col-span-3 glass-card p-8 rounded-3xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold">Category Metrics</h3>
              <span className="text-xs text-[#bccabb] font-mono">UPDATED: 08:42:15 UTC</span>
            </div>
            <div className="space-y-6">
              {categories.map((cat) => {
                const isWarning = cat.score < 90;
                return (
                  <div key={cat.label}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className={`font-semibold ${isWarning ? "text-[#bccabb]" : ""}`}>{cat.label}</span>
                      <span className={`font-mono ${isWarning ? "text-[#ffb657]" : "text-[#6bfb9a]"}`}>{cat.score}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#2e3545] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${isWarning ? "bg-[#ffb657]" : "bg-[#6bfb9a]"} ${cat.score === 100 ? "shadow-[0_0_8px_#6bfb9a]" : ""}`}
                        style={{ width: `${cat.score}%`, transition: "width 0.8s ease-out" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Security Events Timeline */}
          <div className="lg:col-span-2">
            <SecurityEventsTimeline events={securityEvents.slice(0, 3)} />
          </div>
        </div>

        {/* Export & Reporting Buttons */}
        <div className="flex flex-wrap gap-3 mb-10">
          <button className="bg-[#4ade80] text-[#003919] font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-[#6bfb9a] transition-colors shadow-lg shadow-[#4ade80]/20 active:scale-95">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Generate Report (PDF)
          </button>
          <button className="bg-[#232a3a] text-[#dce2f7] font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 border border-[#3d4a3e]/15 hover:border-[#4ade80]/40 transition-all active:scale-95">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download Logs (CSV)
          </button>
          <button className="bg-[#232a3a] text-[#dce2f7] font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 border border-[#3d4a3e]/15 hover:border-[#4ade80]/40 transition-all active:scale-95">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Schedule Reports
          </button>
        </div>

        {/* Audit Log Table */}
        <AuditLogTable entries={auditLog} />
      </main>

      {/* Mobile Bottom Nav */}
      <nav
        className="fixed bottom-0 left-0 w-full flex justify-around items-center h-16 px-4 md:hidden rounded-t-2xl z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
        style={{ background: "rgba(12, 19, 34, 0.8)", backdropFilter: "blur(20px)" }}
      >
        {MOBILE_NAV.map((item) => (
          <a
            key={item.label}
            href="#"
            className={`flex flex-col items-center transition-all ${
              item.active
                ? "bg-[#6bfb9a]/10 text-[#6bfb9a] rounded-xl px-4 py-1"
                : "text-[#dce2f7]/40 hover:text-[#6bfb9a]"
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
            <span className="text-[10px] uppercase tracking-widest">{item.label}</span>
          </a>
        ))}
      </nav>

      {/* Floating Action Button */}
      <button className="fixed right-6 bottom-20 md:bottom-10 w-14 h-14 bg-[#6bfb9a] text-[#003919] rounded-full shadow-[0_10px_30px_rgba(107,251,154,0.3)] flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-40">
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      <style jsx>{`
        .glass-card {
          background: rgba(46, 53, 69, 0.4);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(134, 148, 134, 0.15);
        }
      `}</style>
    </div>
  );
}
