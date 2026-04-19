'use client';

// Prompt #94 Phase 6.5: Archetypes analytics page.
// Shows the 7-archetype reference table + the live distribution of primary
// archetype assignments (counts + percentage bars). LTV/CAC per archetype
// is reachable via the LTV page with segment_type=archetype; we link there.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  PieChart,
  ExternalLink,
} from 'lucide-react';

const supabase = createClient();

interface DefRow {
  id: string;
  display_name: string;
  short_description: string;
  expected_ltv_multiplier: number;
  expected_churn_multiplier: number;
  typical_tier_preference: string | null;
  typical_genex360_tier: string | null;
  sort_order: number;
}

interface AssignmentRow {
  archetype_id: string;
}

const fmtMult = (n: number | null) =>
  n == null ? 'n/a' : `${n.toFixed(2)}x`;

export default function ArchetypesPage() {
  const [defs, setDefs] = useState<DefRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    const [{ data: d }, { data: a }] = await Promise.all([
      (supabase as any)
        .from('archetype_definitions')
        .select('id, display_name, short_description, expected_ltv_multiplier, expected_churn_multiplier, typical_tier_preference, typical_genex360_tier, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      (supabase as any)
        .from('customer_archetypes')
        .select('archetype_id')
        .eq('is_primary', true),
    ]);
    setDefs((d ?? []) as DefRow[]);
    setAssignments((a ?? []) as AssignmentRow[]);
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  const distribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of assignments) counts.set(a.archetype_id, (counts.get(a.archetype_id) ?? 0) + 1);
    const total = assignments.length;
    return { counts, total };
  }, [assignments]);

  return (
    <div className="min-h-screen bg-[#0E1A30] text-white px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <Link href="/admin/analytics" className="text-xs text-gray-400 hover:text-copper inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> Analytics
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Archetypes</h1>
            <p className="text-sm text-gray-400 mt-1">
              7 customer archetypes; primary assignment distribution + reference economics.
            </p>
          </div>
          <button
            onClick={reload}
            className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 self-start md:self-auto"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Refresh
          </button>
        </div>
      </header>

      {loading && (
        <div className="text-sm text-gray-400 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Loading
        </div>
      )}

      {!loading && (
        <>
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-3">
              Distribution; total assigned: {distribution.total.toLocaleString()}
            </h2>
            <div className="space-y-2">
              {defs.map((d) => {
                const count = distribution.counts.get(d.id) ?? 0;
                const pct = distribution.total > 0 ? (count / distribution.total) * 100 : 0;
                return (
                  <div key={d.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-medium">{d.display_name}</span>
                      <span className="text-gray-400">
                        {count.toLocaleString()} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 rounded bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full bg-copper transition-all"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-3">Reference economics</h2>
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-400">
                  <tr>
                    <th className="text-left px-3 py-2">Archetype</th>
                    <th className="text-left px-3 py-2">Description</th>
                    <th className="text-left px-3 py-2">Tier</th>
                    <th className="text-left px-3 py-2">GeneX360</th>
                    <th className="text-right px-3 py-2">LTV mult</th>
                    <th className="text-right px-3 py-2">Churn mult</th>
                    <th className="text-right px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {defs.map((d) => (
                    <tr key={d.id} className="border-t border-white/5">
                      <td className="px-3 py-2 font-medium">
                        <span className="inline-flex items-center gap-2">
                          <PieChart className="w-3.5 h-3.5 text-copper" strokeWidth={1.5} />
                          {d.display_name}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-300 text-xs max-w-md">{d.short_description}</td>
                      <td className="px-3 py-2 text-xs text-gray-300">{d.typical_tier_preference ?? 'n/a'}</td>
                      <td className="px-3 py-2 text-xs text-gray-300">{d.typical_genex360_tier ?? 'n/a'}</td>
                      <td className="px-3 py-2 text-right">{fmtMult(d.expected_ltv_multiplier)}</td>
                      <td className="px-3 py-2 text-right">{fmtMult(d.expected_churn_multiplier)}</td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/admin/analytics/ltv?segment_type=archetype&segment_value=${d.id}`}
                          className="text-xs text-copper hover:text-amber-300 inline-flex items-center gap-1"
                        >
                          LTV <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
