"use client";

import { useState } from "react";
import { Search, Shield, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

/* ───────── Data ───────── */

const overallScore = 94;

const breakdowns = [
  { label: "Encryption", score: 100, color: "bg-green-400" },
  { label: "Access Control", score: 96, color: "bg-green-400" },
  { label: "Audit Logging", score: 92, color: "bg-green-400" },
  { label: "Breach Detection", score: 88, color: "bg-yellow-400" },
  { label: "Training", score: 94, color: "bg-green-400" },
];

interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  ip: string;
  status: "Success" | "Warning" | "Failed";
}

const auditLog: AuditEntry[] = [
  { id: "a1", timestamp: "2026-03-19 10:42:18", user: "Dr. Chen", action: "View Patient", resource: "Patient #VM-1042", ip: "192.168.1.45", status: "Success" },
  { id: "a2", timestamp: "2026-03-19 10:38:05", user: "Dr. Chen", action: "Export PDF", resource: "Protocol #P-287", ip: "192.168.1.45", status: "Success" },
  { id: "a3", timestamp: "2026-03-19 10:22:11", user: "System", action: "Auto-sync", resource: "Epic FHIR", ip: "10.0.0.1", status: "Success" },
  { id: "a4", timestamp: "2026-03-19 09:58:44", user: "Nurse Adams", action: "Update Vitals", resource: "Patient #VM-1006", ip: "192.168.1.52", status: "Success" },
  { id: "a5", timestamp: "2026-03-19 09:41:22", user: "Dr. Chen", action: "Modify Protocol", resource: "Protocol #P-291", ip: "192.168.1.45", status: "Warning" },
  { id: "a6", timestamp: "2026-03-19 09:15:07", user: "Unknown", action: "Login Attempt", resource: "Auth Gateway", ip: "203.45.67.89", status: "Failed" },
  { id: "a7", timestamp: "2026-03-19 08:55:33", user: "Dr. Patel", action: "View Genomics", resource: "Patient #VM-1003", ip: "192.168.1.60", status: "Success" },
  { id: "a8", timestamp: "2026-03-19 08:30:19", user: "System", action: "Backup Complete", resource: "Database", ip: "10.0.0.1", status: "Success" },
  { id: "a9", timestamp: "2026-03-18 17:42:55", user: "Dr. Chen", action: "Prescribe", resource: "Protocol #P-288", ip: "192.168.1.45", status: "Success" },
  { id: "a10", timestamp: "2026-03-18 16:20:08", user: "Unknown", action: "Login Attempt", resource: "Auth Gateway", ip: "185.22.33.44", status: "Failed" },
];

const statusStyle: Record<string, string> = {
  Success: "bg-green-400/20 text-green-400",
  Warning: "bg-yellow-400/20 text-yellow-400",
  Failed: "bg-red-400/20 text-red-400",
};

interface SecurityEvent {
  time: string;
  title: string;
  detail: string;
  severity: "critical" | "warning" | "info";
}

const securityEvents: SecurityEvent[] = [
  { time: "10:15 AM", title: "Failed login from unknown IP", detail: "IP 203.45.67.89 — 3 failed attempts in 5 minutes. IP auto-blocked for 30 min.", severity: "critical" },
  { time: "09:41 AM", title: "Protocol modified without co-sign", detail: "Dr. Chen modified Protocol #P-291. Co-signature required within 24 hours.", severity: "warning" },
  { time: "09:15 AM", title: "Suspicious login geography", detail: "Login attempt from unrecognized region (Eastern Europe). Account locked pending verification.", severity: "critical" },
  { time: "08:55 AM", title: "PHI access logged", detail: "Dr. Patel accessed genomic data for Patient #VM-1003. Access within authorized scope.", severity: "info" },
  { time: "08:30 AM", title: "Nightly backup completed", detail: "Full database backup encrypted (AES-256) and transferred to secure vault.", severity: "info" },
  { time: "Yesterday", title: "SSL certificate renewal", detail: "TLS 1.3 certificate auto-renewed. Expires 2027-03-18.", severity: "info" },
];

const severityStyles: Record<string, { border: string; dot: string; label: string; labelStyle: string }> = {
  critical: { border: "border-red-400", dot: "bg-red-400", label: "Critical", labelStyle: "bg-red-400/20 text-red-400" },
  warning: { border: "border-yellow-400", dot: "bg-yellow-400", label: "Warning", labelStyle: "bg-yellow-400/20 text-yellow-400" },
  info: { border: "border-green-400", dot: "bg-green-400", label: "Info", labelStyle: "bg-green-400/20 text-green-400" },
};

/* ───────── Page ───────── */

export default function CompliancePage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const r = 70;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - overallScore / 100);

  const filteredLog = auditLog.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return e.user.toLowerCase().includes(q) || e.action.toLowerCase().includes(q) || e.resource.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-green-400" /> Compliance & Audit
        </h1>
        <p className="text-sm text-white/60">HIPAA compliance monitoring and security audit trail</p>
      </div>

      {/* ── Compliance Score ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-6 flex items-center gap-8">
          <div className="relative w-44 h-44 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r={r} fill="transparent" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <circle cx="80" cy="80" r={r} fill="transparent" stroke="#4ade80" strokeWidth="10" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold text-green-400">{overallScore}</span>
              <span className="text-xs text-white/40">/100</span>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <h3 className="text-sm font-semibold text-white mb-3">Compliance Breakdown</h3>
            {breakdowns.map((b) => (
              <div key={b.label}>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-white/60">{b.label}</span>
                  <span className="text-white/40 font-bold">{b.score}%</span>
                </div>
                <div className="h-1.5 bg-gray-900/60 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${b.color}`} style={{ width: `${b.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Security Events ── */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5 max-h-[380px] overflow-y-auto">
          <h3 className="text-sm font-semibold text-white mb-4">Security Events</h3>
          <div className="space-y-3">
            {securityEvents.map((e, i) => {
              const s = severityStyles[e.severity];
              return (
                <div key={i} className={`border-l-4 ${s.border} bg-gray-900/30 rounded-r-lg p-3`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/40">{e.time}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${s.labelStyle}`}>
                      {s.label}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white">{e.title}</p>
                  <p className="text-[11px] text-white/50 mt-0.5">{e.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Audit Log ── */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Audit Log</h2>

        {/* Search + Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-[240px] bg-gray-800/50 border border-gray-600/50 focus-within:border-green-400/50 rounded-lg px-3 py-2 flex items-center gap-2">
            <Search className="w-4 h-4 text-white/30" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by user, action, or resource..." className="bg-transparent text-white placeholder:text-white/30 flex-1 text-sm outline-none" />
          </div>
          {["User", "Action", "Date Range"].map((f) => (
            <button key={f} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-700/50 text-xs text-white/60 hover:text-white transition-colors">
              {f} <ChevronDown className="w-3 h-3" />
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gray-800 text-xs font-medium text-white/40 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Timestamp</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Resource</th>
                  <th className="px-4 py-3 text-left">IP</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {filteredLog.slice((page - 1) * perPage, page * perPage).map((e) => (
                  <tr key={e.id} className="hover:bg-gray-700/20 transition-colors">
                    <td className="px-4 py-3 text-xs text-white/50 font-mono">{e.timestamp}</td>
                    <td className="px-4 py-3 text-sm text-white/80">{e.user}</td>
                    <td className="px-4 py-3 text-sm text-white/60">{e.action}</td>
                    <td className="px-4 py-3 text-xs text-white/50 font-mono">{e.resource}</td>
                    <td className="px-4 py-3 text-xs text-white/40 font-mono">{e.ip}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusStyle[e.status]}`}>
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-white/40">
            Showing {Math.min((page - 1) * perPage + 1, filteredLog.length)}–{Math.min(page * perPage, filteredLog.length)} of {filteredLog.length}
          </span>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded-lg text-white/40 hover:text-white disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 rounded-lg text-sm font-medium bg-green-400 text-gray-900">1</button>
            <button disabled className="p-1.5 rounded-lg text-white/40 disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
