'use client';

// Prompt #99 Phase 1 revenue scaffold + Prompt #100 Phase 6 MAP pricing-status section.
// Revenue KPIs remain blocked on whitelabel_orders (#96),
// referral_commissions (#98), and practitioner_transactions. The MAP
// pricing-status section populates once L1/L2 products exist in the
// catalog and a MAP policy is defined.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LineChart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SherlockInsightCard } from '@/components/practitioner/analytics/SherlockInsightCard';
import { MedicalDisclaimer } from '@/components/practitioner/analytics/MedicalDisclaimer';
import { DependencyPendingBanner } from '@/components/practitioner/analytics/DependencyPendingBanner';
import { MAPStatusPill } from '@/components/practitioner/map/MAPStatusPill';
import { getSherlockStubInsight } from '@/lib/practitioner-analytics/sherlock-stub';
import { PRACTITIONER_PENDING_REASON } from '@/lib/practitioner-analytics/constants';
import {
  fetchMyProductMAPStatus,
  type ProductMAPStatus,
} from '@/lib/map/queries-client';

export default function RevenueAnalyticsPage() {
  const insight = getSherlockStubInsight('revenue');
  const [statuses, setStatuses] = useState<ProductMAPStatus[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const loose = supabase as unknown as any;
      const { data: products } = await loose.from('products').select('id').eq('active', true).limit(25);
      const ids = ((products ?? []) as Array<{ id: string }>).map((p) => p.id);
      if (ids.length === 0) {
        setStatuses([]);
      } else {
        setStatuses(await fetchMyProductMAPStatus(supabase, ids));
      }
    } catch (err) {
      console.error('revenue page: MAP status load failed', err);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <Link
            href="/practitioner/analytics"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Analytics
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-2 flex items-center gap-2">
            <LineChart className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
            Revenue & Business Intelligence
          </h1>
          <p className="text-xs text-white/55 mt-1">
            MRR, 12-month timeline, tier mix, projection fan, tax summary. MAP pricing status for L1 + L2 products is live below.
          </p>
        </div>

        <DependencyPendingBanner pendingReason={PRACTITIONER_PENDING_REASON.revenue} />

        {loaded && statuses.length > 0 && (
          <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
            <h2 className="text-sm font-semibold mb-3">Pricing status</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-white/50 text-[10px] uppercase tracking-wide">
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left font-semibold py-2 px-2">SKU</th>
                    <th className="text-left font-semibold py-2 px-2">Product</th>
                    <th className="text-left font-semibold py-2 px-2">Tier</th>
                    <th className="text-left font-semibold py-2 px-2">MAP Status</th>
                  </tr>
                </thead>
                <tbody>
                  {statuses.map((s) => (
                    <tr key={s.productId} className="border-b border-white/[0.04]">
                      <td className="py-2 px-2 font-mono text-[10px] text-white/70">{s.productSku ?? '—'}</td>
                      <td className="py-2 px-2 text-white">{s.productName ?? '—'}</td>
                      <td className="py-2 px-2 text-white/60">{s.pricingTier}</td>
                      <td className="py-2 px-2">
                        <MAPStatusPill
                          state={s.pillState}
                          violationId={s.violationId}
                          exemptLabel={s.exemptLabel ?? undefined}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <SherlockInsightCard insight={insight} />
        <MedicalDisclaimer />
      </div>
    </div>
  );
}
