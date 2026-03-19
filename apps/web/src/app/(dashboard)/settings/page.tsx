"use client"

import { useState } from "react"
import {
  User,
  Bell,
  ShieldCheck,
  Upload,
  Check,
  Monitor,
  Smartphone,
  Clock,
  Eye,
  EyeOff,
  LogOut,
  Network,
  Activity,
  History,
  AlertTriangle,
  Lock,
  ChevronRight,
  Settings2,
  CheckCircle2,
  Circle,
  MapPin,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

interface NotificationChannel {
  event: string
  inApp: boolean
  email: boolean
  sms: boolean
  securePush: boolean
}

interface ActiveSession {
  id: string
  device: string
  location: string
  lastActive: string
  current: boolean
  icon: "desktop" | "mobile"
}

interface LoginRecord {
  id: string
  date: string
  ip: string
  location: string
  device: string
  status: "Success" | "Failed"
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const NOTIFICATION_MATRIX: NotificationChannel[] = [
  { event: "Critical Patient Vitals", inApp: true, email: true, sms: true, securePush: true },
  { event: "Lab Result Ready", inApp: true, email: true, sms: false, securePush: true },
  { event: "Drug Interaction Alert", inApp: true, email: true, sms: true, securePush: true },
  { event: "Protocol Milestone", inApp: true, email: false, sms: false, securePush: false },
  { event: "System Maintenance", inApp: true, email: true, sms: false, securePush: false },
  { event: "CME Deadline", inApp: true, email: true, sms: false, securePush: false },
]

const ACTIVE_SESSIONS: ActiveSession[] = [
  { id: "s1", device: "Chrome on macOS", location: "San Francisco, CA", lastActive: "Current session", current: true, icon: "desktop" },
  { id: "s2", device: "Safari on iPhone", location: "San Francisco, CA", lastActive: "2 hours ago", current: false, icon: "mobile" },
  { id: "s3", device: "Firefox on Windows", location: "New York, NY", lastActive: "1 day ago", current: false, icon: "desktop" },
]

const LOGIN_HISTORY: LoginRecord[] = [
  { id: "l1", date: "2026-03-18 09:12", ip: "192.168.1.45", location: "San Francisco, CA", device: "Chrome / macOS", status: "Success" },
  { id: "l2", date: "2026-03-17 20:30", ip: "10.0.0.12", location: "San Francisco, CA", device: "Safari / iOS", status: "Success" },
  { id: "l3", date: "2026-03-17 15:15", ip: "192.168.1.45", location: "San Francisco, CA", device: "Chrome / macOS", status: "Success" },
  { id: "l4", date: "2026-03-16 11:42", ip: "203.45.67.89", location: "Unknown", device: "Firefox / Windows", status: "Failed" },
  { id: "l5", date: "2026-03-16 09:00", ip: "192.168.1.45", location: "San Francisco, CA", device: "Chrome / macOS", status: "Success" },
]

const SPECIALTY_TAGS = ["Integrative Medicine", "Longevity Science", "Genomic-Guided Therapy", "Methylation Disorders"]

const NAV_ITEMS = [
  { icon: User, label: "Profile", id: "profile" },
  { icon: Bell, label: "Alerts", id: "alerts" },
  { icon: ShieldCheck, label: "Security", id: "security" },
  { icon: Settings2, label: "Config", id: "config" },
] as const

// ─── Helpers ────────────────────────────────────────────────────────────────

const glass = "bg-[#232a3a]/40 backdrop-blur-[20px] border border-[#3d4a3e]/15 rounded-xl"

// ─── Component ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeNav, setActiveNav] = useState<string>("config")
  const [fullName, setFullName] = useState("Dr. Julian Vane")
  const [credentials, setCredentials] = useState("MD, ND, FAAIM")
  const [tags, setTags] = useState(SPECIALTY_TAGS)
  const [maxQuota, setMaxQuota] = useState(8)
  const [redOverride, setRedOverride] = useState(true)
  const [sessionTimeout, setSessionTimeout] = useState(15)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [matrix, setMatrix] = useState(NOTIFICATION_MATRIX)

  function toggleMatrix(index: number, channel: keyof Omit<NotificationChannel, "event">) {
    setMatrix((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [channel]: !row[channel] } : row))
    )
  }

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 min-h-screen bg-[#0c1322] text-[#dce2f7]">
      {/* ── TOP HEADER ──────────────────────────────────────── */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-[#0c1322] shadow-xl border-b border-[#3d4a3e]/10">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-[#6bfb9a]" />
          <h1 className="text-xl font-black text-[#6bfb9a] tracking-tighter">Clinical Nexus</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] text-[#6bfb9a] bg-[#6bfb9a]/10 px-2.5 py-1 rounded border border-[#6bfb9a]/20">SYSTEM LIVE</span>
          <div className="w-10 h-10 rounded-full bg-[#6bfb9a]/20 border border-[#6bfb9a]/40 flex items-center justify-center text-[10px] font-bold">JV</div>
        </div>
      </header>

      <div className="flex pt-16">
        {/* ── SIDEBAR NAV ─────────────────────────────────────── */}
        <nav className="fixed left-0 w-64 h-full bg-[#141b2b] py-8 hidden md:block z-40">
          <div className="px-6 mb-8 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#2e3545] flex items-center justify-center text-[#6bfb9a]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Dr. Julian Vane</p>
              <p className="font-mono text-[10px] opacity-40">ID: 992-XPR</p>
            </div>
          </div>
          <div className="flex flex-col text-xs font-mono uppercase tracking-[0.15em] text-[#dce2f7]/50">
            {NAV_ITEMS.map((item) => {
              const active = activeNav === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`px-6 py-3.5 flex items-center gap-3 text-left transition-colors ${
                    active
                      ? "bg-[#0c1322] border-r-4 border-[#6bfb9a] text-[#6bfb9a] font-bold"
                      : "hover:bg-[#232a3a]"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* ── MAIN CONTENT ────────────────────────────────────── */}
        <main className="flex-1 md:ml-64 p-6 lg:p-8 pb-24 md:pb-8">
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Page Header */}
            <header>
              <h2 className="text-3xl font-bold tracking-tight">Configuration Terminal</h2>
              <p className="text-[#dce2f7]/40 font-mono text-sm mt-1">Environment: Production v2.4.0-nexus</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* ── PROFESSIONAL IDENTITY (2-col) ─────────────── */}
              <section className={`lg:col-span-2 ${glass} p-8 space-y-6`}>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <User className="h-5 w-5 text-[#6bfb9a]" /> Professional Identity
                </h3>
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  {/* Avatar */}
                  <div className="relative w-32 h-32 rounded-2xl border-2 border-dashed border-[#6bfb9a]/30 bg-[#070e1d] overflow-hidden group shrink-0">
                    <div className="w-full h-full flex items-center justify-center text-4xl font-black text-[#6bfb9a]/40">JV</div>
                    <div className="absolute inset-0 bg-[#6bfb9a]/20 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                      <Upload className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  {/* Fields */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-[#6bfb9a]">Full Name</label>
                      <input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-[#070e1d] border-none rounded-lg text-sm text-white p-3 focus:ring-1 focus:ring-[#6bfb9a]/40 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-[#6bfb9a]">Credentials</label>
                      <input
                        value={credentials}
                        onChange={(e) => setCredentials(e.target.value)}
                        className="w-full bg-[#070e1d] border-none rounded-lg text-sm text-white p-3 focus:ring-1 focus:ring-[#6bfb9a]/40 focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-[#6bfb9a]">Specialty Focus</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tags.map((tag) => (
                          <span key={tag} className="bg-[#2e3545] px-3 py-1.5 rounded text-xs text-[#dce2f7] border border-[#3d4a3e]/30">
                            {tag}
                          </span>
                        ))}
                        <button
                          onClick={() => {/* placeholder */}}
                          className="bg-[#6bfb9a]/10 px-3 py-1.5 rounded text-xs font-bold text-[#6bfb9a] border border-[#6bfb9a]/20 hover:bg-[#6bfb9a]/20 transition-colors"
                        >
                          + Add Tag
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── CRITICAL ALERTING (1-col) ─────────────────── */}
              <section className={`${glass} p-6 flex flex-col justify-between`}>
                <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                  <AlertTriangle className="h-5 w-5 text-red-400" /> Critical Alerting
                </h3>
                <div className="space-y-6 flex-1">
                  {/* Daily Max Quota */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-mono">
                      <span className="text-[#dce2f7]/60">Daily Max Quota</span>
                      <span className="text-[#6bfb9a] font-bold">{String(maxQuota).padStart(2, "0")}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={maxQuota}
                      onChange={(e) => setMaxQuota(Number(e.target.value))}
                      className="w-full h-1 bg-[#2e3545] rounded-lg appearance-none cursor-pointer"
                      style={{ accentColor: "#6bfb9a" }}
                    />
                  </div>
                  {/* RED Priority Overrides */}
                  <div className="p-4 bg-[#a40217]/10 border border-[#a40217]/20 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-red-200">RED Priority Overrides</span>
                      <p className="text-[10px] opacity-40 mt-0.5">Bypass silent mode</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={redOverride}
                      onClick={() => setRedOverride(!redOverride)}
                      className={`relative w-10 h-6 rounded-full transition-colors ${
                        redOverride ? "bg-[#6bfb9a]" : "bg-[#4ade80]/40"
                      }`}
                    >
                      <span className={`absolute top-[2px] w-5 h-5 rounded-full bg-[#070e1d] transition-all ${
                        redOverride ? "right-[2px]" : "left-[2px]"
                      }`} />
                    </button>
                  </div>
                </div>
              </section>

              {/* ── COMMUNICATION MATRIX (full-width) ─────────── */}
              <section className={`lg:col-span-3 ${glass} rounded-xl overflow-hidden`}>
                <div className="px-8 py-5 border-b border-[#3d4a3e]/10 flex justify-between items-center bg-[#141b2b]/50">
                  <h3 className="text-lg font-bold">System Communication Matrix</h3>
                  <span className="font-mono text-[10px] opacity-30 uppercase">Routing Protocols</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#070e1d] font-mono text-[10px] uppercase opacity-50 tracking-wider">
                      <tr>
                        <th className="px-8 py-4">Event Type</th>
                        <th className="px-8 py-4 text-center">In-App</th>
                        <th className="px-8 py-4 text-center">Email</th>
                        <th className="px-8 py-4 text-center">SMS</th>
                        <th className="px-8 py-4 text-center">Secure Push</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#3d4a3e]/5">
                      {matrix.map((row, i) => (
                        <tr key={row.event} className={`${i % 2 === 1 ? "bg-[#070e1d]/30" : ""} hover:bg-[#232a3a]/30 transition-colors`}>
                          <td className="px-8 py-5 font-medium">{row.event}</td>
                          {(["inApp", "email", "sms", "securePush"] as const).map((ch) => (
                            <td key={ch} className="px-8 py-5 text-center">
                              <button onClick={() => toggleMatrix(i, ch)} className="inline-flex">
                                {row[ch] ? (
                                  <CheckCircle2 className="h-5 w-5 text-[#6bfb9a]" />
                                ) : (
                                  <Circle className="h-5 w-5 text-[#dce2f7]/15" />
                                )}
                              </button>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ── ACCESS CONTROL (1-col) ────────────────────── */}
              <section className={`${glass} p-6 space-y-6`}>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Lock className="h-5 w-5 text-[#6bfb9a]" /> Access Control
                </h3>

                {/* MFA Status */}
                <div className="p-4 bg-[#070e1d] rounded-lg border-l-4 border-[#6bfb9a]">
                  <p className="text-xs font-bold">MFA Status: {twoFactorEnabled ? "SECURE" : "DISABLED"}</p>
                  <p className="text-[10px] opacity-50 font-mono mt-0.5">Linked: iPhone 15 Pro</p>
                </div>

                {/* 2FA Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-xs">Two-Factor Auth</span>
                  <button
                    role="switch"
                    aria-checked={twoFactorEnabled}
                    onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                    className={`relative w-10 h-6 rounded-full transition-colors ${
                      twoFactorEnabled ? "bg-[#6bfb9a]" : "bg-[#4ade80]/40"
                    }`}
                  >
                    <span className={`absolute top-[2px] w-5 h-5 rounded-full bg-[#070e1d] transition-all ${
                      twoFactorEnabled ? "right-[2px]" : "left-[2px]"
                    }`} />
                  </button>
                </div>

                {/* Session Timeout */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono uppercase opacity-50">
                    <span>Session Timeout</span>
                    <span>{sessionTimeout} Min</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(Number(e.target.value))}
                    className="w-full h-1 bg-[#2e3545] rounded-lg appearance-none cursor-pointer"
                    style={{ accentColor: "#6bfb9a" }}
                  />
                </div>

                {/* Change Password */}
                <div className="space-y-3 pt-2">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#6bfb9a]">Change Password</p>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Current password"
                      className="w-full bg-[#070e1d] border-none rounded-lg text-xs text-white p-2.5 pr-9 focus:ring-1 focus:ring-[#6bfb9a]/40 focus:outline-none placeholder:text-slate-600"
                    />
                    <button onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300">
                      {showCurrentPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                      className="w-full bg-[#070e1d] border-none rounded-lg text-xs text-white p-2.5 pr-9 focus:ring-1 focus:ring-[#6bfb9a]/40 focus:outline-none placeholder:text-slate-600"
                    />
                    <button onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300">
                      {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-[#070e1d] border-none rounded-lg text-xs text-white p-2.5 focus:ring-1 focus:ring-[#6bfb9a]/40 focus:outline-none placeholder:text-slate-600"
                  />
                </div>

                <button className="w-full py-3 bg-[#232a3a] hover:bg-[#2e3545] text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                  <History className="h-3.5 w-3.5" /> View Audit Logs
                </button>
              </section>

              {/* ── NODE CONNECTIVITY + SESSIONS (2-col) ──────── */}
              <section className={`lg:col-span-2 ${glass} p-6 flex flex-col justify-between`}>
                <div className="space-y-6">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Network className="h-5 w-5 text-[#6bfb9a]" /> Node Connectivity
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 bg-[#070e1d] rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Network className="h-4 w-4 text-[#6bfb9a]" />
                        <div>
                          <p className="font-bold">HL7 Gateway</p>
                          <p className="font-mono text-[#6bfb9a]/70 text-[10px]">ACTIVE &bull; 12ms</p>
                        </div>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-[#6bfb9a] shadow-[0_0_8px_#6bfb9a]" />
                    </div>
                    <div className="p-4 bg-[#070e1d] rounded-xl flex items-center justify-between opacity-50">
                      <div className="flex items-center gap-3">
                        <Monitor className="h-4 w-4" />
                        <div>
                          <p className="font-bold">Legacy EHR Bridge</p>
                          <p className="font-mono text-[10px]">STANDBY</p>
                        </div>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-[#dce2f7]/20" />
                    </div>
                  </div>

                  {/* Active Sessions */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-[#dce2f7]/40">Active Sessions</h4>
                    {ACTIVE_SESSIONS.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-3 bg-[#070e1d] rounded-lg">
                        <div className="flex items-center gap-3">
                          {session.icon === "desktop" ? (
                            <Monitor className="h-4 w-4 text-slate-500" />
                          ) : (
                            <Smartphone className="h-4 w-4 text-slate-500" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold">{session.device}</p>
                              {session.current && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#6bfb9a]/10 text-[#6bfb9a] rounded">CURRENT</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-2.5 w-2.5" />{session.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />{session.lastActive}
                              </span>
                            </div>
                          </div>
                        </div>
                        {!session.current && (
                          <button className="text-[10px] font-mono text-red-400/60 hover:text-red-400 transition-colors flex items-center gap-1">
                            <LogOut className="h-3 w-3" /> Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex justify-end gap-4">
                  <button className="px-6 py-3 font-bold text-xs opacity-40 hover:opacity-80 transition-opacity">
                    Discard
                  </button>
                  <button className="px-8 py-3 bg-[#6bfb9a] text-[#0c1322] font-black text-xs rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all">
                    Deploy Configuration
                  </button>
                </div>
              </section>

              {/* ── LOGIN HISTORY (full-width) ────────────────── */}
              <section className="lg:col-span-3 bg-[#191f2f] rounded-2xl overflow-hidden">
                <div className="px-8 py-5 border-b border-[#3d4a3e]/10 flex justify-between items-center">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <History className="h-4 w-4 text-[#6bfb9a]/60" /> Login History
                  </h3>
                  <button className="text-[10px] text-[#6bfb9a] font-semibold flex items-center gap-1 hover:underline">
                    View All <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#070e1d] font-mono text-[10px] uppercase opacity-40 tracking-wider">
                      <tr>
                        <th className="px-8 py-3">Date</th>
                        <th className="px-8 py-3">IP Address</th>
                        <th className="px-8 py-3">Location</th>
                        <th className="px-8 py-3">Device</th>
                        <th className="px-8 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#3d4a3e]/5">
                      {LOGIN_HISTORY.map((rec) => (
                        <tr key={rec.id} className="hover:bg-[#232a3a]/30 transition-colors">
                          <td className="px-8 py-3.5 font-mono text-slate-400">{rec.date}</td>
                          <td className="px-8 py-3.5">
                            <code className="bg-[#070e1d] border border-[#3d4a3e]/20 px-2 py-0.5 rounded text-[10px] font-mono text-slate-400">
                              {rec.ip}
                            </code>
                          </td>
                          <td className="px-8 py-3.5 text-slate-400">{rec.location}</td>
                          <td className="px-8 py-3.5 text-slate-400">{rec.device}</td>
                          <td className="px-8 py-3.5">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              rec.status === "Success"
                                ? "bg-[#4ade80]/10 text-[#4ade80]"
                                : "bg-[#f87171]/10 text-[#f87171]"
                            }`}>
                              {rec.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      {/* ── MOBILE NAV ──────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 bg-[#0c1322]/80 backdrop-blur-xl border-t border-[#3d4a3e]/15 flex justify-around items-center px-4 pb-4 pt-2 md:hidden z-50">
        {NAV_ITEMS.map((item) => {
          const active = activeNav === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`flex flex-col items-center justify-center ${
                active ? "bg-[#6bfb9a]/10 text-[#6bfb9a] rounded-xl px-3 py-1" : "text-[#dce2f7]/30"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
