"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Eye, Loader2, ShieldCheck, Users, Inbox } from "lucide-react";
import {
  Card,
  Button,
  Badge,
  DataTable,
  Avatar,
} from "@/components/ui";
import type { Column } from "@/components/ui";
import { PageTransition, StaggerChild } from "@/lib/motion";
import { createClient } from "@/lib/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

type Patient = {
  shareId: string;
  id: string;
  name: string;
  email: string;
  initials: string;
  constitutionalType: string;
  bioScore: number | null;
  acceptedAt: string | null;
  sharedCount: number;
  status: "active";
  [key: string]: unknown;
};

interface SharedPatientRow {
  share_id: string;
  patient_id: string;
  full_name: string | null;
  email: string | null;
  constitutional_type: string | null;
  bio_optimization_score: number | string | null;
  accepted_at: string | null;
  share_supplements: boolean;
  share_bio_score: boolean;
  share_genetics: boolean;
  share_caq: boolean;
  share_wellness: boolean;
  share_peptides: boolean;
  share_labs: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initialsOf(name: string | null, fallback: string): string {
  if (!name) return fallback.slice(0, 2).toUpperCase();
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function bioScoreColor(value: number | null): string {
  if (value === null) return "text-gray-500";
  if (value >= 80) return "text-portal-green";
  if (value >= 60) return "text-portal-yellow";
  return "text-rose";
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NaturopathPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error: rpcError } = await (supabase as any).rpc(
        "provider_list_shared_patients",
      );
      if (cancelled) return;
      if (rpcError) {
        setError(rpcError.message ?? "Could not load patients.");
        setLoading(false);
        return;
      }
      const rows = (data as SharedPatientRow[]) ?? [];
      setPatients(
        rows.map((r) => {
          const sharedCount = [
            r.share_supplements,
            r.share_bio_score,
            r.share_genetics,
            r.share_caq,
            r.share_wellness,
            r.share_peptides,
            r.share_labs,
          ].filter(Boolean).length;
          const score =
            r.bio_optimization_score === null ||
            r.bio_optimization_score === undefined
              ? null
              : Number(r.bio_optimization_score);
          return {
            shareId: r.share_id,
            id: r.patient_id,
            name: r.full_name ?? r.email ?? "Unnamed patient",
            email: r.email ?? "",
            initials: initialsOf(r.full_name, r.email ?? "P"),
            constitutionalType: r.constitutional_type ?? "—",
            bioScore: score,
            acceptedAt: r.accepted_at,
            sharedCount,
            status: "active",
          };
        }),
      );
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = patients.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.constitutionalType.toLowerCase().includes(q)
    );
  });

  const columns: Column<Patient>[] = [
    {
      key: "name",
      header: "Patient",
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
      header: "Constitutional",
      render: (row) => (
        <Badge variant="neutral">{row.constitutionalType}</Badge>
      ),
    },
    {
      key: "bioScore",
      header: "Bio Score",
      sortable: true,
      render: (row) => (
        <span className={`font-semibold ${bioScoreColor(row.bioScore)}`}>
          {row.bioScore !== null ? Math.round(row.bioScore) : "—"}
        </span>
      ),
    },
    {
      key: "sharedCount",
      header: "Shared",
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-xs text-gray-300">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2DA5A0]" strokeWidth={1.5} />
          {row.sharedCount}/7 categories
        </span>
      ),
    },
    {
      key: "acceptedAt",
      header: "Shared since",
      sortable: true,
      render: (row) => (
        <span className="text-gray-300">{formatDate(row.acceptedAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <Link
          href={`/naturopath/patients/${row.id}/protocol`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-sage hover:text-sage-light transition-colors"
        >
          <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
          Open protocol
        </Link>
      ),
    },
  ];

  return (
    <PageTransition className="min-h-screen bg-dark-bg px-6 py-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <StaggerChild className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Patient Roster</h1>
            <p className="mt-1 text-gray-400">
              {patients.length} {patients.length === 1 ? "patient has" : "patients have"} shared their protocol with you
            </p>
          </div>
          <Link href="/naturopath/accept-share">
            <Button className="bg-sage hover:bg-sage/80 text-white shadow-lg shadow-sage/20">
              <ShieldCheck className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Accept invite code
            </Button>
          </Link>
        </StaggerChild>

        {/* Search */}
        <StaggerChild>
          <Card hover={false} className="p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search by name, email, or constitutional type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-3 rounded-lg text-sm text-white placeholder:text-gray-600 outline-none transition-colors bg-white/[0.04] border border-white/[0.08] focus:border-sage/50 focus:ring-1 focus:ring-sage/20"
              />
            </div>
          </Card>
        </StaggerChild>

        {/* Body */}
        {loading ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-12 text-center">
            <Loader2 className="w-6 h-6 text-white/40 mx-auto animate-spin" strokeWidth={1.5} />
            <p className="text-sm text-white/40 mt-3">Loading shared patients…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[#B75E18]/30 bg-[#B75E18]/10 p-6 text-center">
            <p className="text-sm text-[#F5B681]">{error}</p>
          </div>
        ) : patients.length === 0 ? (
          <EmptyState />
        ) : (
          <StaggerChild>
            <DataTable<Patient> columns={columns} data={filtered} pageSize={10} />
          </StaggerChild>
        )}
      </div>
    </PageTransition>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-12 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
        <Inbox className="w-6 h-6 text-white/30" strokeWidth={1.5} />
      </div>
      <p className="text-sm text-white/70 mb-1">No shared patients yet</p>
      <p className="text-xs text-white/40 mb-5 max-w-sm mx-auto">
        When a patient sends you an invite code, accept it on the share page and they'll appear here.
      </p>
      <Link
        href="/naturopath/accept-share"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2DA5A0] hover:bg-[#2DA5A0]/85 text-white text-sm font-semibold transition-colors"
      >
        <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
        Accept an invite code
      </Link>
    </div>
  );
}
