"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, UserPlus } from "lucide-react";
import {
  Card,
  Button,
  Badge,
  Avatar,
  DataTable,
  Select,
  Progress,
} from "@/components/ui";
import type { Column } from "@/components/ui";

// ─── Types ───────────────────────────────────────────────────────────────────

type RiskLevel = "low" | "moderate" | "high" | "critical";
type ConsentStatus = "active" | "pending" | "expired";

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  lastVisit: string;          // ISO date
  consentStatus: ConsentStatus;
  riskLevel: RiskLevel;
  adherence: number;          // 0-100
  vitalityScore: number;      // 0-100
  [key: string]: unknown;
};

// ─── Mock Data ───────────────────────────────────────────────────────────────

const PATIENTS: Patient[] = [
  { id: "1", firstName: "Sarah", lastName: "Mitchell", email: "sarah.mitchell@email.com", avatarUrl: null, lastVisit: "2026-03-19", consentStatus: "active", riskLevel: "low", adherence: 92, vitalityScore: 84 },
  { id: "2", firstName: "James", lastName: "Robertson", email: "j.robertson@email.com", avatarUrl: null, lastVisit: "2026-03-18", consentStatus: "active", riskLevel: "high", adherence: 58, vitalityScore: 45 },
  { id: "3", firstName: "Anika", lastName: "Patel", email: "anika.patel@email.com", avatarUrl: null, lastVisit: "2026-03-17", consentStatus: "active", riskLevel: "moderate", adherence: 74, vitalityScore: 62 },
  { id: "4", firstName: "Marcus", lastName: "Thompson", email: "marcus.t@email.com", avatarUrl: null, lastVisit: "2026-03-15", consentStatus: "pending", riskLevel: "moderate", adherence: 67, vitalityScore: 55 },
  { id: "5", firstName: "Emily", lastName: "Zhao", email: "emily.zhao@email.com", avatarUrl: null, lastVisit: "2026-03-14", consentStatus: "active", riskLevel: "critical", adherence: 34, vitalityScore: 28 },
  { id: "6", firstName: "David", lastName: "Nguyen", email: "d.nguyen@email.com", avatarUrl: null, lastVisit: "2026-03-10", consentStatus: "pending", riskLevel: "low", adherence: 88, vitalityScore: 76 },
  { id: "7", firstName: "Olivia", lastName: "Garcia", email: "olivia.garcia@email.com", avatarUrl: null, lastVisit: "2026-03-08", consentStatus: "active", riskLevel: "low", adherence: 95, vitalityScore: 91 },
  { id: "8", firstName: "Rashid", lastName: "Al-Farsi", email: "rashid.af@email.com", avatarUrl: null, lastVisit: "2026-02-28", consentStatus: "expired", riskLevel: "high", adherence: 42, vitalityScore: 38 },
  { id: "9", firstName: "Catherine", lastName: "O'Brien", email: "c.obrien@email.com", avatarUrl: null, lastVisit: "2026-03-20", consentStatus: "active", riskLevel: "low", adherence: 89, vitalityScore: 82 },
  { id: "10", firstName: "Tyler", lastName: "Brooks", email: "tyler.b@email.com", avatarUrl: null, lastVisit: "2026-03-12", consentStatus: "active", riskLevel: "moderate", adherence: 71, vitalityScore: 60 },
  { id: "11", firstName: "Mei-Lin", lastName: "Chen", email: "meiling.chen@email.com", avatarUrl: null, lastVisit: "2026-02-20", consentStatus: "expired", riskLevel: "critical", adherence: 22, vitalityScore: 19 },
  { id: "12", firstName: "Jordan", lastName: "Williams", email: "j.williams@email.com", avatarUrl: null, lastVisit: "2026-03-16", consentStatus: "pending", riskLevel: "moderate", adherence: 63, vitalityScore: 51 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(first: string, last: string) {
  return `${first[0]}${last[0]}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

const riskBadge: Record<RiskLevel, "active" | "pending" | "warning" | "danger"> = {
  low: "active",
  moderate: "pending",
  high: "warning",
  critical: "danger",
};

const consentBadge: Record<ConsentStatus, "active" | "pending" | "danger"> = {
  active: "active",
  pending: "pending",
  expired: "danger",
};

function vitalityColor(score: number) {
  if (score > 70) return "text-portal-green";
  if (score >= 40) return "text-portal-yellow";
  return "text-rose";
}

function adherenceBarColor(pct: number) {
  if (pct >= 75) return "bg-portal-green";
  if (pct >= 50) return "bg-portal-yellow";
  return "bg-rose";
}

// ─── Filter Options ──────────────────────────────────────────────────────────

const riskOptions = [
  { value: "all", label: "All Risk Levels" },
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const consentOptions = [
  { value: "all", label: "All Consent" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "expired", label: "Expired" },
];

const visitOptions = [
  { value: "all", label: "All Visits" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function PatientsPage() {
  void useRouter(); // available for row navigation

  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [consentFilter, setConsentFilter] = useState("all");
  const [visitFilter, setVisitFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = PATIENTS;

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
      );
    }

    // Risk level
    if (riskFilter !== "all") {
      list = list.filter((p) => p.riskLevel === riskFilter);
    }

    // Consent
    if (consentFilter !== "all") {
      list = list.filter((p) => p.consentStatus === consentFilter);
    }

    // Last visit range
    if (visitFilter !== "all") {
      const days = parseInt(visitFilter, 10);
      list = list.filter((p) => daysSince(p.lastVisit) <= days);
    }

    return list;
  }, [search, riskFilter, consentFilter, visitFilter]);

  // ── Column Definitions ──────────────────────────────────────────────────

  const columns: Column<Patient>[] = [
    {
      key: "lastName",
      header: "Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar fallback={initials(row.firstName, row.lastName)} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {row.firstName} {row.lastName}
            </p>
            <p className="text-[11px] text-gray-500 truncate">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "lastVisit",
      header: "Last Visit",
      sortable: true,
      render: (row) => <span className="text-sm text-gray-300">{formatDate(row.lastVisit)}</span>,
    },
    {
      key: "consentStatus",
      header: "Consent",
      sortable: false,
      render: (row) => (
        <Badge variant={consentBadge[row.consentStatus]}>
          {row.consentStatus.charAt(0).toUpperCase() + row.consentStatus.slice(1)}
        </Badge>
      ),
    },
    {
      key: "riskLevel",
      header: "Risk Level",
      sortable: false,
      render: (row) => (
        <Badge variant={riskBadge[row.riskLevel]}>
          {row.riskLevel.charAt(0).toUpperCase() + row.riskLevel.slice(1)}
        </Badge>
      ),
    },
    {
      key: "adherence",
      header: "Adherence",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2 min-w-[120px]">
          <Progress value={row.adherence} color={adherenceBarColor(row.adherence)} className="flex-1" />
          <span className="text-xs text-gray-400 w-8 text-right">{row.adherence}%</span>
        </div>
      ),
    },
    {
      key: "vitalityScore",
      header: "Vitality",
      sortable: true,
      render: (row) => (
        <span className={`text-sm font-semibold ${vitalityColor(row.vitalityScore)}`}>
          {row.vitalityScore}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Link
          href={`/practitioner/patients/${row.id}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="ghost" size="sm" className="text-portal-green">
            View
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Patients</h1>
            <p className="text-gray-400 mt-1">Manage your patient roster</p>
          </div>
          <Button
            variant="secondary"
            size="md"
            className="!bg-portal-green/15 !text-portal-green !border-portal-green/30 hover:!bg-portal-green/25"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Patient
          </Button>
        </div>

        {/* ── Filters ─────────────────────────────────────────────────── */}
        <Card hover={false} className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patients..."
                className="w-full h-10 pl-9 pr-3 rounded-lg text-sm text-white placeholder:text-gray-600 outline-none transition-colors
                  bg-white/[0.04] border border-white/[0.08] focus:border-copper/50 focus:ring-1 focus:ring-copper/20"
              />
            </div>
            <div className="w-full md:w-44">
              <Select
                value={riskFilter}
                onValueChange={setRiskFilter}
                options={riskOptions}
                placeholder="Risk Level"
              />
            </div>
            <div className="w-full md:w-44">
              <Select
                value={consentFilter}
                onValueChange={setConsentFilter}
                options={consentOptions}
                placeholder="Consent Status"
              />
            </div>
            <div className="w-full md:w-44">
              <Select
                value={visitFilter}
                onValueChange={setVisitFilter}
                options={visitOptions}
                placeholder="Last Visit"
              />
            </div>
          </div>
        </Card>

        {/* ── Data Table ──────────────────────────────────────────────── */}
        <Card hover={false} className="overflow-hidden p-0">
          <DataTable<Patient>
            columns={columns}
            data={filtered}
            pageSize={10}
          />
        </Card>
      </div>
    </div>
  );
}
