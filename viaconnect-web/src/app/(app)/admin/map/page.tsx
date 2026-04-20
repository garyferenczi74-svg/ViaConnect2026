'use client';

// Prompt #100 Phase 5: admin MAP landing — network health heatmap.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Gavel, Search, AlertTriangle, Settings, LineChart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { NetworkHealthHeatmap } from '@/components/admin/map/NetworkHealthHeatmap';
import type { MAPComplianceScoreRow } from '@/lib/map/types';

export default function AdminMAPLandingPage() {
  const [scores, setScores] = useState<MAPComplianceScoreRow[]>([]);

  const refresh = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any;
    const { data } = await supabase
      .from('map_compliance_scores')
      .select('*')
      .eq('calculated_date', new Date().toISOString().slice(0, 10));
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    setScores(
      rows.map((r) => ({
        scoreId: r.score_id as string,
        practitionerId: r.practitioner_id as string,
        score: Number(r.score ?? 0),
        mapComplianceTier: r.map_compliance_tier as MAPComplianceScoreRow['mapComplianceTier'],
        yellowViolations90d: Number(r.yellow_violations_90d ?? 0),
        orangeViolations90d: Number(r.orange_violations_90d ?? 0),
        redViolations90d: Number(r.red_violations_90d ?? 0),
        blackViolations90d: Number(r.black_violations_90d ?? 0),
        daysSinceLastViolation: Number(r.days_since_last_violation ?? 0),
        selfReportedRemediations: Number(r.self_reported_remediations ?? 0),
        calculatedAt: String(r.calculated_at ?? ''),
        calculatedDate: String(r.calculated_date ?? ''),
      })),
    );
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const links = [
    { href: '/admin/map/violations', label: 'Violations queue', icon: AlertTriangle },
    { href: '/admin/map/investigation', label: 'Investigation queue', icon: Search },
    { href: '/admin/map/policies', label: 'Policy editor', icon: Settings },
    { href: '/admin/map/audit-log', label: 'Audit log', icon: Gavel },
    { href: '/admin/map/analytics', label: 'Analytics', icon: LineChart },
  ];

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Admin
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-2 flex items-center gap-2">
            <Gavel className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
            MAP Enforcement
          </h1>
          <p className="text-xs text-white/55 mt-1">
            Minimum Advertised Price monitoring across L1 + L2 SKUs. L3 (white-label) and L4 (custom formulations) are exempt.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] p-3 flex items-center gap-2"
            >
              <l.icon className="h-4 w-4 text-[#E8803A]" strokeWidth={1.5} />
              <span className="text-[11px] text-white/80">{l.label}</span>
            </Link>
          ))}
        </div>

        <NetworkHealthHeatmap rows={scores} />
      </div>
    </div>
  );
}
