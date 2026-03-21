"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, Button, Badge, Avatar, DataTable } from "@/components/ui";
import type { Column } from "@/components/ui";
import { Plus, Archive, CheckCircle, Search } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type ProtocolStatus = "draft" | "pending" | "active" | "completed";

type Protocol = {
  id: string;
  patientName: string;
  patientInitials: string;
  protocolName: string;
  status: ProtocolStatus;
  createdAt: string;
  updatedAt: string;
  productsCount: number;
};

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_PROTOCOLS: Protocol[] = [
  {
    id: "p1",
    patientName: "Sarah Mitchell",
    patientInitials: "SM",
    protocolName: "MTHFR+ Methylation Support",
    status: "active",
    createdAt: "2026-03-01",
    updatedAt: "2026-03-18",
    productsCount: 4,
  },
  {
    id: "p2",
    patientName: "James Rodriguez",
    patientInitials: "JR",
    protocolName: "COMT+ Optimization Protocol",
    status: "active",
    createdAt: "2026-02-14",
    updatedAt: "2026-03-15",
    productsCount: 3,
  },
  {
    id: "p3",
    patientName: "Emily Chen",
    patientInitials: "EC",
    protocolName: "NAD+ Recovery Program",
    status: "completed",
    createdAt: "2026-01-10",
    updatedAt: "2026-03-10",
    productsCount: 5,
  },
  {
    id: "p4",
    patientName: "Michael Torres",
    patientInitials: "MT",
    protocolName: "CYP1A2 Detox & Focus",
    status: "pending",
    createdAt: "2026-03-12",
    updatedAt: "2026-03-12",
    productsCount: 3,
  },
  {
    id: "p5",
    patientName: "Lisa Park",
    patientInitials: "LP",
    protocolName: "VDR Vitamin D3 Protocol",
    status: "draft",
    createdAt: "2026-03-19",
    updatedAt: "2026-03-19",
    productsCount: 2,
  },
  {
    id: "p6",
    patientName: "David Nguyen",
    patientInitials: "DN",
    protocolName: "Full Methylation Reset (30-day)",
    status: "active",
    createdAt: "2026-02-20",
    updatedAt: "2026-03-17",
    productsCount: 6,
  },
  {
    id: "p7",
    patientName: "Rachel Adams",
    patientInitials: "RA",
    protocolName: "BLAST+ Performance Stack",
    status: "pending",
    createdAt: "2026-03-14",
    updatedAt: "2026-03-14",
    productsCount: 4,
  },
  {
    id: "p8",
    patientName: "Kevin O'Brien",
    patientInitials: "KO",
    protocolName: "SHRED+ Weight Management",
    status: "draft",
    createdAt: "2026-03-20",
    updatedAt: "2026-03-20",
    productsCount: 3,
  },
  {
    id: "p9",
    patientName: "Amanda Foster",
    patientInitials: "AF",
    protocolName: "PeptideIQ Longevity Protocol",
    status: "completed",
    createdAt: "2025-12-05",
    updatedAt: "2026-02-28",
    productsCount: 5,
  },
  {
    id: "p10",
    patientName: "Carlos Mendez",
    patientInitials: "CM",
    protocolName: "CannabisIQ Pain Management",
    status: "draft",
    createdAt: "2026-03-21",
    updatedAt: "2026-03-21",
    productsCount: 2,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_FILTERS = ["All", "Draft", "Pending", "Active", "Completed"] as const;

const statusBadgeVariant: Record<ProtocolStatus, "neutral" | "pending" | "active" | "info"> = {
  draft: "neutral",
  pending: "pending",
  active: "active",
  completed: "info",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ProtocolsPage() {
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter + search
  const filtered = useMemo(() => {
    let list = MOCK_PROTOCOLS;
    if (activeFilter !== "All") {
      list = list.filter((p) => p.status === activeFilter.toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.patientName.toLowerCase().includes(q) ||
          p.protocolName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeFilter, search]);

  // Selection helpers
  const allSelected = filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id));

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // DataTable columns with checkbox column prepended
  const columns: Column<Protocol>[] = [
    {
      key: "_select",
      header: "",
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={() => toggleOne(row.id)}
          className="w-4 h-4 rounded border-white/20 bg-white/[0.04] accent-portal-green cursor-pointer"
        />
      ),
    },
    {
      key: "patientName",
      header: "Patient",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar fallback={row.patientInitials} size="sm" />
          <span className="font-medium text-white">{row.patientName}</span>
        </div>
      ),
    },
    {
      key: "protocolName",
      header: "Protocol Name",
      sortable: true,
      render: (row) => <span className="text-gray-200">{row.protocolName}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <Badge variant={statusBadgeVariant[row.status]}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      render: (row) => <span className="text-gray-400">{formatDate(row.createdAt)}</span>,
    },
    {
      key: "updatedAt",
      header: "Last Updated",
      sortable: true,
      render: (row) => <span className="text-gray-400">{formatDate(row.updatedAt)}</span>,
    },
    {
      key: "productsCount",
      header: "Products",
      render: (row) => (
        <span className="text-gray-300 tabular-nums">{row.productsCount}</span>
      ),
    },
    {
      key: "_actions",
      header: "Actions",
      render: () => (
        <div className="flex items-center gap-2">
          <button className="text-xs text-portal-green hover:text-portal-green/80 font-medium transition-colors">
            View
          </button>
          <button className="text-xs text-gray-500 hover:text-gray-300 font-medium transition-colors">
            Archive
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Protocols</h1>
            <p className="text-gray-400 mt-1">
              Manage supplement protocols for your patients
            </p>
          </div>
          <Link href="/practitioner/protocols/builder">
            <Button size="md" className="gap-2 !bg-portal-green/20 !text-portal-green border border-portal-green/30 hover:!bg-portal-green/30 !shadow-none">
              <Plus className="w-4 h-4" />
              New Protocol
            </Button>
          </Link>
        </div>

        {/* Filter Row */}
        <Card hover={false} className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Status filter pills */}
            <div className="flex gap-2 flex-wrap">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setActiveFilter(filter);
                    setSelectedIds(new Set());
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                    activeFilter === filter
                      ? "bg-portal-green/20 text-portal-green border border-portal-green/30"
                      : "text-gray-400 hover:text-white hover:bg-white/[0.05] border border-transparent"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64 sm:ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search protocols..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg text-sm text-white placeholder:text-gray-600 outline-none transition-colors bg-white/[0.04] border border-white/[0.08] focus:border-portal-green/50 focus:ring-1 focus:ring-portal-green/20"
              />
            </div>
          </div>
        </Card>

        {/* Select All checkbox row */}
        <div className="flex items-center gap-3 px-1">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="w-4 h-4 rounded border-white/20 bg-white/[0.04] accent-portal-green cursor-pointer"
          />
          <span className="text-xs text-gray-500">
            {selectedIds.size > 0
              ? `${selectedIds.size} selected`
              : "Select all"}
          </span>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <Card hover={false} className="p-3 border-portal-green/20">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-300 mr-2">
                {selectedIds.size} protocol{selectedIds.size > 1 ? "s" : ""} selected
              </span>
              <Button
                size="sm"
                className="gap-1.5 !bg-portal-green/20 !text-portal-green border border-portal-green/30 hover:!bg-portal-green/30 !shadow-none"
                onClick={() => setSelectedIds(new Set())}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Approve Selected
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5"
                onClick={() => setSelectedIds(new Set())}
              >
                <Archive className="w-3.5 h-3.5" />
                Archive Selected
              </Button>
            </div>
          </Card>
        )}

        {/* Data Table */}
        <DataTable<Protocol>
          columns={columns}
          data={filtered as unknown as (Protocol & Record<string, unknown>)[]}
          pageSize={10}
        />
      </div>
    </div>
  );
}
