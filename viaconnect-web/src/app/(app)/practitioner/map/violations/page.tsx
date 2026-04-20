'use client';

// Prompt #100 Phase 4: practitioner MAP violations page.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ActiveViolationsList } from '@/components/practitioner/map/ActiveViolationsList';
import { MAPComplianceScoreCard } from '@/components/practitioner/map/MAPComplianceScoreCard';
import { RemediationHistoryTimeline } from '@/components/practitioner/map/RemediationHistoryTimeline';
import {
  fetchComplianceScoreTrend,
  fetchMyActiveViolations,
  fetchMyComplianceScore,
  type ActiveViolationView,
} from '@/lib/map/queries-client';
import type { MAPComplianceScoreRow, MAPViolationRow } from '@/lib/map/types';

export default function PractitionerMAPViolationsPage() {
  const [active, setActive] = useState<ActiveViolationView[]>([]);
  const [score, setScore] = useState<MAPComplianceScoreRow | null>(null);
  const [trend, setTrend] = useState<Array<{ calculatedDate: string; score: number }>>([]);
  const [history, setHistory] = useState<MAPViolationRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    try {
      const [a, s, t, h] = await Promise.all([
        fetchMyActiveViolations(supabase),
        fetchMyComplianceScore(supabase),
        fetchComplianceScoreTrend(supabase),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as unknown as any)
          .from('map_violations')
          .select('*')
          .gte('created_at', new Date(Date.now() - 90 * 86400_000).toISOString())
          .order('created_at', { ascending: false })
          .limit(100),
      ]);
      setActive(a);
      setScore(s);
      setTrend(t);
      const rows = (h.data ?? []) as Array<Record<string, unknown>>;
      setHistory(
        rows.map((r) => ({
          violationId: r.violation_id as string,
          observationId: r.observation_id as string,
          productId: r.product_id as string,
          practitionerId: (r.practitioner_id as string | null) ?? null,
          policyId: r.policy_id as string,
          severity: r.severity as MAPViolationRow['severity'],
          observedPriceCents: Number(r.observed_price_cents ?? 0),
          mapPriceCents: Number(r.map_price_cents ?? 0),
          discountPctBelowMap: Number(r.discount_pct_below_map ?? 0),
          status: r.status as MAPViolationRow['status'],
          gracePeriodEndsAt: String(r.grace_period_ends_at ?? ''),
          remediationDeadlineAt: String(r.remediation_deadline_at ?? ''),
          notifiedAt: (r.notified_at as string | null) ?? null,
          acknowledgedAt: (r.acknowledged_at as string | null) ?? null,
          remediatedAt: (r.remediated_at as string | null) ?? null,
          escalatedAt: (r.escalated_at as string | null) ?? null,
          dismissedAt: (r.dismissed_at as string | null) ?? null,
          createdAt: String(r.created_at ?? ''),
        })),
      );
    } catch (err) {
      console.error('practitioner map page: load failed', err);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <Link
            href="/practitioner/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-2 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
            MAP Compliance
          </h1>
          <p className="text-xs text-white/55 mt-1">
            Minimum Advertised Price monitoring for your listings on verified channels.
            Yellow is monitored; Orange + Red + Black require remediation within the listed grace window.
          </p>
        </div>

        <MAPComplianceScoreCard score={score} trend={trend} />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">Active violations</h2>
          {loaded ? <ActiveViolationsList violations={active} onRefresh={refresh} /> : (
            <p className="text-xs text-white/60">Loading...</p>
          )}
        </section>

        <RemediationHistoryTimeline rows={history.filter((r) => r.status === 'remediated' || r.status === 'dismissed')} />

        <a
          href="/docs/map-policy.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] text-[#2DA5A0] hover:underline"
        >
          <FileText className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" /> MAP Policy Document
        </a>
      </div>
    </div>
  );
}
