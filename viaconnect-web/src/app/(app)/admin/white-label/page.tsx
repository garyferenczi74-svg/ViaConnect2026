'use client';

// Prompt #96 Phase 2: Admin white-label hub.
//
// Top-level landing for the white-label admin domain. Aggregates the key
// counters (enrolled practitioners, active production orders by bucket,
// pending compliance reviews, recent recalls) and routes deeper. The
// counters use the Phase 1 tables; pre-launch, most read zero, which is
// fine - the admin needs the surface to exist now so internal QA can
// validate the workflow.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Loader2,
  RefreshCw,
  Users,
  Factory,
  ClipboardCheck,
  AlertTriangle,
  Settings,
  ArrowRight,
} from 'lucide-react';

const supabase = createClient();

interface Counts {
  enrolledTotal: number;
  enrolledActive: number;
  productionByStatus: Record<string, number>;
  pendingReviews: number;
  openRecalls: number;
  catalogEligibleSkus: number;
}

const PRODUCTION_BUCKETS: Array<[string, string]> = [
  ['quote', 'Quotes'],
  ['labels_pending_review', 'Labels in review'],
  ['labels_approved_pending_deposit', 'Awaiting deposit'],
  ['deposit_paid', 'Deposit paid'],
  ['in_production', 'In production'],
  ['quality_control', 'QC'],
  ['final_payment_pending', 'Final payment pending'],
  ['shipped', 'Shipped'],
  ['delivered', 'Delivered'],
  ['canceled', 'Canceled'],
];

export default function WhiteLabelAdminHub() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    const sb = supabase as any;

    const [
      enrollAll, enrollActive,
      prodAll,
      reviewsPending,
      recallsOpen,
      catalogEligible,
    ] = await Promise.all([
      sb.from('white_label_enrollments').select('id', { count: 'exact', head: true }),
      sb.from('white_label_enrollments').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      sb.from('white_label_production_orders').select('status'),
      sb.from('white_label_compliance_reviews').select('id', { count: 'exact', head: true }).eq('decision', 'revision_requested'),
      sb.from('white_label_recalls').select('id', { count: 'exact', head: true }).neq('status', 'closed'),
      sb.from('white_label_catalog_config').select('id', { count: 'exact', head: true }).eq('is_white_label_eligible', true).eq('is_active', true),
    ]);

    const productionByStatus: Record<string, number> = {};
    for (const [statusId] of PRODUCTION_BUCKETS) productionByStatus[statusId] = 0;
    for (const row of (prodAll.data ?? []) as Array<{ status: string }>) {
      productionByStatus[row.status] = (productionByStatus[row.status] ?? 0) + 1;
    }

    setCounts({
      enrolledTotal: enrollAll.count ?? 0,
      enrolledActive: enrollActive.count ?? 0,
      productionByStatus,
      pendingReviews: reviewsPending.count ?? 0,
      openRecalls: recallsOpen.count ?? 0,
      catalogEligibleSkus: catalogEligible.count ?? 0,
    });
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-copper">Level 3</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">White-Label admin</h1>
          <p className="text-sm text-gray-400 mt-1">
            Practitioner enrollment, catalog, compliance review, production, inventory.
          </p>
        </div>
        <button
          onClick={reload}
          className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 self-start md:self-auto"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
        </button>
      </header>

      {loading && (
        <div className="text-sm text-gray-400 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
        </div>
      )}

      {!loading && counts && (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <Kpi label="Enrolled (total)"           value={counts.enrolledTotal.toLocaleString()}        Icon={Users} />
            <Kpi label="Enrolled (active)"          value={counts.enrolledActive.toLocaleString()}       Icon={Users} />
            <Kpi label="Pending compliance"         value={counts.pendingReviews.toLocaleString()}       Icon={ClipboardCheck} />
            <Kpi label="Open recalls"               value={counts.openRecalls.toLocaleString()}          Icon={AlertTriangle} />
          </section>

          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-3">Production orders by status</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {PRODUCTION_BUCKETS.map(([statusId, label]) => (
                <div key={statusId} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xl font-semibold">{(counts.productionByStatus[statusId] ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-3">Manage</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Tile
                href="/admin/white-label/catalog"
                title="Catalog configuration"
                blurb={`${counts.catalogEligibleSkus} SKUs currently eligible.`}
                Icon={Settings}
              />
              <Tile
                href="/admin/white-label/compliance/inbox"
                title="Compliance inbox"
                blurb="Review labels submitted by enrolled practitioners. (Phase 4)"
                Icon={ClipboardCheck}
              />
              <Tile
                href="/admin/white-label/production"
                title="Production tracking"
                blurb="Operations view of active manufacturing batches. (Phase 5)"
                Icon={Factory}
              />
              <Tile
                href="/admin/white-label/reporting"
                title="Reporting"
                blurb="Program health, finance, compliance metrics. (Phase 7)"
                Icon={ArrowRight}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, Icon }: { label: string; value: string; Icon: typeof Users }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <Icon className="w-4 h-4 text-copper mb-2" strokeWidth={1.5} />
      <p className="text-xl md:text-2xl font-semibold">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function Tile({ href, title, blurb, Icon }: { href: string; title: string; blurb: string; Icon: typeof Users }) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-copper/40 transition p-4"
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 text-copper shrink-0 mt-0.5" strokeWidth={1.5} />
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{blurb}</p>
        </div>
      </div>
    </Link>
  );
}
