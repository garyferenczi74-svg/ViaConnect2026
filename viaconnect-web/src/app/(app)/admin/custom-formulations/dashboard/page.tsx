'use client';

// Prompt #97 Phase 7.6: Level 4 admin dashboard.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  AlertTriangle,
  ArrowLeft,
  FlaskConical,
  Library,
  LineChart,
  Users,
} from 'lucide-react';

const supabase = createClient();

interface DashboardMetrics {
  enrollmentCount: number;
  activeEnrollmentCount: number;
  formulationsByStatus: Record<string, number>;
  approvedFormulationsCount: number;
  ingredientLibraryTotal: number;
  ingredientLibraryAvailable: number;
  pendingReviews: number;
  developmentFeesRevenueCents: number;
}

const STATUS_DISPLAY: Array<{ key: string; label: string; color: string }> = [
  { key: 'draft', label: 'Drafts', color: 'bg-white/[0.08] text-white/70' },
  { key: 'ready_for_review', label: 'Ready for review', color: 'bg-amber-500/15 text-amber-300' },
  { key: 'under_medical_review', label: 'Under medical review', color: 'bg-amber-500/15 text-amber-300' },
  { key: 'under_regulatory_review', label: 'Under regulatory review', color: 'bg-amber-500/15 text-amber-300' },
  { key: 'revision_requested', label: 'Revision requested', color: 'bg-red-500/15 text-red-300' },
  { key: 'approved_pending_development_fee', label: 'Approved, fee pending', color: 'bg-sky-500/15 text-sky-300' },
  { key: 'approved_production_ready', label: 'Production ready', color: 'bg-emerald-500/15 text-emerald-300' },
  { key: 'rejected', label: 'Rejected', color: 'bg-red-500/15 text-red-300' },
];

export default function Level4DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  const refresh = useCallback(async () => {
    const [
      enrollmentsResp,
      activeEnrollResp,
      formulationsResp,
      libraryTotalResp,
      libraryAvailableResp,
      pendingResp,
      feesResp,
    ] = await Promise.all([
      supabase.from('level_4_enrollments').select('id', { count: 'exact', head: true }),
      supabase
        .from('level_4_enrollments')
        .select('id', { count: 'exact', head: true })
        .in('status', ['eligibility_verified', 'formulation_development', 'active']),
      supabase.from('custom_formulations').select('status'),
      supabase.from('ingredient_library').select('id', { count: 'exact', head: true }),
      supabase
        .from('ingredient_library')
        .select('id', { count: 'exact', head: true })
        .eq('is_available_for_custom_formulation', true),
      supabase
        .from('custom_formulations')
        .select('id', { count: 'exact', head: true })
        .in('status', ['ready_for_review', 'under_medical_review', 'under_regulatory_review']),
      supabase
        .from('custom_formulation_development_fees')
        .select('total_cents, paid_at'),
    ]);

    const statusGroups: Record<string, number> = {};
    for (const row of (formulationsResp.data ?? []) as Array<{ status: string }>) {
      statusGroups[row.status] = (statusGroups[row.status] ?? 0) + 1;
    }

    const fees = (feesResp.data ?? []) as Array<{ total_cents: number; paid_at: string | null }>;
    const revenue = fees
      .filter((f) => f.paid_at !== null)
      .reduce((sum, f) => sum + Number(f.total_cents), 0);

    setMetrics({
      enrollmentCount: enrollmentsResp.count ?? 0,
      activeEnrollmentCount: activeEnrollResp.count ?? 0,
      formulationsByStatus: statusGroups,
      approvedFormulationsCount: statusGroups['approved_production_ready'] ?? 0,
      ingredientLibraryTotal: libraryTotalResp.count ?? 0,
      ingredientLibraryAvailable: libraryAvailableResp.count ?? 0,
      pendingReviews: pendingResp.count ?? 0,
      developmentFeesRevenueCents: revenue,
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!metrics) {
    return (
      <div className="min-h-screen bg-[#0B1520] text-white p-8">
        <p className="text-sm text-white/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Admin
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-2 flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
            Level 4 Custom Formulations
          </h1>
          <p className="text-xs text-white/55 mt-1">
            Program health. Launch phase: <span className="text-[#2DA5A0]">custom_formulations_2029</span>
          </p>
        </div>

        <div className="grid sm:grid-cols-4 gap-3">
          <MetricCard
            icon={Users}
            label="Enrolled practitioners"
            value={String(metrics.enrollmentCount)}
            sub={`${metrics.activeEnrollmentCount} active`}
          />
          <MetricCard
            icon={FlaskConical}
            label="Approved formulations"
            value={String(metrics.approvedFormulationsCount)}
            sub={`${metrics.pendingReviews} in review`}
          />
          <MetricCard
            icon={Library}
            label="Ingredient library"
            value={`${metrics.ingredientLibraryAvailable} / ${metrics.ingredientLibraryTotal}`}
            sub="available / total"
          />
          <MetricCard
            icon={LineChart}
            label="Dev-fee revenue (lifetime)"
            value={`$${(metrics.developmentFeesRevenueCents / 100).toFixed(0)}`}
            sub="paid dev + medical review fees"
          />
        </div>

        <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
          <h2 className="text-sm font-semibold mb-3">Formulations by status</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {STATUS_DISPLAY.map((s) => {
              const count = metrics.formulationsByStatus[s.key] ?? 0;
              return (
                <div
                  key={s.key}
                  className="flex items-center justify-between bg-white/[0.04] rounded-lg px-3 py-2"
                >
                  <span className="text-xs text-white/75">{s.label}</span>
                  <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${s.color}`}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-2">
          <h2 className="text-sm font-semibold">Quick links</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            <Link
              href="/admin/custom-formulations/library"
              className="block rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2 text-xs"
            >
              Ingredient library management
            </Link>
            <Link
              href="/admin/governance/proposals"
              className="block rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2 text-xs"
            >
              Pricing governance (l4_* domains)
            </Link>
          </div>
        </section>

        <p className="text-[11px] text-white/40 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} />
          Launch-phase activation of custom_formulations_2029 requires structural-tier
          governance proposal (board approval) per Prompt #95 decision rights.
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className="h-4 w-4 text-[#E8803A]" strokeWidth={1.5} />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/65 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-white/45 mt-1">{sub}</p>}
    </div>
  );
}
