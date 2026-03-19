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
  { label: "Dashboard", icon: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25", active: false },
  { label: "Compliance", icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z", active: true },
  { label: "Audit Log", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z", active: false },
  { label: "Security", icon: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z", active: false },
  { label: "Settings", icon: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z", active: false },
];

export default function CompliancePage() {
  return (
    <div className="min-h-screen bg-[#0c1322] text-[#dce2f7]">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-[#141b2b] shadow-2xl z-50 py-8 px-4">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 rounded-full bg-[#4ade80]/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#6bfb9a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <span className="font-black text-[#6bfb9a] text-xl tracking-tighter">Clinical Nexus</span>
        </div>

        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 rounded-full bg-[#2e3545] flex items-center justify-center">
            <svg className="w-5 h-5 text-[#6bfb9a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div>
            <p className="font-mono text-sm tracking-widest text-[#6bfb9a] font-bold">Dr. Sterling</p>
            <p className="text-[10px] text-[#dce2f7]/50 uppercase tracking-tighter">Clinical Lead</p>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          {SIDEBAR_NAV.map((item) => (
            <a
              key={item.label}
              href={item.label === "Dashboard" ? "/practitioner/assessment" : "#"}
              className={`flex items-center gap-4 px-4 py-3 transition-all duration-300 cursor-pointer ${
                item.active
                  ? "bg-[#232a3a] text-[#6bfb9a] border-r-4 border-[#6bfb9a]"
                  : "text-[#dce2f7]/50 hover:bg-[#232a3a]/80"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className="font-mono text-sm tracking-widest uppercase">{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="px-2 pt-6 border-t border-[#3d4a3e]/10">
          <div className="flex items-center justify-between text-[#dce2f7]/40 text-[10px] font-mono uppercase">
            <span>System Active</span>
            <span className="w-2 h-2 rounded-full bg-[#6bfb9a] animate-pulse" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 min-h-screen pb-24 md:pb-12">
        {/* Top App Bar */}
        <header className="bg-[#0c1322] fixed top-0 right-0 left-0 md:left-64 z-40 flex justify-between items-center px-6 py-4 shadow-none">
          <div className="flex items-center gap-4">
            <div className="md:hidden w-8 h-8 rounded-full bg-[#4ade80]/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#6bfb9a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </div>
            <h1 className="tracking-tight font-bold text-[#dce2f7] text-xl">Compliance Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-[10px] font-mono text-[#4ade80] uppercase">Security Posture</span>
              <span className="text-xs text-[#dce2f7]/60">Last audit: 2h ago</span>
            </div>
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#232a3a] transition-colors">
              <svg className="w-5 h-5 text-[#dce2f7]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </button>
          </div>
        </header>

        <div className="pt-20 p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {/* Row 1: Compliance Score + Quick Stats */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8">
              <ComplianceScoreGauge score={overallScore} categories={categories} />
            </div>
            <div className="xl:col-span-4 grid grid-cols-2 gap-4">
              {[
                { label: "Uptime", value: "99.97%", sub: "Last 30 days", color: "text-[#4ade80]", accent: "border-[#4ade80]/15" },
                { label: "Incidents", value: "3", sub: "This month", color: "text-[#f87171]", accent: "border-[#f87171]/15" },
                { label: "Scans Passed", value: "14/14", sub: "All endpoints", color: "text-[#4ade80]", accent: "border-[#4ade80]/15" },
                { label: "MFA Coverage", value: "100%", sub: "24 accounts", color: "text-[#4ade80]", accent: "border-[#4ade80]/15" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`p-5 rounded-2xl border ${stat.accent}`}
                  style={{ background: "rgba(46, 53, 69, 0.4)", backdropFilter: "blur(20px)" }}
                >
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#dce2f7]/40 mb-2">{stat.label}</div>
                  <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                  <div className="text-[10px] text-[#dce2f7]/30 mt-1">{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 2: Export Actions */}
          <div className="flex flex-wrap gap-3">
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

          {/* Row 3: Audit Log + Security Events */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8">
              <AuditLogTable entries={auditLog} />
            </div>
            <div className="xl:col-span-4">
              <SecurityEventsTimeline events={securityEvents} />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 z-50 rounded-t-3xl border-t border-[#3d4a3e]/15" style={{ background: "rgba(12, 19, 34, 0.8)", backdropFilter: "blur(20px)" }}>
        {[
          { label: "Dashboard", icon: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25", active: false },
          { label: "Comply", icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z", active: true },
          { label: "Audit", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z", active: false },
          { label: "Alerts", icon: "M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0", active: false },
        ].map((item) => (
          <a
            key={item.label}
            href="#"
            className={`flex flex-col items-center justify-center px-3 py-1 transition-transform active:scale-90 ${
              item.active ? "bg-[#6bfb9a]/10 text-[#6bfb9a] rounded-xl" : "text-[#dce2f7]/40"
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
            <span className="text-[10px] font-medium">{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
