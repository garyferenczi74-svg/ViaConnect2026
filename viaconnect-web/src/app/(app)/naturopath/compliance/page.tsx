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
  status: "success" | "warning";
};

type ConsentRecord = {
  patient: string;
  consentType: string;
  status: "Active" | "Expired" | "Pending";
  signedDate: string;
  expiryDate: string;
};

type ActionItem = {
  id: string;
  label: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const auditData: AuditEntry[] = [
  { timestamp: "2026-03-21 09:14 AM", action: "Record Access", resource: "Patient #1042 — Elena Vasquez", user: "Dr. Thompson", ip: "192.168.1.45", status: "success" },
  { timestamp: "2026-03-21 08:47 AM", action: "Protocol Change", resource: "Adrenal Recovery Protocol", user: "Dr. Thompson", ip: "192.168.1.45", status: "success" },
  { timestamp: "2026-03-20 04:32 PM", action: "Formula Export", resource: "Liver Support Tincture", user: "Dr. Thompson", ip: "192.168.1.45", status: "success" },
  { timestamp: "2026-03-20 02:15 PM", action: "Record Access", resource: "Patient #1038 — Marcus Chen", user: "Dr. Thompson", ip: "192.168.1.45", status: "success" },
  { timestamp: "2026-03-20 02:10 PM", action: "Consent Update", resource: "HIPAA Authorization — Marcus Chen", user: "System", ip: "10.0.0.1", status: "success" },
  { timestamp: "2026-03-19 11:30 AM", action: "Login", resource: "Web Portal", user: "Dr. Thompson", ip: "73.42.118.206", status: "warning" },
  { timestamp: "2026-03-19 09:00 AM", action: "Record Access", resource: "Patient #1035 — Priya Patel", user: "Dr. Thompson", ip: "192.168.1.45", status: "success" },
  { timestamp: "2026-03-18 03:45 PM", action: "Formula Export", resource: "Nervine Calm Blend", user: "Dr. Thompson", ip: "192.168.1.45", status: "success" },
  { timestamp: "2026-03-18 01:20 PM", action: "Protocol Change", resource: "Gut Restoration Phase 2", user: "Dr. Thompson", ip: "192.168.1.45", status: "success" },
  { timestamp: "2026-03-17 10:05 AM", action: "Login", resource: "Web Portal", user: "Dr. Thompson", ip: "192.168.1.45", status: "success" },
];

const consentData: ConsentRecord[] = [
  { patient: "Elena Vasquez", consentType: "HIPAA Auth", status: "Active", signedDate: "2026-01-15", expiryDate: "2027-01-15" },
  { patient: "Marcus Chen", consentType: "Treatment", status: "Active", signedDate: "2026-02-01", expiryDate: "2027-02-01" },
  { patient: "Sarah Kim", consentType: "Data Sharing", status: "Expired", signedDate: "2025-03-10", expiryDate: "2026-03-10" },
  { patient: "James Wright", consentType: "HIPAA Auth", status: "Pending", signedDate: "", expiryDate: "" },
  { patient: "Priya Patel", consentType: "Research", status: "Active", signedDate: "2026-01-20", expiryDate: "2027-01-20" },
  { patient: "Lisa Monroe", consentType: "Treatment", status: "Active", signedDate: "2025-12-05", expiryDate: "2026-12-05" },
  { patient: "David Santos", consentType: "HIPAA Auth", status: "Active", signedDate: "2026-02-14", expiryDate: "2027-02-14" },
  { patient: "Karen O'Brien", consentType: "Data Sharing", status: "Expired", signedDate: "2025-03-20", expiryDate: "2026-03-20" },
];

const initialActionItems: ActionItem[] = [
  { id: "1", label: "Review and update privacy policy", dueDate: "March 30, 2026", priority: "high", completed: false },
  { id: "2", label: "Complete staff HIPAA training", dueDate: "April 15, 2026", priority: "medium", completed: false },
  { id: "3", label: "Update data breach response plan", dueDate: "March 10, 2026", priority: "high", completed: true },
  { id: "4", label: "Quarterly access review", dueDate: "March 14, 2026", priority: "medium", completed: true },
  { id: "5", label: "Renew 2 expiring patient consents", dueDate: "March 25, 2026", priority: "high", completed: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const actionTypeOptions = [
  { value: "all", label: "All Actions" },
  { value: "Record Access", label: "Record Access" },
  { value: "Protocol Change", label: "Protocol Change" },
  { value: "Formula Export", label: "Formula Export" },
  { value: "Consent Update", label: "Consent Update" },
  { value: "Login", label: "Login" },
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

const priorityBadge: Record<string, "danger" | "warning" | "neutral"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [actionItems, setActionItems] = useState(initialActionItems);

  const complianceScore = 94.5;
  const scoreColor = complianceScore > 90 ? "text-sage" : complianceScore > 70 ? "text-portal-yellow" : "text-rose";
  const strokeColor = complianceScore > 90 ? "#76866F" : complianceScore > 70 ? "#FBBF24" : "#9D5858";

  // SVG circle math
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (complianceScore / 100) * circumference;

  // Filtered audit data
  const filteredAuditData = useMemo(() => {
    let filtered = auditData;
    if (actionFilter !== "all") {
      filtered = filtered.filter((e) => e.action === actionFilter);
    }
    if (dateFilter === "today") {
      filtered = filtered.filter((e) => e.timestamp.startsWith("2026-03-21"));
    } else if (dateFilter === "7d") {
      filtered = filtered.filter((e) => {
        const d = e.timestamp.slice(0, 10);
        return d >= "2026-03-15";
      });
    } else if (dateFilter === "30d") {
      filtered = filtered.filter((e) => {
        const d = e.timestamp.slice(0, 10);
        return d >= "2026-02-19";
      });
    }
    return filtered;
  }, [actionFilter, dateFilter]);

  const toggleActionItem = (id: string) => {
    setActionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  // ─── Audit columns ─────────────────────────────────────────────────────────
  const auditColumns: Column<AuditEntry>[] = [
    { key: "timestamp", header: "Timestamp", sortable: true },
    { key: "action", header: "Action" },
    { key: "resource", header: "Resource" },
    { key: "user", header: "User" },
    { key: "ip", header: "IP Address" },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={row.status === "success" ? "active" : "warning"}>
          {row.status === "success" ? "Success" : "Warning"}
        </Badge>
      ),
    },
  ];

  // ─── Consent columns ───────────────────────────────────────────────────────
  const consentColumns: Column<ConsentRecord>[] = [
    { key: "patient", header: "Patient Name", sortable: true },
    { key: "consentType", header: "Consent Type" },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={consentStatusBadge[row.status]}>{row.status}</Badge>
      ),
    },
    { key: "signedDate", header: "Signed Date", render: (row) => <span>{row.signedDate || "—"}</span> },
    { key: "expiryDate", header: "Expiry Date", render: (row) => <span>{row.expiryDate || "—"}</span> },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button className="text-xs text-sage hover:text-sage-light transition-colors">View</button>
          {row.status === "Expired" && (
            <button className="text-xs text-portal-yellow hover:text-portal-yellow/80 transition-colors">Renew</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageTransition className="min-h-screen bg-dark-bg px-4 md:px-6 lg:px-8 py-6 md:py-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <StaggerChild className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">HIPAA Compliance Dashboard</h1>
            <p className="mt-1 text-gray-400">
              Monitor compliance status, audit logs, and patient consents
            </p>
          </div>
          <Button className="bg-sage hover:bg-sage/80 text-white min-h-[44px] sm:min-h-0">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </StaggerChild>

        {/* Compliance Score + Stats */}
        <StaggerChild className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Compliance Score Ring */}
          <Card hover={false} className="p-6 flex flex-col items-center justify-center lg:col-span-1">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Compliance Score
            </h2>
            <div className="relative w-44 h-44">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="10"
                />
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${scoreColor}`}>{complianceScore}%</span>
                <span className="text-xs text-gray-400">Overall</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-6 text-xs text-gray-400">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                <span>Last Audit: March 14, 2026</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                <span>Next: June 14, 2026</span>
              </div>
            </div>
          </Card>

          {/* Stat Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard icon={Shield} label="Total Audits (YTD)" value="4" />
            <StatCard
              icon={AlertTriangle}
              label="Open Issues"
              value="2"
              className="border border-portal-yellow/20"
            />
            <StatCard icon={Activity} label="Data Access Events (30d)" value="147" />
            <StatCard icon={Users} label="Active Consents" value="36/38 (95%)" />
          </div>
        </StaggerChild>

        {/* Audit Trail Viewer */}
        <Card hover={false} className="p-4 md:p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white">Audit Trail Viewer</h2>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-end gap-4 mb-5">
            <div className="w-full sm:w-52">
              <Select
                label="Action Type"
                value={actionFilter}
                onValueChange={setActionFilter}
                options={actionTypeOptions}
              />
            </div>
            <div className="w-full sm:w-44">
              <Select
                label="Date Range"
                value={dateFilter}
                onValueChange={setDateFilter}
                options={dateRangeOptions}
              />
            </div>
          </div>
          <DataTable<AuditEntry>
            columns={auditColumns}
            data={filteredAuditData}
            pageSize={10}
          />
        </Card>

        {/* Consent Management */}
        <Card hover={false} className="p-4 md:p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
            <h2 className="text-lg font-semibold text-white">Consent Management</h2>
            <Button size="sm" className="bg-sage hover:bg-sage/80 text-white">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Send Consent Request
            </Button>
          </div>
          <DataTable<ConsentRecord>
            columns={consentColumns}
            data={consentData}
            pageSize={10}
          />
        </Card>

        {/* Action Items */}
        <Card hover={false} className="p-4 md:p-6">
          <h2 className="text-lg font-semibold text-white mb-5">Action Items</h2>
          <div className="space-y-3">
            {actionItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors ${
                  item.completed
                    ? "border-white/[0.04] bg-white/[0.01]"
                    : "border-white/[0.08] bg-white/[0.03]"
                }`}
              >
                <button
                  onClick={() => toggleActionItem(item.id)}
                  className="shrink-0"
                >
                  {item.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-sage" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-500 hover:text-sage transition-colors" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${item.completed ? "text-gray-500 line-through" : "text-white"}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.completed ? "Completed" : `Due: ${item.dueDate}`}
                  </p>
                </div>
                <Badge variant={priorityBadge[item.priority]}>
                  {item.priority}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
