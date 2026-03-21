"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Copy,
  Pencil,
  Eye,
  Leaf,
  Pill,
  Calendar,
  Clock,
} from "lucide-react";
import { Card, Badge, Button, Avatar } from "@/components/ui";
import { PageTransition, StaggerChild } from "@/lib/motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProtocolStatus = "Active" | "Draft" | "Completed" | "Paused";

type Protocol = {
  id: string;
  name: string;
  patient: string;
  patientInitials: string;
  status: ProtocolStatus;
  startDate: string;
  lastUpdated: string;
  herbs: number;
  supplements: number;
  tags: string[];
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const protocols: Protocol[] = [
  {
    id: "1",
    name: "Adrenal Recovery Protocol",
    patient: "Elena Vasquez",
    patientInitials: "EV",
    status: "Active",
    startDate: "2026-02-01",
    lastUpdated: "2026-03-19",
    herbs: 5,
    supplements: 3,
    tags: ["Adrenal Support", "Stress Management"],
  },
  {
    id: "2",
    name: "Gut Restoration Phase 2",
    patient: "Marcus Chen",
    patientInitials: "MC",
    status: "Active",
    startDate: "2026-01-15",
    lastUpdated: "2026-03-18",
    herbs: 4,
    supplements: 2,
    tags: ["Gut Health", "Microbiome"],
  },
  {
    id: "3",
    name: "Liver Detox Support",
    patient: "Sarah Kim",
    patientInitials: "SK",
    status: "Completed",
    startDate: "2025-11-10",
    lastUpdated: "2026-03-01",
    herbs: 3,
    supplements: 2,
    tags: ["Detoxification", "Liver Support"],
  },
  {
    id: "4",
    name: "Sleep Optimization",
    patient: "James Wright",
    patientInitials: "JW",
    status: "Draft",
    startDate: "",
    lastUpdated: "2026-03-20",
    herbs: 2,
    supplements: 1,
    tags: ["Sleep", "Nervous System"],
  },
  {
    id: "5",
    name: "Immune Resilience Program",
    patient: "Priya Patel",
    patientInitials: "PP",
    status: "Paused",
    startDate: "2026-01-20",
    lastUpdated: "2026-03-05",
    herbs: 4,
    supplements: 3,
    tags: ["Immune", "Antioxidant"],
  },
  {
    id: "6",
    name: "Thyroid Support Protocol",
    patient: "Lisa Monroe",
    patientInitials: "LM",
    status: "Active",
    startDate: "2026-02-10",
    lastUpdated: "2026-03-17",
    herbs: 3,
    supplements: 4,
    tags: ["Thyroid", "Endocrine"],
  },
  {
    id: "7",
    name: "Anxiety & Nervous System",
    patient: "David Santos",
    patientInitials: "DS",
    status: "Active",
    startDate: "2026-02-20",
    lastUpdated: "2026-03-21",
    herbs: 5,
    supplements: 2,
    tags: ["Anxiety", "Nervous System", "Adaptogens"],
  },
  {
    id: "8",
    name: "Joint & Inflammation",
    patient: "Karen O'Brien",
    patientInitials: "KO",
    status: "Draft",
    startDate: "",
    lastUpdated: "2026-03-20",
    herbs: 3,
    supplements: 3,
    tags: ["Inflammation", "Joint Health"],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusFilters: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "Active" },
  { label: "Draft", value: "Draft" },
  { label: "Completed", value: "Completed" },
  { label: "Paused", value: "Paused" },
];

const statusBadgeVariant: Record<ProtocolStatus, "active" | "neutral" | "info" | "warning"> = {
  Active: "active",
  Draft: "neutral",
  Completed: "info",
  Paused: "warning",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProtocolsPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filteredProtocols = useMemo(() => {
    let result = protocols;
    if (filter !== "all") {
      result = result.filter((p) => p.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.patient.toLowerCase().includes(q)
      );
    }
    return result;
  }, [filter, search]);

  return (
    <PageTransition className="min-h-screen bg-dark-bg px-6 py-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <StaggerChild className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Protocol Management</h1>
            <p className="mt-1 text-gray-400">
              Create, manage, and track naturopathic treatment protocols
            </p>
          </div>
          <Button className="bg-sage hover:bg-sage/80 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Protocol
          </Button>
        </StaggerChild>

        {/* Filter Pills */}
        <StaggerChild className="flex flex-wrap items-center gap-2 mb-5">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f.value
                  ? "bg-sage/20 text-sage border border-sage/30"
                  : "bg-white/[0.04] text-gray-400 border border-white/[0.08] hover:bg-white/[0.08] hover:text-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </StaggerChild>

        {/* Search */}
        <StaggerChild className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search protocols by name or patient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg text-sm text-white placeholder:text-gray-600 outline-none transition-colors bg-white/[0.04] border border-white/[0.08] focus:border-sage/50 focus:ring-1 focus:ring-sage/20"
          />
        </StaggerChild>

        {/* Protocol Cards */}
        {filteredProtocols.length === 0 ? (
          <Card hover={false} className="p-12 text-center">
            <p className="text-gray-400">No protocols match your search.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredProtocols.map((protocol) => (
              <Card key={protocol.id} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Left: Avatar + Info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <Avatar fallback={protocol.patientInitials} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-base font-semibold text-white truncate">
                          {protocol.name}
                        </h3>
                        <Badge variant={statusBadgeVariant[protocol.status]}>
                          {protocol.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5">{protocol.patient}</p>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
                        {protocol.startDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Started {protocol.startDate}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Updated {protocol.lastUpdated}
                        </span>
                        <span className="flex items-center gap-1">
                          <Leaf className="w-3 h-3 text-sage" />
                          {protocol.herbs} herbs
                        </span>
                        <span className="flex items-center gap-1">
                          <Pill className="w-3 h-3 text-copper" />
                          {protocol.supplements} supplements
                        </span>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {protocol.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-sage/10 text-sage border border-sage/15"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 sm:ml-4">
                    <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors" title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors" title="Duplicate">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
