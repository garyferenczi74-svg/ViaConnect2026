"use client";

import Link from "next/link";
import {
  Users,
  Leaf,
  Calendar,
  Shield,
  ClipboardList,
  AlertTriangle,
  FileText,
  Activity,
  Beaker,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import { Card, StatCard, Badge } from "@/components/ui";
import { PageTransition, StaggerChild } from "@/lib/motion";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const todaySchedule = [
  { time: "9:00 AM", patient: "Elena Vasquez", type: "Initial Consult", status: "confirmed" as const },
  { time: "10:30 AM", patient: "Marcus Chen", type: "Follow-up", status: "confirmed" as const },
  { time: "11:30 AM", patient: "Priya Sharma", type: "Constitutional Assessment", status: "pending" as const },
  { time: "1:00 PM", patient: "James Whitfield", type: "Botanical Review", status: "confirmed" as const },
  { time: "2:30 PM", patient: "Sana Al-Rashid", type: "New Patient", status: "confirmed" as const },
  { time: "4:00 PM", patient: "Tomoko Hayashi", type: "Follow-up", status: "pending" as const },
];

const recentActivity = [
  { action: "Created formula", detail: "Nervine Calm Blend for Elena Vasquez", time: "35 min ago", icon: Beaker },
  { action: "Patient assessed", detail: "Constitutional typing completed for Marcus Chen", time: "1 hr ago", icon: ClipboardList },
  { action: "Protocol updated", detail: "Digestive Restore protocol adjusted for Priya Sharma", time: "2 hrs ago", icon: FileText },
  { action: "Lab results reviewed", detail: "Micronutrient panel for James Whitfield", time: "3 hrs ago", icon: Activity },
  { action: "New patient added", detail: "Sana Al-Rashid added to roster", time: "4 hrs ago", icon: UserPlus },
  { action: "Formula approved", detail: "Adrenal Support Tincture for Tomoko Hayashi", time: "5 hrs ago", icon: Leaf },
];

const actionItems = [
  { label: "Pending formula review — Adaptogen Blend", severity: "warning" as const },
  { label: "Consent expiring — Marcus Chen (3 days)", severity: "danger" as const },
  { label: "Lab results received — Priya Sharma", severity: "info" as const },
];

const statusBadge: Record<string, { variant: "active" | "pending"; text: string }> = {
  confirmed: { variant: "active", text: "Confirmed" },
  pending: { variant: "pending", text: "Pending" },
};

const severityVariant: Record<string, "warning" | "danger" | "info"> = {
  warning: "warning",
  danger: "danger",
  info: "info",
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NaturopathDashboardPage() {
  return (
    <PageTransition className="min-h-screen bg-dark-bg px-6 py-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <StaggerChild className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Welcome back, <span className="text-sage">Dr. Thompson</span>
          </h1>
          <p className="mt-1 text-gray-400">Naturopath Portal &mdash; {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
        </StaggerChild>

        {/* Stat Tiles */}
        <StaggerChild className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard icon={Users} label="Active Patients" value="38" trend="up" trendLabel="+2 this week" />
          <StatCard icon={Leaf} label="Pending Formulas" value="7" trend="down" trendLabel="-1 from yesterday" />
          <StatCard icon={Calendar} label="Appointments Today" value="6" />
          <StatCard icon={Shield} label="Avg Compliance" value="94%" trend="up" trendLabel="+2% this month" />
        </StaggerChild>

        {/* Two-column layout */}
        <StaggerChild className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column (3/5) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Today's Schedule */}
            <Card hover={false} className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-sage" />
                  Today&apos;s Schedule
                </h2>
                <Link href="/naturopath/scheduler" className="text-xs text-sage hover:text-sage-light transition-colors">
                  View full calendar
                </Link>
              </div>
              <div className="space-y-3">
                {todaySchedule.map((appt, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-white/[0.02] border border-white/[0.04] px-4 py-3 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono text-sage w-20">{appt.time}</span>
                      <div>
                        <p className="text-sm font-medium text-white">{appt.patient}</p>
                        <p className="text-xs text-gray-500">{appt.type}</p>
                      </div>
                    </div>
                    <Badge variant={statusBadge[appt.status].variant}>
                      {statusBadge[appt.status].text}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Activity */}
            <Card hover={false} className="p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-5">
                <Activity className="w-5 h-5 text-sage" />
                Recent Activity
              </h2>
              <div className="space-y-4">
                {recentActivity.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sage/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-sage" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white font-medium">{item.action}</p>
                        <p className="text-xs text-gray-500">{item.detail}</p>
                      </div>
                      <span className="text-[11px] text-gray-600 whitespace-nowrap">{item.time}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Right column (2/5) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <Card hover={false} className="p-6">
              <h2 className="text-lg font-semibold text-white mb-5">Quick Actions</h2>
              <div className="space-y-3">
                <Link href="/naturopath/botanical/formula-builder" className="flex items-center gap-3 rounded-lg bg-sage/10 border border-sage/20 px-4 py-3 hover:bg-sage/20 transition-colors group">
                  <Leaf className="w-5 h-5 text-sage" />
                  <span className="text-sm font-medium text-white flex-1">New Formula</span>
                  <ArrowRight className="w-4 h-4 text-sage opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <Link href="/naturopath/patients" className="flex items-center gap-3 rounded-lg bg-white/[0.03] border border-white/[0.06] px-4 py-3 hover:bg-white/[0.06] transition-colors group">
                  <UserPlus className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-300 flex-1">Add Patient</span>
                  <ArrowRight className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <Link href="/naturopath/constitutional" className="flex items-center gap-3 rounded-lg bg-white/[0.03] border border-white/[0.06] px-4 py-3 hover:bg-white/[0.06] transition-colors group">
                  <ClipboardList className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-300 flex-1">Constitutional Assessment</span>
                  <ArrowRight className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <Link href="/naturopath/scheduler" className="flex items-center gap-3 rounded-lg bg-white/[0.03] border border-white/[0.06] px-4 py-3 hover:bg-white/[0.06] transition-colors group">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-300 flex-1">View Calendar</span>
                  <ArrowRight className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </div>
            </Card>

            {/* Action Items */}
            <Card hover={false} className="p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-5">
                <AlertTriangle className="w-5 h-5 text-copper" />
                Action Items
              </h2>
              <div className="space-y-3">
                {actionItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg bg-white/[0.02] border border-white/[0.04] px-4 py-3"
                  >
                    <div className="mt-0.5">
                      <Badge variant={severityVariant[item.severity]}>&bull;</Badge>
                    </div>
                    <p className="text-sm text-gray-300">{item.label}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </StaggerChild>
      </div>
    </PageTransition>
  );
}
