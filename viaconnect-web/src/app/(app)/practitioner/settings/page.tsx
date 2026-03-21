"use client";

import { useState } from "react";
import {
  Card,
  Badge,
  Button,
  Input,
  Select,
  DataTable,
  StatCard,
  Progress,
} from "@/components/ui";
import type { Column } from "@/components/ui";
import { PageTransition, StaggerChild } from "@/lib/motion";
import {
  Building2,
  ShieldCheck,
  Bell,
  ClipboardList,
  BarChart3,
  CreditCard,
  Save,
  Activity,
  Cpu,
  Gauge,
  Check,
  Star,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PracticeForm {
  practiceName: string;
  npiNumber: string;
  specialty: string;
  address: string;
  phone: string;
  email: string;
}

interface LicenseInfo {
  licenseNumber: string;
  state: string;
  expirationDate: string;
  deaNumber: string;
}

interface NotificationPref {
  key: string;
  label: string;
  email: boolean;
  push: boolean;
}

interface AuditEntry {
  timestamp: string;
  action: string;
  resource: string;
  user: string;
  ip: string;
  [key: string]: unknown;
}

// ─── Toggle Switch ───────────────────────────────────────────────────────────

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? "bg-portal-green" : "bg-white/[0.08]"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const INITIAL_PRACTICE: PracticeForm = {
  practiceName: "Chen Integrative Wellness",
  npiNumber: "1234567890",
  specialty: "integrative",
  address: "456 Wellness Blvd, Suite 200, Buffalo, NY 14201",
  phone: "(716) 555-0192",
  email: "dr.chen@chenwellness.com",
};

const INITIAL_LICENSE: LicenseInfo = {
  licenseNumber: "MD-284719",
  state: "NY",
  expirationDate: "2027-06-30",
  deaNumber: "BC1234563",
};

const INITIAL_NOTIFICATIONS: NotificationPref[] = [
  { key: "new_patient", label: "New patient registration", email: true, push: true },
  { key: "protocol_approval", label: "Protocol approval requests", email: true, push: true },
  { key: "interaction_alerts", label: "Interaction alerts", email: true, push: true },
  { key: "lab_results", label: "Lab results received", email: true, push: false },
  { key: "low_adherence", label: "Low adherence warnings", email: false, push: true },
  { key: "system_updates", label: "System updates", email: true, push: false },
];

const AUDIT_DATA: AuditEntry[] = [
  { timestamp: "2026-03-21 09:14:22", action: "Login", resource: "Auth", user: "Dr. Chen", ip: "192.168.1.42" },
  { timestamp: "2026-03-21 09:15:03", action: "View Patient", resource: "Sarah Mitchell (#2847)", user: "Dr. Chen", ip: "192.168.1.42" },
  { timestamp: "2026-03-21 09:22:18", action: "Update Protocol", resource: "MTHFR Protocol (#P-401)", user: "Dr. Chen", ip: "192.168.1.42" },
  { timestamp: "2026-03-21 09:30:45", action: "AI Query", resource: "Claude - Clinical Reasoning", user: "Dr. Chen", ip: "192.168.1.42" },
  { timestamp: "2026-03-20 16:45:12", action: "Export Data", resource: "Patient Report (#2847)", user: "Dr. Chen", ip: "192.168.1.42" },
  { timestamp: "2026-03-20 14:20:33", action: "View Genomics", resource: "Genetic Panel (#G-1122)", user: "Dr. Chen", ip: "192.168.1.42" },
  { timestamp: "2026-03-20 11:05:17", action: "Create Protocol", resource: "NAD+ Protocol (#P-402)", user: "Dr. Chen", ip: "192.168.1.42" },
  { timestamp: "2026-03-19 08:55:41", action: "Login", resource: "Auth", user: "Dr. Chen", ip: "10.0.0.88" },
];

const SPECIALTY_OPTIONS = [
  { value: "integrative", label: "Integrative Medicine" },
  { value: "naturopathic", label: "Naturopathic Medicine" },
  { value: "functional", label: "Functional Medicine" },
  { value: "internal", label: "Internal Medicine" },
  { value: "family", label: "Family Medicine" },
  { value: "other", label: "Other" },
];

const AUDIT_ACTION_FILTER = [
  { value: "all", label: "All Actions" },
  { value: "Login", label: "Login" },
  { value: "View Patient", label: "View Patient" },
  { value: "Update Protocol", label: "Update Protocol" },
  { value: "AI Query", label: "AI Query" },
  { value: "Export Data", label: "Export Data" },
  { value: "View Genomics", label: "View Genomics" },
  { value: "Create Protocol", label: "Create Protocol" },
];

const PLAN_FEATURES = [
  "Unlimited patient profiles",
  "Multi-LLM Clinical Advisor (Claude, Grok, GPT-4o)",
  "Full genetic panel access (GENEX360)",
  "EHR integration (Epic, Cerner, Allscripts)",
  "Protocol builder with interaction checking",
  "Audit trail and compliance reporting",
  "Priority support and onboarding",
  "10,000 API calls/month",
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  // Practice form
  const [practice, setPractice] = useState<PracticeForm>(INITIAL_PRACTICE);

  // Notifications
  const [notifications, setNotifications] = useState<NotificationPref[]>(
    INITIAL_NOTIFICATIONS,
  );

  // Audit filter
  const [auditActionFilter, setAuditActionFilter] = useState("all");

  const updatePractice = (field: keyof PracticeForm, value: string) =>
    setPractice((prev) => ({ ...prev, [field]: value }));

  const toggleNotification = (
    key: string,
    channel: "email" | "push",
  ) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.key === key ? { ...n, [channel]: !n[channel] } : n,
      ),
    );
  };

  const filteredAudit =
    auditActionFilter === "all"
      ? AUDIT_DATA
      : AUDIT_DATA.filter((e) => e.action === auditActionFilter);

  const auditColumns: Column<AuditEntry>[] = [
    { key: "timestamp", header: "Timestamp", sortable: true },
    {
      key: "action",
      header: "Action",
      sortable: true,
      render: (row) => {
        const colors: Record<string, string> = {
          Login: "text-portal-green",
          "View Patient": "text-cyan",
          "Update Protocol": "text-portal-yellow",
          "AI Query": "text-portal-purple",
          "Export Data": "text-copper",
          "View Genomics": "text-portal-pink",
          "Create Protocol": "text-portal-green",
        };
        return (
          <span className={`font-medium ${colors[row.action as string] || "text-gray-300"}`}>
            {row.action as string}
          </span>
        );
      },
    },
    { key: "resource", header: "Resource", sortable: true },
    { key: "user", header: "User" },
    { key: "ip", header: "IP Address" },
  ];

  return (
    <PageTransition className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <StaggerChild>
          <div>
            <h1 className="text-3xl font-bold text-white">Practice Settings</h1>
            <p className="text-gray-400 mt-1">
              Manage your practice configuration, credentials, and preferences
            </p>
          </div>
        </StaggerChild>

        {/* ── 1. Practice Profile ── */}
        <StaggerChild>
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-portal-green/10 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-portal-green" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Practice Profile
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Practice Name"
              value={practice.practiceName}
              onChange={(e) => updatePractice("practiceName", e.target.value)}
            />
            <Input
              label="NPI Number"
              value={practice.npiNumber}
              onChange={(e) => updatePractice("npiNumber", e.target.value)}
            />
            <Select
              label="Specialty"
              value={practice.specialty}
              onValueChange={(val) => updatePractice("specialty", val)}
              options={SPECIALTY_OPTIONS}
            />
            <Input
              label="Phone"
              value={practice.phone}
              onChange={(e) => updatePractice("phone", e.target.value)}
            />
            <div className="md:col-span-2">
              <Input
                label="Address"
                value={practice.address}
                onChange={(e) => updatePractice("address", e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Email"
                type="email"
                value={practice.email}
                onChange={(e) => updatePractice("email", e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="primary" size="md">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </Card>
        </StaggerChild>

        {/* ── 2. License & Credentials ── */}
        <StaggerChild>
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-portal-purple/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-portal-purple" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              License & Credentials
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-gray-400">
                License Number
              </p>
              <div className="flex items-center gap-2">
                <p className="text-white text-sm font-mono">
                  {INITIAL_LICENSE.licenseNumber}
                </p>
                <Badge variant="active">Verified</Badge>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-gray-400">State</p>
              <p className="text-white text-sm">{INITIAL_LICENSE.state}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-gray-400">
                Expiration Date
              </p>
              <div className="flex items-center gap-2">
                <p className="text-white text-sm">
                  {INITIAL_LICENSE.expirationDate}
                </p>
                <Badge variant="active">Valid</Badge>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-gray-400">DEA Number</p>
              <div className="flex items-center gap-2">
                <p className="text-white text-sm font-mono">
                  {INITIAL_LICENSE.deaNumber}
                </p>
                <Badge variant="pending">Pending</Badge>
              </div>
            </div>
          </div>
        </Card>
        </StaggerChild>

        {/* ── 3. Notification Preferences ── */}
        <StaggerChild>
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-portal-yellow/10 flex items-center justify-center">
              <Bell className="w-4 h-4 text-portal-yellow" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Notification Preferences
            </h2>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/[0.06]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Notification
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">
                    Email
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">
                    Push
                  </th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n) => (
                  <tr
                    key={n.key}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-300">{n.label}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <Toggle
                          enabled={n.email}
                          onChange={() => toggleNotification(n.key, "email")}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <Toggle
                          enabled={n.push}
                          onChange={() => toggleNotification(n.key, "push")}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        </StaggerChild>

        {/* ── 4. Audit Trail ── */}
        <StaggerChild>
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan/10 flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-cyan" />
              </div>
              <h2 className="text-lg font-semibold text-white">Audit Trail</h2>
            </div>
            <div className="w-48">
              <Select
                value={auditActionFilter}
                onValueChange={setAuditActionFilter}
                placeholder="Filter by action"
                options={AUDIT_ACTION_FILTER}
              />
            </div>
          </div>

          <DataTable<AuditEntry>
            columns={auditColumns}
            data={filteredAudit}
            pageSize={8}
          />
        </Card>
        </StaggerChild>

        {/* ── 5. API Usage Stats ── */}
        <StaggerChild>
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-copper/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-copper" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              API Usage Stats
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              icon={Activity}
              label="API Calls This Month"
              value="1,247"
              trend="up"
              trendLabel="+12%"
            />
            <StatCard
              icon={Cpu}
              label="AI Queries"
              value="89"
              trend="up"
              trendLabel="+8%"
            />
            <StatCard
              icon={Gauge}
              label="Rate Limit Remaining"
              value="8,753 / 10,000"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Monthly Usage</span>
              <span className="text-gray-300 font-medium">12.5%</span>
            </div>
            <Progress value={1247} max={10000} color="bg-portal-green" />
            <p className="text-xs text-gray-500">
              1,247 of 10,000 API calls used this billing cycle
            </p>
          </div>
        </Card>
        </StaggerChild>

        {/* ── 6. Subscription ── */}
        <StaggerChild>
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-portal-pink/10 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-portal-pink" />
            </div>
            <h2 className="text-lg font-semibold text-white">Subscription</h2>
          </div>

          <div className="flex items-center justify-between p-5 rounded-xl bg-gradient-to-r from-portal-green/5 to-portal-green/10 border border-portal-green/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-portal-green/20 flex items-center justify-center">
                <Star className="w-6 h-6 text-portal-green" />
              </div>
              <div>
                <p className="text-white font-semibold text-lg">
                  Practitioner Plan
                </p>
                <p className="text-gray-400 text-sm">
                  Full access to all practitioner tools and AI advisor
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-portal-green">$128.88</p>
              <p className="text-gray-500 text-xs">per month</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {PLAN_FEATURES.map((feature) => (
              <div key={feature} className="flex items-center gap-2 py-1">
                <Check className="w-4 h-4 text-portal-green flex-shrink-0" />
                <span className="text-gray-300 text-sm">{feature}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button variant="secondary" size="md">
              Manage Subscription
            </Button>
          </div>
        </Card>
        </StaggerChild>
      </div>
    </PageTransition>
  );
}
