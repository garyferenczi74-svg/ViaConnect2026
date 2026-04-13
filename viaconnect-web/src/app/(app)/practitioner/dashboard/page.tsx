"use client";

import Link from "next/link";
import {
  Users,
  FlaskConical,
  AlertTriangle,
  TrendingUp,
  Video,
} from "lucide-react";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const stats = [
  { value: "42", label: "Active Patients", icon: Users, color: "text-[#4A90D9]" },
  { value: "7", label: "Pending Results", icon: FlaskConical, color: "text-amber-400" },
  { value: "3", label: "Alerts Today", icon: AlertTriangle, color: "text-red-400" },
  { value: "89%", label: "Avg Compliance", icon: TrendingUp, color: "text-emerald-400" },
];

const alerts = [
  {
    id: 1,
    severity: "warning" as const,
    borderColor: "border-l-amber-400",
    patient: "John D.",
    message: "HRV dropped 28% in 24hrs. COMT fast metabolizer.",
    badges: ["COMT AG"],
    actions: [
      { label: "View Patient", href: "#" },
      { label: "Send Message", href: "#" },
    ],
  },
  {
    id: 2,
    severity: "critical" as const,
    borderColor: "border-l-red-400",
    patient: "Maria S.",
    message: "Missed 5 consecutive supplement doses. MTHFR CT.",
    badges: ["MTHFR CT"],
    actions: [
      { label: "View Patient", href: "#" },
      { label: "Call", href: "#" },
    ],
  },
  {
    id: 3,
    severity: "info" as const,
    borderColor: "border-l-[#4A90D9]",
    patient: "Alex T.",
    message: "New GeneX360 results ready for review.",
    badges: [],
    actions: [{ label: "Review Results", href: "#" }],
  },
];

const recentResults = [
  { patient: "John D.", panel: "GeneX-M", date: "3/24", status: "Ready", statusColor: "bg-emerald-500/15 text-emerald-400" },
  { patient: "Sarah K.", panel: "GeneX360", date: "3/22", status: "Ready", statusColor: "bg-emerald-500/15 text-emerald-400" },
  { patient: "Mike R.", panel: "PeptideIQ", date: "3/20", status: "Pending", statusColor: "bg-amber-500/15 text-amber-400" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function PractitionerDashboardPage() {
  return (
    <div className="min-h-screen bg-dark-bg p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-heading-2 text-[#B75E18]">Practitioner Dashboard</h1>
          <p className="text-sm text-secondary mt-1">Precision Wellness Medical Group</p>
        </div>

        {/* ── Top Stats Row ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-v2 p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white leading-tight">{stat.value}</p>
                <p className="text-xs text-secondary">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Patient Alerts ─────────────────────────────────────────── */}
        <section>
          <p className="text-overline mb-3">PATIENT ALERTS</p>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`glass-v2 p-3 border-l-[3px] ${alert.borderColor}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">
                      <span className="font-semibold">{alert.patient}</span>
                      {" — "}
                      {alert.message}
                    </p>
                    {alert.badges.length > 0 && (
                      <div className="flex gap-1.5 mt-1.5">
                        {alert.badges.map((badge) => (
                          <span
                            key={badge}
                            className="inline-block rounded-full bg-[#4A90D9]/10 text-[#4A90D9] text-[10px] font-mono px-2 py-0.5"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 shrink-0">
                    {alert.actions.map((action) => (
                      <Link
                        key={action.label}
                        href={action.href}
                        className="text-xs text-[#4A90D9] hover:underline"
                      >
                        {action.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Recent Results ─────────────────────────────────────────── */}
        <section>
          <p className="text-overline mb-3">RECENT RESULTS</p>
          <div className="glass-v2 p-0 overflow-hidden overflow-x-auto">
            <table className="w-full text-left min-w-[480px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-xs text-secondary uppercase font-medium py-2 px-3">Patient</th>
                  <th className="text-xs text-secondary uppercase font-medium py-2 px-3">Panel</th>
                  <th className="text-xs text-secondary uppercase font-medium py-2 px-3">Date</th>
                  <th className="text-xs text-secondary uppercase font-medium py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentResults.map((row, i) => (
                  <tr
                    key={row.patient}
                    className={i % 2 === 1 ? "bg-white/[0.02]" : ""}
                  >
                    <td className="text-xs text-white py-2 px-3">{row.patient}</td>
                    <td className="text-xs text-gray-300 py-2 px-3">{row.panel}</td>
                    <td className="text-xs text-gray-400 py-2 px-3">{row.date}</td>
                    <td className="text-xs py-2 px-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${row.statusColor}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Quick Actions ──────────────────────────────────────────── */}
        <section>
          <p className="text-overline mb-3">QUICK ACTIONS</p>
          <div className="flex flex-wrap gap-3">
            <Link href="#">
              <button className="px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium text-white bg-gradient-to-r from-[#4A90D9] to-[#3A7BC8] hover:opacity-90 transition-opacity">
                + New Patient
              </button>
            </Link>
            <Link href="#">
              <button className="px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium text-[#4A90D9] border border-[#4A90D9]/30 bg-transparent hover:bg-[#4A90D9]/10 transition-colors">
                Order Panel
              </button>
            </Link>
            <Link href="#">
              <button className="px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/[0.04] transition-colors flex items-center gap-2">
                <Video className="w-4 h-4" />
                Start Video Call
              </button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
