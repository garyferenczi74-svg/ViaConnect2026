'use client';

// Prompt #101 Phase 5: Phase 2 source-grouped investigation queue.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PHASE_2_SOURCES, type Phase2Source } from '@/lib/map/phase2/sources';
import { SEVERITY_TONE } from '@/lib/map/severity';
import type { MAPSeverity } from '@/lib/map/types';
import { formatPriceFromCents } from '@/lib/pricing/format';

interface Observation {
  observation_id: string;
  source: Phase2Source;
  source_url: string;
  observed_price_cents: number;
  observer_confidence: number;
  practitioner_confidence: number | null;
  observed_at: string;
  post_context_storage_path: string | null;
  is_flash_sale: boolean;
}

interface Violation {
  violation_id: string;
  observation_id: string;
  severity: MAPSeverity;
  status: string;
}

export default function AdminPhase2InvestigationPage() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);

  const refresh = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as unknown as any;
    const [obsResp, vioResp] = await Promise.all([
      supabase
        .from('map_price_observations')
        .select('observation_id, source, source_url, observed_price_cents, observer_confidence, practitioner_confidence, observed_at, post_context_storage_path, is_flash_sale')
        .eq('phase', 2)
        .order('observed_at', { ascending: false })
        .limit(200),
      supabase
        .from('map_violations')
        .select('violation_id, observation_id, severity, status')
        .eq('status', 'investigating')
        .limit(200),
    ]);
    setObservations((obsResp.data ?? []) as Observation[]);
    setViolations((vioResp.data ?? []) as Violation[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const grouped = useMemo(() => {
    const map = new Map<Phase2Source, Observation[]>();
    for (const o of observations) {
      const cur = map.get(o.source) ?? [];
      cur.push(o);
      map.set(o.source, cur);
    }
    return map;
  }, [observations]);

  const violationByObsId = useMemo(() => {
    const m = new Map<string, Violation>();
    for (const v of violations) m.set(v.observation_id, v);
    return m;
  }, [violations]);

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
        <Link href="/admin/map" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> MAP Enforcement
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Search className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Phase 2 investigation
        </h1>
        <p className="text-xs text-white/55">
          Social + marketplace observations awaiting triage. Red or Black severity from Phase 2 sources stays in investigating status until admin review confirms attribution.
        </p>

        {Array.from(grouped.entries()).map(([source, obs]) => (
          <section key={source} className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">{PHASE_2_SOURCES[source].displayName}</h2>
              <span className="text-[10px] text-white/55">{obs.length} observations</span>
            </div>
            <ul className="space-y-2">
              {obs.slice(0, 20).map((o) => {
                const v = violationByObsId.get(o.observation_id);
                return (
                  <li key={o.observation_id} className="rounded-lg bg-white/[0.04] p-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {v && (
                        <span className={`text-[10px] font-semibold rounded-md px-1.5 py-0.5 border ${SEVERITY_TONE[v.severity]}`}>
                          {v.severity.toUpperCase()}
                        </span>
                      )}
                      <span className="text-xs text-white/80">{formatPriceFromCents(o.observed_price_cents)}</span>
                      <span className="text-[10px] text-white/50">
                        obs {o.observer_confidence}% / prac {o.practitioner_confidence ?? '-'}%
                      </span>
                      {o.is_flash_sale && <span className="text-[10px] text-amber-300">flash sale</span>}
                    </div>
                    <a href={o.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#2DA5A0] hover:underline">
                      Open source
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {observations.length === 0 && (
          <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4">
            <p className="text-xs text-white/60">No Phase 2 observations yet. Monitors will populate as credentials land in Vault.</p>
          </section>
        )}
      </div>
    </div>
  );
}
