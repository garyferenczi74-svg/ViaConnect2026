"use client";

import { useState, useMemo } from "react";
import {
  Shield,
  FileText,
  AlertTriangle,
  Download,
  CheckCircle2,
  Circle,
  Clock,
  Users,
  Activity,
  Lock,
  Eye,
  ShieldCheck,
  Stethoscope,
  GraduationCap,
  Pill,
} from "lucide-react";
import { Card, StatCard, Badge, Button, Select, DataTable } from "@/components/ui";
import type { Column } from "@/components/ui/DataTable";
import { PageTransition, StaggerChild } from "@/lib/motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuditEntry = {
  timestamp: string;
  action: string;
  resource: string;
  user: string;
  ip: string;
  status: "success" | "warning" | "blocked";
};

type ConsentRecord = {
  patient: string;
  consentType: string;
  status: "Active" | "Expired" | "Pending";
  signedDate: string;
  expiryDate: string;
};

type CredentialRecord = {
  credential: string;
  type: string;
  status: "Current" | "Expiring" | "Expired";
  issueDate: string;
  expiryDate: string;
  ceHours: number;
};

type ActionItem = {
  id: string;
  label: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
  category: string;
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const auditData: AuditEntry[] = [
  { timestamp: "2026-03-24 09:14 AM", action: "PHI Access", resource: "Patient #1042 — Elena Vasquez", user: "Dr. Ferenczi", ip: "192.168.1.45", status: "success" },
  { timestamp: "2026-03-24 08:47 AM", action: "Protocol Approved", resource: "MTHFR+ Protocol — James Robertson", user: "Dr. Ferenczi", ip: "192.168.1.45", status: "success" },
  { timestamp: "2026-03-23 04:32 PM", action: "Rx Interaction Check", resource: "Warfarin + CoQ10 flagged", user: "System", ip: "10.0.0.1", status: "warning" },
  { timestamp: "2026-03-23 02:15 PM", action: "Genetic Report Viewed", resource: "GENEX-M Panel — Anika Patel", user: "Dr. Ferenczi", ip: "192.168.1.45", status: "success" },
  { timestamp: "2026-03-23 02:10 PM", action: "Consent Updated", resource: "Telehealth Consent — Anika Patel", user: "System", ip: "10.0.0.1", status: "success" },
  { timestamp: "2026-03-22 11:30 AM", action: "Unauthorized Access", resource: "Admin Panel", user: "Unknown", ip: "73.42.118.206", status: "blocked" },
  { timestamp: "2026-03-22 09:00 AM", action: "PHI Export", resource: "Bulk Patient Report (12 records)", user: "Dr. Ferenczi", ip: "192.168.1.45", status: "warning" },
  { timestamp: "2026-03-21 03:45 PM", action: "Protocol Approved", resource: "SNP Panel Protocol — Marcus Thompson", user: "Dr. Ferenczi", ip: "192.168.1.45", status: "success" },
  { timestamp: "2026-03-21 01:20 PM", action: "E-Prescribe", resource: "COMT+ 60ct — Emily Zhao", user: "Dr. Ferenczi", ip: "192.168.1.45", status: "success" },
  { timestamp: "2026-03-20 10:05 AM", action: "Session Login", resource: "Web Portal (MFA verified)", user: "Dr. Ferenczi", ip: "192.168.1.45", status: "success" },
];

const consentData: ConsentRecord[] = [
  { patient: "Elena Vasquez", consentType: "HIPAA Authorization", status: "Active", signedDate: "2026-01-15", expiryDate: "2027-01-15" },
  { patient: "James Robertson", consentType: "Genetic Testing Consent", status: "Active", signedDate: "2026-02-01", expiryDate: "2027-02-01" },
  { patient: "Anika Patel", consentType: "Telehealth Consent", status: "Active", signedDate: "2026-03-10", expiryDate: "2027-03-10" },
  { patient: "Marcus Thompson", consentType: "HIPAA Authorization", status: "Active", signedDate: "2026-02-20", expiryDate: "2027-02-20" },
  { patient: "Emily Zhao", consentType: "Treatment Consent", status: "Expired", signedDate: "2025-03-15", expiryDate: "2026-03-15" },
  { patient: "David Kim", consentType: "Genetic Testing Consent", status: "Pending", signedDate: "", expiryDate: "" },
  { patient: "Sarah Mitchell", consentType: "HIPAA Authorization", status: "Active", signedDate: "2026-01-08", expiryDate: "2027-01-08" },
  { patient: "Robert Chen", consentType: "Research Participation", status: "Active", signedDate: "2025-12-05", expiryDate: "2026-12-05" },
];

const credentials: CredentialRecord[] = [
  { credential: "Medical License (NY)", type: "State License", status: "Current", issueDate: "2024-06-01", expiryDate: "2027-06-01", ceHours: 0 },
  { credential: "DEA Registration", type: "Federal", status: "Current", issueDate: "2023-09-15", expiryDate: "2026-09-15", ceHours: 0 },
  { credential: "Board Certification (IM)", type: "Board Cert", status: "Current", issueDate: "2022-01-10", expiryDate: "2032-01-10", ceHours: 0 },
  { credential: "HIPAA Certification", type: "Compliance", status: "Current", issueDate: "2026-01-20", expiryDate: "2027-01-20", ceHours: 4 },
  { credential: "Nutrigenomics CME", type: "CME", status: "Current", issueDate: "2026-02-15", expiryDate: "2027-02-15", ceHours: 12 },
  { credential: "Controlled Substance (NY)", type: "State License", status: "Expiring", issueDate: "2024-04-01", expiryDate: "2026-04-01", ceHours: 0 },
];

const initialActionItems: ActionItem[] = [
  { id: "1", label: "Renew Emily Zhao treatment consent (expired March 15)", dueDate: "March 30, 2026", priority: "high", completed: false, category: "Consent" },
  { id: "2", label: "Send genetic testing consent to David Kim", dueDate: "March 28, 2026", priority: "high", completed: false, category: "Consent" },
  { id: "3", label: "Renew Controlled Substance license (expires April 1)", dueDate: "April 1, 2026", priority: "high", completed: false, category: "Credential" },
  { id: "4", label: "Complete annual HIPAA security risk assessment", dueDate: "April 15, 2026", priority: "medium", completed: false, category: "Compliance" },
  { id: "5", label: "Review and update drug interaction database", dueDate: "March 31, 2026", priority: "medium", completed: false, category: "Clinical" },
  { id: "6", label: "Update data breach response plan", dueDate: "March 10, 2026", priority: "high", completed: true, category: "Compliance" },
  { id: "7", label: "Q1 prescribing audit review", dueDate: "March 14, 2026", priority: "medium", completed: true, category: "Compliance" },
  { id: "8", label: "Complete 12 CME hours for Nutrigenomics", dueDate: "February 15, 2026", priority: "medium", completed: true, category: "Credential" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const actionTypeOptions = [
  { value: "all", label: "All Actions" },
  { value: "PHI Access", label: "PHI Access" },
  { value: "Protocol Approved", label: "Protocol Approved" },
  { value: "Rx Interaction Check", label: "Interaction Check" },
  { value: "Genetic Report Viewed", label: "Genetic Report" },
  { value: "PHI Export", label: "PHI Export" },
  { value: "E-Prescribe", label: "E-Prescribe" },
  { value: "Session Login", label: "Login" },
];

const dateRangeOptions = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "all", label: "All" },
];

const consentStatusBadge: Record<string, "active" | "danger" | "pending"> = {
  Active: "active",
  Expired: "danger",
  Pending: "pending",
};

const credStatusBadge: Record<string, "active" | "warning" | "danger"> = {
  Current: "active",
  Expiring: "warning",
  Expired: "danger",
};

const priorityBadge: Record<string, "danger" | "warning" | "neutral"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PractitionerCompliancePage() {
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [actionItems, setActionItems] = useState(initialActionItems);

  const complianceScore = 91.2;
  const scoreColor = complianceScore > 90 ? "text-portal-green" : complianceScore > 70 ? "text-portal-yellow" : "text-rose";
  const strokeColor = complianceScore > 90 ? "#4ADE80" : complianceScore > 70 ? "#FBBF24" : "#9D5858";

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (complianceScore / 100) * circumference;

  const filteredAuditData = useMemo(() => {
    let filtered = auditData;
    if (actionFilter !== "all") filtered = filtered.filter((e) => e.action === actionFilter);
    if (dateFilter === "today") filtered = filtered.filter((e) => e.timestamp.startsWith("2026-03-24"));
    else if (dateFilter === "7d") filtered = filtered.filter((e) => e.timestamp.slice(0, 10) >= "2026-03-18");
    else if (dateFilter === "30d") filtered = filtered.filter((e) => e.timestamp.slice(0, 10) >= "2026-02-22");
    return filtered;
  }, [actionFilter, dateFilter]);

  const toggleActionItem = (id: string) => {
    setActionItems((prev) => prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)));
  };

  const totalCEHours = credentials.reduce((sum, c) => sum + c.ceHours, 0);
  const expiringCreds = credentials.filter((c) => c.status === "Expiring" || c.status === "Expired").length;

  const auditColumns: Column<AuditEntry>[] = [
    { key: "timestamp", header: "Timestamp", sortable: true },
    { key: "action", header: "Action" },
    { key: "resource", header: "Resource" },
    { key: "user", header: "User" },
    { key: "ip", header: "IP Address" },
    {
      key: "status", header: "Status",
      render: (row) => (
        <Badge variant={row.status === "success" ? "active" : row.status === "blocked" ? "danger" : "warning"}>
          {row.status === "success" ? "OK" : row.status === "blocked" ? "Blocked" : "Review"}
        </Badge>
      ),
    },
  ];

  const consentColumns: Column<ConsentRecord>[] = [
    { key: "patient", header: "Patient", sortable: true },
    { key: "consentType", header: "Type" },
    { key: "status", header: "Status", render: (row) => <Badge variant={consentStatusBadge[row.status]}>{row.status}</Badge> },
    { key: "signedDate", header: "Signed", render: (row) => <span>{row.signedDate || "\,"}</span> },
    { key: "expiryDate", header: "Expires", render: (row) => <span>{row.expiryDate || "\,"}</span> },
    {
      key: "actions", header: "",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button className="text-xs text-portal-green hover:text-portal-green/80 transition-colors">View</button>
          {row.status === "Expired" && <button className="text-xs text-portal-yellow hover:text-portal-yellow/80">Renew</button>}
          {row.status === "Pending" && <button className="text-xs text-cyan-400 hover:text-cyan-300">Send</button>}
        </div>
      ),
    },
  ];

  const credentialColumns: Column<CredentialRecord>[] = [
    { key: "credential", header: "Credential", sortable: true },
    { key: "type", header: "Type" },
    { key: "status", header: "Status", render: (row) => <Badge variant={credStatusBadge[row.status]}>{row.status}</Badge> },
    { key: "issueDate", header: "Issued" },
    { key: "expiryDate", header: "Expires" },
    { key: "ceHours", header: "CE Hours", render: (row) => <span>{row.ceHours > 0 ? `${row.ceHours} hrs` : "\,"}</span> },
  ];

  return (
    <PageTransition className="min-h-screen bg-dark-bg px-6 py-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <StaggerChild className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Compliance & Credentialing</h1>
            <p className="mt-1 text-gray-400">
              HIPAA compliance, audit trail, credentials, and patient consents
            </p>
          </div>
          <Button className="bg-portal-green hover:bg-portal-green/80 text-white">
            <Download className="w-4 h-4 mr-2" />
            Export Compliance Report
          </Button>
        </StaggerChild>

        {/* Score + Stats */}
        <StaggerChild className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card hover={false} className="p-6 flex flex-col items-center justify-center">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Compliance Score</h2>
            <div className="relative w-44 h-44">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                <circle cx="80" cy="80" r={radius} fill="none" stroke={strokeColor} strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} className="transition-all duration-700" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${scoreColor}`}>{complianceScore}%</span>
                <span className="text-xs text-gray-400">Overall</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-6 text-xs text-gray-400">
              <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /><span>Last Audit: Mar 14</span></div>
              <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /><span>Next: Jun 14</span></div>
            </div>
          </Card>

          <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={Shield} label="HIPAA Status" value="Compliant" />
            <StatCard icon={AlertTriangle} label="Open Issues" value="3" className="border border-portal-yellow/20" />
            <StatCard icon={Activity} label="PHI Access (30d)" value="147" />
            <StatCard icon={Users} label="Active Consents" value="6/8 (75%)" />
            <StatCard icon={GraduationCap} label="CE Hours (YTD)" value={`${totalCEHours}`} />
            <StatCard icon={Stethoscope} label="Credentials" value={expiringCreds > 0 ? `${expiringCreds} expiring` : "All current"} className={expiringCreds > 0 ? "border border-portal-yellow/20" : ""} />
          </div>
        </StaggerChild>

        {/* Credentials & Licenses */}
        <Card hover={false} className="p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-portal-green" />
              <h2 className="text-lg font-semibold text-white">Credentials & Licenses</h2>
            </div>
            <Button size="sm" className="bg-portal-green/10 text-portal-green hover:bg-portal-green/20">
              Add Credential
            </Button>
          </div>
          <DataTable<CredentialRecord> columns={credentialColumns} data={credentials} pageSize={10} />
        </Card>

        {/* HIPAA Audit Trail */}
        <Card hover={false} className="p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">HIPAA Audit Trail</h2>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-500">Tamper-proof log</span>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-4 mb-5">
            <div className="w-52">
              <Select label="Action Type" value={actionFilter} onValueChange={setActionFilter} options={actionTypeOptions} />
            </div>
            <div className="w-44">
              <Select label="Date Range" value={dateFilter} onValueChange={setDateFilter} options={dateRangeOptions} />
            </div>
          </div>
          <DataTable<AuditEntry> columns={auditColumns} data={filteredAuditData} pageSize={10} />
        </Card>

        {/* Consent Management */}
        <Card hover={false} className="p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-plum" />
              <h2 className="text-lg font-semibold text-white">Patient Consent Management</h2>
            </div>
            <Button size="sm" className="bg-plum/10 text-plum hover:bg-plum/20">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Send Consent Request
            </Button>
          </div>
          <DataTable<ConsentRecord> columns={consentColumns} data={consentData} pageSize={10} />
        </Card>

        {/* Supplement Compliance */}
        <Card hover={false} className="p-6 mb-8">
          <div className="flex items-center gap-2 mb-5">
            <Pill className="w-5 h-5 text-copper" />
            <h2 className="text-lg font-semibold text-white">Supplement Protocol Compliance</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
              <p className="text-xs text-gray-400 mb-1">Active Protocols</p>
              <p className="text-2xl font-bold text-white">14</p>
              <p className="text-xs text-gray-500 mt-1">Across 14 patients</p>
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
              <p className="text-xs text-gray-400 mb-1">Avg Patient Adherence</p>
              <p className="text-2xl font-bold text-portal-green">78%</p>
              <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
            </div>
            <div className="rounded-lg border border-portal-yellow/20 bg-portal-yellow/5 p-4">
              <p className="text-xs text-gray-400 mb-1">Interaction Flags</p>
              <p className="text-2xl font-bold text-portal-yellow">2</p>
              <p className="text-xs text-gray-500 mt-1">Warfarin + CoQ10, SSRI + 5-HTP</p>
            </div>
          </div>
        </Card>

        {/* Action Items */}
        <Card hover={false} className="p-6">
          <h2 className="text-lg font-semibold text-white mb-5">Action Items</h2>
          <div className="space-y-3">
            {actionItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors ${
                  item.completed ? "border-white/[0.04] bg-white/[0.01]" : "border-white/[0.08] bg-white/[0.03]"
                }`}
              >
                <button onClick={() => toggleActionItem(item.id)} className="shrink-0">
                  {item.completed ? <CheckCircle2 className="w-5 h-5 text-portal-green" /> : <Circle className="w-5 h-5 text-gray-500 hover:text-portal-green transition-colors" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${item.completed ? "text-gray-500 line-through" : "text-white"}`}>{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.completed ? "Completed" : `Due: ${item.dueDate}`}</p>
                </div>
                <Badge variant="neutral">{item.category}</Badge>
                <Badge variant={priorityBadge[item.priority]}>{item.priority}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
