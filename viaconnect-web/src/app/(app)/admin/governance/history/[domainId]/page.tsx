'use client';

// Prompt #95 Phase 7: per-domain price history timeline.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, History } from 'lucide-react';

const supabase = createClient();

interface HistoryRow {
  id: string;
  proposal_id: string;
  change_action: string;
  applied_at: string;
  previous_value_cents: number | null;
  new_value_cents: number | null;
  previous_value_percent: number | null;
  new_value_percent: number | null;
}

interface DomainRow {
  id: string;
  display_name: string;
  target_column: string;
  default_grandfathering_policy: string | null;
}

export default function DomainHistoryPage() {
  const params = useParams<{ domainId: string }>();
  const [domain, setDomain] = useState<DomainRow | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [bindingCount, setBindingCount] = useState(0);

  const refresh = useCallback(async () => {
    const [{ data: d }, { data: h }, { count }] = await Promise.all([
      supabase
        .from('pricing_domains')
        .select('id, display_name, target_column, default_grandfathering_policy')
        .eq('id', params.domainId)
        .maybeSingle(),
      supabase
        .from('price_change_history')
        .select('id, proposal_id, change_action, applied_at, previous_value_cents, new_value_cents, previous_value_percent, new_value_percent')
        .eq('pricing_domain_id', params.domainId)
        .order('applied_at', { ascending: false })
        .limit(200),
      supabase
        .from('customer_price_bindings')
        .select('id', { count: 'exact', head: true })
        .eq('pricing_domain_id', params.domainId)
        .eq('status', 'active'),
    ]);
    setDomain(d as DomainRow | null);
    setHistory((h ?? []) as HistoryRow[]);
    setBindingCount(count ?? 0);
  }, [params.domainId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const formatValue = (cents: number | null, pct: number | null): string => {
    if (cents !== null) return `$${(cents / 100).toFixed(2)}`;
    if (pct !== null) return `${pct}%`;
    return 'n/a';
  };

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <Link
            href="/admin/governance/audit"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Audit
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-2 flex items-center gap-2">
            <History className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
            {domain?.display_name ?? params.domainId}
          </h1>
          <p className="text-xs text-white/55 mt-1">
            Target column: <code>{domain?.target_column ?? 'loading'}</code>
            {' . '}
            Default grandfathering: {domain?.default_grandfathering_policy ?? 'none'}
            {' . '}
            {bindingCount} active grandfathered customers
          </p>
        </div>

        <section className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold">Price change timeline</h2>
          {history.length === 0 ? (
            <p className="text-xs text-white/55">No changes yet.</p>
          ) : (
            <ol className="relative border-l border-white/[0.1] ml-2 space-y-4 pl-4">
              {history.map((h) => (
                <li key={h.id} className="text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${
                      h.change_action === 'activation'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-amber-500/15 text-amber-300'
                    }`}>
                      {h.change_action}
                    </span>
                    <span className="text-white/70">
                      {formatValue(h.previous_value_cents, h.previous_value_percent)}
                      {' -> '}
                      {formatValue(h.new_value_cents, h.new_value_percent)}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/55 mt-1">
                    {new Date(h.applied_at).toLocaleString()}
                    {' . '}
                    <Link href={`/admin/governance/proposals/${h.proposal_id}`} className="hover:text-[#2DA5A0]">
                      proposal
                    </Link>
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
