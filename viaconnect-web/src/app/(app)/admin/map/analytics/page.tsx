'use client';

// Prompt #100 Phase 5: admin MAP analytics — network-level KPIs.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LineChart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Totals {
  totalPractitioners: number;
  avgScore: number;
  activeViolations: number;
  escalated30d: number;
  remediated30d: number;
}

export default function AdminAnalyticsPage() {
  const [totals, setTotals] = useState<Totals | null>(null);

  const refresh = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any;
    const [scoresResp, activeResp, esc30Resp, rem30Resp] = await Promise.all([
      supabase
        .from('map_compliance_scores')
        .select('score')
        .eq('calculated_date', new Date().toISOString().slice(0, 10)),
      supabase
        .from('map_violations')
        .select('violation_id', { count: 'exact', head: true })
        .in('status', ['active', 'notified']),
      supabase
        .from('map_violations')
        .select('violation_id', { count: 'exact', head: true })
        .eq('status', 'escalated')
        .gte('escalated_at', new Date(Date.now() - 30 * 86400_000).toISOString()),
      supabase
        .from('map_violations')
        .select('violation_id', { count: 'exact', head: true })
        .eq('status', 'remediated')
        .gte('remediated_at', new Date(Date.now() - 30 * 86400_000).toISOString()),
    ]);
    const scores = (scoresResp.data ?? []) as Array<{ score: number }>;
    setTotals({
      totalPractitioners: scores.length,
      avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + Number(b.score), 0) / scores.length) : 0,
      activeViolations: activeResp.count ?? 0,
      escalated30d: esc30Resp.count ?? 0,
      remediated30d: rem30Resp.count ?? 0,
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
        <Link href="/admin/map" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> MAP Enforcement
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <LineChart className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Network analytics
        </h1>

        {totals && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card label="Practitioners scored" value={String(totals.totalPractitioners)} />
            <Card label="Avg MAP score" value={String(totals.avgScore)} />
            <Card label="Active violations" value={String(totals.activeViolations)} />
            <Card label="Escalated 30d" value={String(totals.escalated30d)} />
            <Card label="Remediated 30d" value={String(totals.remediated30d)} />
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/65 mt-1">{label}</p>
    </div>
  );
}
