"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Plus, Eye } from "lucide-react";
import {
  Card,
  Button,
  Badge,
  Select,
  DataTable,
  Avatar,
} from "@/components/ui";
import type { Column } from "@/components/ui";

// ─── Types ───────────────────────────────────────────────────────────────────

type Patient = {
  id: string;
  name: string;
  email: string;
  initials: string;
  constitutionalType: string;
  lastVisit: string;
  activeFormulas: number;
  compliance: number;
  status: string;
  [key: string]: unknown;
};

// ─── Mock Patients ───────────────────────────────────────────────────────────

const mockPatients: Patient[] = [
  { id: "p-001", name: "Elena Vasquez", email: "elena.v@email.com", initials: "EV", constitutionalType: "Vata-Pitta", lastVisit: "2026-03-19", activeFormulas: 3, compliance: 92, status: "active" },
  { id: "p-002", name: "Marcus Chen", email: "m.chen@email.com", initials: "MC", constitutionalType: "Kapha", lastVisit: "2026-03-18", activeFormulas: 2, compliance: 88, status: "active" },
  { id: "p-003", name: "Priya Sharma", email: "priya.s@email.com", initials: "PS", constitutionalType: "Pitta", lastVisit: "2026-03-15", activeFormulas: 4, compliance: 95, status: "active" },
  { id: "p-004", name: "James Whitfield", email: "j.whitfield@email.com", initials: "JW", constitutionalType: "Sanguine", lastVisit: "2026-03-14", activeFormulas: 1, compliance: 78, status: "active" },
  { id: "p-005", name: "Sana Al-Rashid", email: "sana.ar@email.com", initials: "SA", constitutionalType: "Melancholic", lastVisit: "2026-03-12", activeFormulas: 2, compliance: 91, status: "active" },
  { id: "p-006", name: "Tomoko Hayashi", email: "t.hayashi@email.com", initials: "TH", constitutionalType: "Vata", lastVisit: "2026-03-10", activeFormulas: 3, compliance: 86, status: "active" },
  { id: "p-007", name: "Derek Okafor", email: "d.okafor@email.com", initials: "DO", constitutionalType: "Choleric", lastVisit: "2026-02-28", activeFormulas: 1, compliance: 72, status: "inactive" },
  { id: "p-008", name: "Ingrid Larsson", email: "ingrid.l@email.com", initials: "IL", constitutionalType: "Phlegmatic", lastVisit: "2026-03-17", activeFormulas: 2, compliance: 97, status: "active" },
  { id: "p-009", name: "Rafael Dominguez", email: "r.dominguez@email.com", initials: "RD", constitutionalType: "Pitta-Kapha", lastVisit: "2026-03-06", activeFormulas: 0, compliance: 65, status: "inactive" },
  { id: "p-010", name: "Mei-Lin Wu", email: "meilin.w@email.com", initials: "MW", constitutionalType: "Vata-Kapha", lastVisit: "2026-03-20", activeFormulas: 5, compliance: 94, status: "active" },
];

// ─── Filter options ──────────────────────────────────────────────────────────

const constitutionalOptions = [
  { value: "all", label: "All Types" },
  { value: "Vata", label: "Vata" },
  { value: "Pitta", label: "Pitta" },
  { value: "Kapha", label: "Kapha" },
  { value: "Sanguine", label: "Sanguine" },
  { value: "Choleric", label: "Choleric" },
  { value: "Melancholic", label: "Melancholic" },
  { value: "Phlegmatic", label: "Phlegmatic" },
];

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function complianceColor(value: number) {
  if (value >= 90) return "text-portal-green";
  if (value >= 75) return "text-portal-yellow";
  return "text-rose";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NaturopathPatientsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = mockPatients.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase());
    const matchType =
      typeFilter === "all" || p.constitutionalType.toLowerCase().includes(typeFilter.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const columns: Column<Patient>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar fallback={row.initials} size="sm" />
          <div>
            <p className="text-sm font-medium text-white">{row.name}</p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "constitutionalType",
      header: "Constitutional Type",
      render: (row) => (
        <Badge variant="neutral">{row.constitutionalType}</Badge>
      ),
    },
    {
      key: "lastVisit",
      header: "Last Visit",
      sortable: true,
      render: (row) => <span className="text-gray-300">{formatDate(row.lastVisit)}</span>,
    },
    {
      key: "activeFormulas",
      header: "Active Formulas",
      render: (row) => <span className="text-gray-300">{row.activeFormulas}</span>,
    },
    {
      key: "compliance",
      header: "Compliance",
      render: (row) => (
        <span className={`font-semibold ${complianceColor(row.compliance)}`}>
          {row.compliance}%
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={row.status === "active" ? "active" : "neutral"}>
          {row.status === "active" ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <Link
          href={`/naturopath/patients/${row.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-sage hover:text-sage-light transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          View
        </Link>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-dark-bg px-6 py-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Patient Roster</h1>
            <p className="mt-1 text-gray-400">
              {mockPatients.length} patients &middot; {mockPatients.filter((p) => p.status === "active").length} active
            </p>
          </div>
          <Button className="bg-sage hover:bg-sage/80 text-white shadow-lg shadow-sage/20">
            <Plus className="w-4 h-4 mr-2" />
            Add Patient
          </Button>
        </div>

        {/* Search + Filters */}
        <Card hover={false} className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search patients by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-3 rounded-lg text-sm text-white placeholder:text-gray-600 outline-none transition-colors bg-white/[0.04] border border-white/[0.08] focus:border-sage/50 focus:ring-1 focus:ring-sage/20"
              />
            </div>
            <div className="w-48">
              <Select
                value={typeFilter}
                onValueChange={setTypeFilter}
                placeholder="Constitutional Type"
                options={constitutionalOptions}
              />
            </div>
            <div className="w-40">
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
                placeholder="Status"
                options={statusOptions}
              />
            </div>
          </div>
        </Card>

        {/* DataTable */}
        <DataTable<Patient> columns={columns} data={filtered} pageSize={10} />
      </div>
    </div>
  );
}
