import type { Metadata } from "next"
import {
  Users,
  ClipboardList,
  FileCheck,
  GraduationCap,
  AlertTriangle,
  Clock,
  UserPlus,
  Search,
  BookOpen,
  Dna,
  ArrowRight,
  Activity,
  FlaskConical,
  RefreshCw,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { StatCard } from "@/components/ui/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export const metadata: Metadata = {
  title: "Dashboard | ViaConnect Practitioners Portal",
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const recentPatients = [
  {
    id: "1",
    name: "Marcus Johnson",
    initials: "MJ",
    condition: "MTHFR C677T Variant",
    lastVisit: "Mar 15, 2026",
    status: "active" as const,
  },
  {
    id: "2",
    name: "Elena Rodriguez",
    initials: "ER",
    condition: "CYP2D6 Poor Metabolizer",
    lastVisit: "Mar 14, 2026",
    status: "review" as const,
  },
  {
    id: "3",
    name: "David Chen",
    initials: "DC",
    condition: "COMT Val158Met",
    lastVisit: "Mar 13, 2026",
    status: "active" as const,
  },
  {
    id: "4",
    name: "Amara Osei",
    initials: "AO",
    condition: "APOE e4/e4 Carrier",
    lastVisit: "Mar 12, 2026",
    status: "pending" as const,
  },
  {
    id: "5",
    name: "Rebecca Lawson",
    initials: "RL",
    condition: "VDR Fok1 Polymorphism",
    lastVisit: "Mar 11, 2026",
    status: "completed" as const,
  },
]

const clinicalAlerts = [
  {
    id: "1",
    type: "interaction" as const,
    title: "Drug-Gene Interaction Detected",
    description:
      "Marcus Johnson: Clopidogrel + CYP2C19*2 variant. Consider alternative antiplatelet therapy.",
    time: "2 hours ago",
    severity: "high" as const,
  },
  {
    id: "2",
    type: "lab" as const,
    title: "New Lab Results Available",
    description:
      "Elena Rodriguez: Methylmalonic acid and homocysteine panel results ready for review.",
    time: "4 hours ago",
    severity: "medium" as const,
  },
  {
    id: "3",
    type: "protocol" as const,
    title: "Protocol Update Required",
    description:
      "David Chen: 12-week methylation support protocol reaching end date. Schedule reassessment.",
    time: "6 hours ago",
    severity: "low" as const,
  },
  {
    id: "4",
    type: "interaction" as const,
    title: "Supplement Interaction Warning",
    description:
      "Amara Osei: St. John's Wort may reduce efficacy of current SSRI. Review supplementation plan.",
    time: "1 day ago",
    severity: "high" as const,
  },
]

const upcomingAppointments = [
  {
    id: "1",
    patient: "Marcus Johnson",
    initials: "MJ",
    type: "Genomic Review",
    time: "10:00 AM",
    date: "Today",
  },
  {
    id: "2",
    patient: "Elena Rodriguez",
    initials: "ER",
    type: "Protocol Follow-up",
    time: "2:30 PM",
    date: "Today",
  },
  {
    id: "3",
    patient: "Amara Osei",
    initials: "AO",
    type: "Initial Consultation",
    time: "9:15 AM",
    date: "Tomorrow",
  },
]

const quickActions = [
  {
    label: "New Patient",
    icon: UserPlus,
    href: "/patients/new",
    color: "bg-blue-50 text-blue-600",
  },
  {
    label: "Check Interactions",
    icon: Search,
    href: "/interactions",
    color: "bg-amber-50 text-amber-600",
  },
  {
    label: "View Protocols",
    icon: BookOpen,
    href: "/protocols",
    color: "bg-purple-50 text-purple-600",
  },
  {
    label: "GeneX360 Results",
    icon: Dna,
    href: "/genex360",
    color: "bg-emerald-50 text-emerald-600",
  },
]

// ─── Status Badge Helper ────────────────────────────────────────────────────

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge variant="success">Active</Badge>
    case "review":
      return <Badge variant="warning">Review</Badge>
    case "pending":
      return <Badge variant="info">Pending</Badge>
    case "completed":
      return <Badge variant="secondary">Completed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function alertIcon(type: string) {
  switch (type) {
    case "interaction":
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    case "lab":
      return <FlaskConical className="h-4 w-4 text-blue-500" />
    case "protocol":
      return <RefreshCw className="h-4 w-4 text-amber-500" />
    default:
      return <Activity className="h-4 w-4 text-gray-500" />
  }
}

function severityColor(severity: string) {
  switch (severity) {
    case "high":
      return "border-l-red-500"
    case "medium":
      return "border-l-amber-500"
    case "low":
      return "border-l-blue-500"
    default:
      return "border-l-gray-300"
  }
}

// ─── Dashboard Page ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          {getGreeting()}, Dr. Mitchell
        </h1>
        <p className="mt-1 text-sm text-gray-500">{formatDate()}</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Patients"
          value="1,247"
          icon={<Users className="h-5 w-5" />}
          change={4.2}
          changeLabel="vs last month"
        />
        <StatCard
          title="Active Protocols"
          value={38}
          icon={<ClipboardList className="h-5 w-5" />}
          change={12}
          changeLabel="vs last month"
        />
        <StatCard
          title="Pending Reviews"
          value={12}
          icon={<FileCheck className="h-5 w-5" />}
          change={-8}
          changeLabel="vs last week"
        />
        <StatCard
          title="CME Hours"
          value="24.5"
          icon={<GraduationCap className="h-5 w-5" />}
          change={6}
          changeLabel="this quarter"
        />
      </div>

      {/* Main grid: patients table + alerts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Patients - spans 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base">Recent Patients</CardTitle>
            <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700">
              View all
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-3 text-left font-medium text-gray-500">Patient</th>
                    <th className="pb-3 text-left font-medium text-gray-500 hidden sm:table-cell">
                      Condition
                    </th>
                    <th className="pb-3 text-left font-medium text-gray-500 hidden md:table-cell">
                      Last Visit
                    </th>
                    <th className="pb-3 text-right font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {patient.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-gray-900">{patient.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-gray-600 hidden sm:table-cell">
                        {patient.condition}
                      </td>
                      <td className="py-3 text-gray-500 hidden md:table-cell">
                        {patient.lastVisit}
                      </td>
                      <td className="py-3 text-right">{statusBadge(patient.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Clinical Alerts */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base">Clinical Alerts</CardTitle>
            <Badge variant="destructive" className="text-[10px]">
              {clinicalAlerts.length} New
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clinicalAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-lg border border-gray-100 border-l-[3px] ${severityColor(alert.severity)} p-3 hover:bg-gray-50/50 transition-colors cursor-pointer`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 shrink-0">{alertIcon(alert.type)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                        {alert.description}
                      </p>
                      <p className="mt-1.5 text-[10px] text-gray-400">{alert.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom grid: appointments + quick actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming Appointments */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base">Upcoming Appointments</CardTitle>
            <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700">
              View schedule
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center gap-4 rounded-lg border border-gray-100 p-3 hover:bg-gray-50/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{appt.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{appt.patient}</p>
                    <p className="text-xs text-gray-500">{appt.type}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-gray-900">{appt.time}</p>
                    <p className="text-xs text-gray-500">{appt.date}</p>
                  </div>
                  <div className="shrink-0">
                    <Clock className="h-4 w-4 text-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.label}
                    className="flex flex-col items-center gap-2.5 rounded-xl border border-gray-100 p-4 text-center hover:border-gray-200 hover:bg-gray-50/50 transition-colors"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{action.label}</span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
