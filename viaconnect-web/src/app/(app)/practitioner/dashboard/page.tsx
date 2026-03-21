"use client";

import Link from "next/link";
import {
  Users,
  ClipboardCheck,
  AlertTriangle,
  TrendingUp,
  Clock,
  FileText,
  UserPlus,
  ShieldAlert,
  Brain,
  Activity,
  CheckCircle,
  Pill,
  FlaskConical,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { Card, StatCard, Badge, Button } from "@/components/ui";
import { PageTransition, StaggerChild } from "@/lib/motion";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const appointments = [
  { id: 1, time: "9:00 AM", patient: "Sarah Mitchell", type: "Follow-up", status: "confirmed" as const },
  { id: 2, time: "10:30 AM", patient: "James Robertson", type: "Genetic Review", status: "confirmed" as const },
  { id: 3, time: "12:00 PM", patient: "Anika Patel", type: "Initial Consult", status: "pending" as const },
  { id: 4, time: "2:00 PM", patient: "Marcus Thompson", type: "Protocol Review", status: "confirmed" as const },
  { id: 5, time: "3:30 PM", patient: "Emily Zhao", type: "Follow-up", status: "cancelled" as const },
];

const statusBadge: Record<string, { variant: "active" | "pending" | "danger"; label: string }> = {
  confirmed: { variant: "active", label: "Confirmed" },
  pending: { variant: "pending", label: "Pending" },
  cancelled: { variant: "danger", label: "Cancelled" },
};

const recentActivity = [
  { id: 1, icon: FileText, description: "Protocol approved for Sarah Mitchell — MTHFR+ stack", time: "12 min ago" },
  { id: 2, icon: Pill, description: "New interaction flag: James Robertson — CoQ10 + Warfarin", time: "34 min ago" },
  { id: 3, icon: CheckCircle, description: "Anika Patel completed adherence check-in (92%)", time: "1 hr ago" },
  { id: 4, icon: FlaskConical, description: "Genetic panel results received for Marcus Thompson", time: "2 hr ago" },
  { id: 5, icon: MessageSquare, description: "Emily Zhao sent a message regarding supplement timing", time: "3 hr ago" },
  { id: 6, icon: UserPlus, description: "New patient registration: David Nguyen", time: "5 hr ago" },
];

const alerts = [
  {
    id: 1,
    type: "danger" as const,
    icon: ShieldAlert,
    title: "Drug-Supplement Interaction",
    description: "James Robertson: CoQ10 may reduce Warfarin efficacy",
    action: "/practitioner/interactions",
  },
  {
    id: 2,
    type: "warning" as const,
    icon: Activity,
    title: "Low Adherence Alert",
    description: "Emily Zhao adherence dropped to 34% this week",
    action: "/practitioner/patients/5",
  },
  {
    id: 3,
    type: "pending" as const,
    icon: ClipboardCheck,
    title: "Pending Consent",
    description: "David Nguyen has not signed genetic testing consent",
    action: "/practitioner/patients/12",
  },
];

const protocolQueue = [
  { id: 1, patient: "Anika Patel", supplements: 4, created: "Today" },
  { id: 2, patient: "Marcus Thompson", supplements: 6, created: "Yesterday" },
  { id: 3, patient: "David Nguyen", supplements: 3, created: "2 days ago" },
];

const quickActions = [
  { label: "New Protocol", icon: FileText, href: "/practitioner/protocols/builder", color: "text-portal-green" },
  { label: "Add Patient", icon: UserPlus, href: "/practitioner/patients?action=add", color: "text-portal-purple" },
  { label: "Check Interactions", icon: AlertTriangle, href: "/practitioner/interactions", color: "text-portal-yellow" },
  { label: "AI Advisor", icon: Brain, href: "/practitioner/ai", color: "text-portal-pink" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function PractitionerDashboardPage() {
  return (
    <PageTransition className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <StaggerChild>
          <div>
            <h1 className="text-3xl font-bold text-white">
              Dashboard
            </h1>
            <p className="text-gray-400 mt-1">Practitioner Portal &mdash; Overview</p>
          </div>
        </StaggerChild>

        {/* ── Stat Cards ──────────────────────────────────────────────── */}
        <StaggerChild className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Active Patients" value="47" trend="up" trendLabel="+3 this week" />
          <StatCard icon={ClipboardCheck} label="Pending Reviews" value="12" trend="down" trendLabel={"\u22122 from yesterday"} />
          <StatCard
            icon={AlertTriangle}
            label="Interaction Flags"
            value="5"
            className="ring-1 ring-portal-yellow/20"
          />
          <StatCard icon={TrendingUp} label="Avg Adherence" value="78%" trend="up" trendLabel="+4% this month" />
        </StaggerChild>

        {/* ── Two-Column Layout ───────────────────────────────────────── */}
        <StaggerChild className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column (3/5) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Today's Schedule */}
            <Card hover={false} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-portal-green" />
                  Today&apos;s Schedule
                </h2>
                <Link href="/practitioner/patients" className="text-xs text-portal-green hover:underline">
                  View all
                </Link>
              </div>

              <div className="space-y-1">
                {appointments.map((appt) => {
                  const badge = statusBadge[appt.status];
                  return (
                    <div
                      key={appt.id}
                      className="flex items-center gap-4 rounded-lg px-3 py-3 hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-sm font-mono text-gray-500 w-20 shrink-0">{appt.time}</span>
                      <span className="text-sm font-medium text-white flex-1 truncate">{appt.patient}</span>
                      <span className="text-xs text-gray-400 hidden sm:block w-28 truncate">{appt.type}</span>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Recent Activity */}
            <Card hover={false} className="p-5">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-portal-purple" />
                Recent Activity
              </h2>

              <div className="space-y-1">
                {recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg px-3 py-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="w-7 h-7 rounded-md bg-white/[0.04] flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 leading-snug">{item.description}</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column (2/5) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <Card hover={false} className="p-5">
              <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => (
                  <Link key={action.label} href={action.href}>
                    <div className="flex flex-col items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.06] p-4 hover:bg-white/[0.06] transition-colors cursor-pointer">
                      <action.icon className={`w-5 h-5 ${action.color}`} />
                      <span className="text-xs font-medium text-gray-300">{action.label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>

            {/* Alerts */}
            <Card hover={false} className="p-5">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-portal-yellow" />
                Alerts Requiring Attention
              </h2>

              <div className="space-y-3">
                {alerts.map((alert) => (
                  <Link key={alert.id} href={alert.action}>
                    <div className="flex items-start gap-3 rounded-lg bg-white/[0.02] border border-white/[0.06] p-3 hover:bg-white/[0.04] transition-colors cursor-pointer">
                      <div className="shrink-0 mt-0.5">
                        <alert.icon className={`w-4 h-4 ${
                          alert.type === "danger" ? "text-rose" : alert.type === "warning" ? "text-portal-yellow" : "text-portal-purple"
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{alert.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5 leading-snug">{alert.description}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-600 shrink-0 mt-1" />
                    </div>
                  </Link>
                ))}
              </div>
            </Card>

            {/* Protocol Approval Queue */}
            <Card hover={false} className="p-5">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-portal-green" />
                Protocol Approval Queue
              </h2>

              <div className="space-y-3">
                {protocolQueue.map((proto) => (
                  <div
                    key={proto.id}
                    className="flex items-center justify-between rounded-lg bg-white/[0.02] border border-white/[0.06] p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{proto.patient}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {proto.supplements} supplements &middot; {proto.created}
                      </p>
                    </div>
                    <Link href={`/practitioner/protocols/builder?patient=${proto.id}`}>
                      <Button variant="secondary" size="sm">
                        Review
                      </Button>
                    </Link>
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
